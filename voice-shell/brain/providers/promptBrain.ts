// brain/providers/promptBrain.ts

import Anthropic from "@anthropic-ai/sdk";
import { BrainProvider, ConversationContext } from "../types";
import { DEFAULT_PROMPT } from "../prompt";

export class PromptBrain implements BrainProvider {
  private anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  getSystemPrompt() {
    return DEFAULT_PROMPT;
  }

  async *chat(message: string, context: ConversationContext) {
    const systemPrompt = await this.getSystemPrompt();

    const stream = await this.anthropic.messages.stream({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...context.conversationHistory.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta") {
        const text = chunk.delta?.text;
        if (text) yield text;
      }
    }
  }
}

//usage
// const brain = new PromptBrain();

// for await (const chunk of brain.chat("Hello", context)) {
//   // stream to UI + TTS
// }