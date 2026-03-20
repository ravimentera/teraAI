// brain/types.ts

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ConversationContext {
  conversationHistory: Message[];
  roomId?: string;
  practiceId?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionContext {
  roomId: string;
  practiceId: string;
  providerId?: string;
  activePatientId?: string;
  deviceLocation?: string;
  conversationHistory: Message[];
  metadata: Record<string, unknown>;
}

export interface BrainProvider {
  // Core: send user message, get streaming response
  chat(
    message: string,
    context: ConversationContext
  ): AsyncIterable<string>;

  // Static or dynamic system prompt
  getSystemPrompt(context?: SessionContext): Promise<string> | string;

  // Optional: pre-load context when session starts
  onSessionStart?(session: SessionContext): Promise<void>;

  // Optional: cleanup when session ends
  onSessionEnd?(session: SessionContext): Promise<void>;
}

export interface BrainConfig {
  type: "prompt-brain" | "bedrock-kb" | "tera-agent";
  name: string;
  description: string;
}

export const BRAIN_REGISTRY: Record<string, BrainConfig> = {
  "tera-dental": {
    type: "prompt-brain",
    name: "Tera Dental (POC)",
    description: "Claude-powered Tera assistant using prompt.ts brain",
  },
};