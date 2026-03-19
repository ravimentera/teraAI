// brain/providers/promptBrain.ts

import Anthropic from "@anthropic-ai/sdk";
import { BrainProvider, ConversationContext } from "../types";
import { VOICE_PROMPT } from "../prompt";

export class PromptBrain implements BrainProvider {
  private anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  getSystemPrompt() {
    return VOICE_PROMPT;
  }

  async *chat(message: string, context: ConversationContext) {
    const systemPrompt = await this.getSystemPrompt();

    const stream = await this.anthropic.messages.stream({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...context.conversationHistory.map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ],
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        yield chunk.delta.text;
      }
    }
  }
}

//usage
// const brain = new PromptBrain();

// for await (const chunk of brain.chat("Hello", context)) {
//   // stream to UI + TTS
// }