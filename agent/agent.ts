// @ts-nocheck
import {
  cli,
  defineAgent,
  llm,
  pipeline,
  WorkerOptions,
} from '@livekit/agents';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import * as silero from '@livekit/agents-plugin-silero';
import dotenv from 'dotenv';
import path from 'path';
import { createBrainProvider } from '../brain';

// Load env vars
dotenv.config({ path: path.join(import.meta.dirname, '../.env.local') });

// Explicitly set LIVEKIT_URL for the CLI/Worker
if (process.env.NEXT_PUBLIC_LIVEKIT_URL) {
  process.env.LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;
}

console.log('[Agent] Mode: CommonJS / Pre-load');
console.log('[Agent] Target URL:', process.env.LIVEKIT_URL);

// Globals to be pre-loaded
const brain = createBrainProvider('tera-dental');
let systemPrompt = "";
let vad: any = null;

// Pre-load logic to avoid job-entry timeouts
async function preload() {
    try {
        console.log('[Agent] Pre-loading system prompt...');
        systemPrompt = await brain.getSystemPrompt();
        console.log('[Agent] System prompt length:', systemPrompt.length);
        console.log('[Agent] Pre-loading Silero VAD...');
        vad = await silero.VAD.load();
        console.log('[Agent] VAD Model Loaded');
        console.log('[Agent] Pre-load complete.');
    } catch (err) {
        console.error('[Agent] Pre-load failed:', err);
    }
}

const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicKey) {
  console.error("❌ ANTHROPIC_API_KEY is missing from .env.local!");
}

class AnthropicLLM extends llm.LLM {
  label = 'anthropic_llm';

  chat({ chatCtx }: { chatCtx: llm.ChatContext }): llm.LLMStream {
    console.log('[AnthropicLLM] Chat requested. Msg count:', chatCtx.messages.length);
    const stream = new llm.LLMStream(this, chatCtx);
    
    (async () => {
      try {
        const lastMsg = chatCtx.messages[chatCtx.messages.length - 1];
        const textMsg = typeof lastMsg.content === 'string' ? lastMsg.content : "Hello";
        console.log('[AnthropicLLM] User said:', textMsg);
        
        const context = {
          conversationHistory: chatCtx.messages.slice(0, -1).map(m => ({
            role: m.role as "user" | "assistant",
            content: typeof m.content === 'string' ? m.content : ""
          })),
        };

        let firstChunk = true;
        for await (const chunk of brain.chat(textMsg, context)) {
          if (chunk) {
            console.log('[AnthropicLLM] Chunk:', chunk);
            stream.push({
              choices: [{
                delta: {
                  content: chunk,
                  role: firstChunk ? 'assistant' : undefined
                }
              }]
            });
            firstChunk = false;
          }
        }
        console.log('[AnthropicLLM] Stream complete');
        stream.push(null);
      } catch (err) {
        console.error("[AnthropicLLM Error]", err);
        stream.push(null);
      }
    })();

    return stream;
  }
}

const agentDef = defineAgent({
  entry: async (ctx) => {
    console.log('[Job] Starting entry (Job ID):', ctx.job.id);
    
    // Ensure pre-loaded resources are ready
    if (!systemPrompt || !vad) {
        console.log('[Agent] Resources not ready, waiting...');
        await preload();
    }

    // Connect to room
    try {
      console.log('[Agent] Connecting to room as agent...');
      await ctx.connect();
      console.log('[Agent] Connected to room:', ctx.room.name);
      console.log('[Agent] Local Participant Identity:', ctx.room.localParticipant.identity);
    } catch (err) {
      console.error('[Agent] Failed to connect to room:', err);
      return;
    }

    // Initialize plugins inside entry to ensure logger is ready
    const tts = new cartesia.TTS({ 
      apiKey: process.env.CARTESIA_API_KEY,
      voice: "694f9ed8-eaee-4f51-a9f4-539420042cd0" 
    });
    const stt = new deepgram.STT({ 
      apiKey: process.env.DEEPGRAM_API_KEY 
    });
    const llm_engine = new AnthropicLLM();

    // Provide the Brain Prompt
    console.log('[Agent] Creating ChatContext...');
    const chatCtx = new llm.ChatContext().append({
      role: 'system',
      text: systemPrompt,
    });

    console.log('[Agent] Creating VoicePipelineAgent...');
    const agent = new pipeline.VoicePipelineAgent(
      llm_engine,
      tts,
      stt,
      { 
        chatCtx,
        vad,
      }
    );

    // Diagnostic event listeners
    agent.on('userStartedSpeaking', () => console.log('[Agent] User started speaking'));
    agent.on('userStoppedSpeaking', () => console.log('[Agent] User stopped speaking'));
    agent.on('agentStartedSpeaking', () => console.log('[Agent] Agent started speaking'));
    agent.on('agentStoppedSpeaking', () => console.log('[Agent] Agent stopped speaking'));

    // Start listening
    console.log('[Agent] Starting pipeline...');
    try {
      agent.start(ctx.room);
      console.log('[Agent] Pipeline started successfully');
    } catch (err) {
      console.error('[Agent] Failed to start pipeline:', err);
    }

    // Initial greeting
    console.log('[Agent] Waiting for session stabilize (2s)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('[Agent] Sending initial greeting...');
    try {
      await agent.say("Hello. I'm Tera. How can I help you today?", true);
      console.log('[Agent] Greeting sent successfully');
    } catch (err) {
      console.error('[Agent] Failed to say greeting:', err);
    }
  },
});

// Start pre-loading immediately
preload().then(() => {
    cli.runApp(new WorkerOptions({ 
      agent: agentDef,
      wsUrl: "wss://shell-poc-45149qll.livekit.cloud",
    }));
});
