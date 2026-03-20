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

// ─────────────────────────────────────────────────────────────────────────────
// Custom Anthropic LLM — correctly uses this.queue (NOT this.output)
// The SDK's monitorMetrics() internally bridges: queue → output → consumer
// Calling output.close() directly would bypass metrics and hang the session.
// ─────────────────────────────────────────────────────────────────────────────
class AnthropicLLMStream extends llm.LLMStream {
  constructor(llm: llm.LLM, chatCtx: llm.ChatContext, connOptions: any, private onToken?: (t: string) => void) {
    super(llm, { chatCtx, connOptions });
  }

  async run() {
    try {
      const chatCtx = this.chatCtx;
      if (!chatCtx || !chatCtx.items) return;

      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (const item of chatCtx.items) {
        if (!(item instanceof llm.ChatMessage)) continue;
        const role = item.role as string;
        const text = item.textContent || '';
        if (!text.trim()) continue;
        if (role === 'user' || role === 'assistant') {
          messages.push({ role: role as 'user' | 'assistant', content: text });
        }
      }

      if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
        messages.push({ role: 'user', content: 'Hello' });
      }

      const lastUserMsg = messages[messages.length - 1]?.content || 'Hello';

      for await (const chunk of brain.chat(lastUserMsg, { conversationHistory: messages.slice(0, -1) })) {
        if (!chunk || !chunk.trim()) continue;
        console.log("[Agent] Chunk:", chunk);

        // Notify callback (for direct publish)
        this.onToken?.(chunk);
        (this as any).queue.put({
          id: crypto.randomUUID(),
          delta: { content: chunk, role: 'assistant' }
        });
      }
    } catch (err) {
      console.error("[AnthropicLLM Error]", err);
    } finally {
      (this as any).queue.close();
    }
  }
}

class AnthropicLLM extends llm.LLM {
  constructor(private onToken?: (t: string) => void) {
    super();
  }

  label(): string { return 'anthropic_llm'; }

  chat({ chatCtx, connOptions }: { chatCtx: llm.ChatContext, connOptions: any }): llm.LLMStream {
    return new AnthropicLLMStream(this, chatCtx, connOptions ?? {}, this.onToken);
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
      voice: "e4d5f4c4-6601-4779-bee1-b3c14d629dc6" 
    });
    const stt = new deepgram.STT({ 
      apiKey: process.env.DEEPGRAM_API_KEY!
    });

    // Create LLM with direct feedback to the room via data channel
    const llm_engine = new AnthropicLLM((token) => {
      ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify({ text: token, final: false })),
        { topic: 'agent-transcript' }
      ).catch(() => { });
    });

    const vad = vadModel;

    const agent = new voice.Agent({
      instructions: systemPrompt,
      llm: llm_engine,
      tts,
      stt,
      vad,
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
      await session.start({
        agent,
        room: ctx.room,
        outputOptions: { transcriptionEnabled: true }
      });
      console.log('[Agent] Session started → listening');
    } catch (err) {
      console.error('[Agent] Failed to start session:', err);
      return;
    }

    // Initial greeting
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      session.say("Hello! I'm Tera, your dental scheduling assistant. How can I help you today?");
      console.log('[Agent] Greeting sent.');
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
    agentName: "tera-dental-agent",
  }));
});
