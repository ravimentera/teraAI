// brain/providers/promptBrain.ts

import Anthropic from "@anthropic-ai/sdk";
import { BrainProvider, ConversationContext } from "../types";
import { VOICE_PROMPT } from "../prompt";

export class PromptBrain implements BrainProvider {
  private anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
  });

  async getSystemPrompt(): Promise<string> {
    return VOICE_PROMPT;
  }

  async *chat(userInput: string, context: ConversationContext): AsyncGenerator<string> {
    const messages: any[] = [
      ...context.conversationHistory.filter(m => m.role !== 'system'),
      { role: "user", content: userInput }
    ];

    const stream = await this.anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: VOICE_PROMPT,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}