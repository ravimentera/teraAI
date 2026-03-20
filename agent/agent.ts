import {
  cli,
  defineAgent,
  llm,
  voice,
  WorkerOptions,
} from '@livekit/agents';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import * as silero from '@livekit/agents-plugin-silero';
import dotenv from 'dotenv';
import path from 'path';
import { createBrainProvider } from '../brain';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Explicitly set LIVEKIT_URL for the CLI/Worker
if (process.env.NEXT_PUBLIC_LIVEKIT_URL) {
  process.env.LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;
}

console.log('[Agent] Mode: CommonJS / Refactored');
console.log('[Agent] Target URL:', process.env.LIVEKIT_URL);

// Globals to be pre-loaded
const brain = createBrainProvider('tera-dental');
let systemPrompt = "";
let vadModel: any = null;

// Pre-load logic to avoid job-entry timeouts
async function preload() {
    try {
        console.log('[Agent] Pre-loading system prompt...');
        systemPrompt = await brain.getSystemPrompt();
        console.log('[Agent] System prompt length:', systemPrompt.length);
        console.log('[Agent] Pre-loading Silero VAD...');
        vadModel = await silero.VAD.load();
        console.log('[Agent] VAD Model Loaded');
        console.log('[Agent] Pre-load complete.');
    } catch (err) {
        console.error('[Agent] Pre-load failed:', err);
    }
}

class AnthropicLLMStream extends llm.LLMStream {
  constructor(llm: llm.LLM, chatCtx: llm.ChatContext, connOptions: any) {
    super(llm, { chatCtx, connOptions });
  }

  async run() {
    try {
      const chatCtx = this.chatCtx;
      const lastItem = chatCtx.items[chatCtx.items.length - 1];
      const textMsg = (lastItem instanceof llm.ChatMessage) ? lastItem.textContent || "Hello" : "Hello";
      
      const context = {
        conversationHistory: chatCtx.items.slice(0, -1).map((m: any) => ({
          role: (m.role || 'user') as "user" | "assistant" | "system",
          content: m.textContent || ""
        })),
      };

      for await (const chunk of brain.chat(textMsg, context)) {
        if (chunk) {
          (this as any).output.push({
            id: crypto.randomUUID(),
            delta: {
              content: chunk,
              role: 'assistant'
            }
          });
        }
      }
    } catch (err) {
      console.error("[AnthropicLLM Error]", err);
    }
  }
}

class AnthropicLLM extends llm.LLM {
  label(): string {
    return 'anthropic_llm';
  }

  chat({ chatCtx, connOptions }: { chatCtx: llm.ChatContext, connOptions: any }): llm.LLMStream {
    return new AnthropicLLMStream(this, chatCtx, connOptions);
  }
}

const agentDef = defineAgent({
  entry: async (ctx) => {
    console.log('[Job] Starting entry (Job ID):', ctx.job.id);
    
    if (!systemPrompt || !vadModel) {
        console.log('[Agent] Resources not ready, waiting...');
        await preload();
    }

    try {
      console.log('[Agent] Connecting to room...');
      await ctx.connect();
      console.log('[Agent] Connected to room:', ctx.room.name);
    } catch (err) {
      console.error('[Agent] Failed to connect:', err);
      return;
    }

    const tts = new cartesia.TTS({ 
      apiKey: process.env.CARTESIA_API_KEY!,
      voice: "694f9ed8-eaee-4f51-a9f4-539420042cd0" 
    });
    const stt = new deepgram.STT({ 
      apiKey: process.env.DEEPGRAM_API_KEY!
    });
    const llm_engine = new AnthropicLLM();
    const vad = vadModel;

    const chatCtx = new llm.ChatContext();
    chatCtx.addMessage({
      role: 'system',
      content: systemPrompt,
    });

    const agent = new voice.Agent({
      instructions: systemPrompt,
      llm: llm_engine,
      tts,
      stt,
      vad,
      chatCtx,
    });

    const session = new voice.AgentSession({
        stt,
        tts,
        llm: llm_engine,
        vad,
    });

    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev: any) => console.log('[Agent] State:', ev.state));
    session.on(voice.AgentSessionEventTypes.Error, (ev: any) => console.error('[Agent] Error:', ev.error));

    console.log('[Agent] Starting session...');
    try {
      await session.start({ agent, room: ctx.room });
      console.log('[Agent] Session started');
    } catch (err) {
      console.error('[Agent] Failed to start session:', err);
      return;
    }

    // Initial greeting
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      session.say("Hello. I'm Tera. How can I help you today?");
    } catch (err) {
      console.error('[Agent] Greeting failed:', err);
    }
  },
});

export default agentDef;

preload().then(() => {
    cli.runApp(new WorkerOptions({ 
      agent: path.resolve(__filename),
      wsURL: process.env.LIVEKIT_URL || "wss://shell-poc-45149qll.livekit.cloud",
    }));
});
