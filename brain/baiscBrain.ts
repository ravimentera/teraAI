// import OpenAI from "openai";

// export class BasicBrain {
//   private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//   async *chat(message: string, context: SessionContext) {
//     const stream = await this.openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       stream: true,
//       messages: [
//         {
//           role: "system",
//           content: "You are a helpful voice assistant with human-like tone."
//         },
//         ...context.conversationHistory,
//         { role: "user", content: message }
//       ],
//     });

//     for await (const chunk of stream) {
//       yield chunk.choices[0]?.delta?.content || "";
//     }
//   }
// }