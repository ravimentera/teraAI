// brain/types.ts

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ConversationContext {
  conversationHistory: Message[];
}

export interface BrainProvider {
  // main function → input text → streaming response
  chat(
    message: string,
    context: ConversationContext
  ): AsyncIterable<string>;

  // static or dynamic system prompt
  getSystemPrompt(): Promise<string> | string;
}