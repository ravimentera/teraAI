// brain/providers/awsBedrockKBProvider.ts

import { BrainProvider, ConversationContext } from "../types";
import { VOICE_PROMPT } from "../prompt";
import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";

/**
 * AWSBedrockKBProvider
 * 
 * Replace placeholders like YOUR_KNOWLEDGE_BASE_ID with actual AWS info when you get credentials.
 */
export class AwsBedrockKBProvider implements BrainProvider {
  private bedrockAgentRuntimeClient: BedrockAgentRuntimeClient;
  private knowledgeBaseId = process.env.AWS_KNOWLEDGE_BASE_ID!;

  constructor() {
    this.bedrockAgentRuntimeClient = new BedrockAgentRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    });
  }

  async getSystemPrompt(): Promise<string> {
    // When using a knowledge base, the model relies on the retrieved context,
    // but you can still use a base system prompt for character/tone.
    return VOICE_PROMPT;
  }

  async *chat(userInput: string, context: ConversationContext): AsyncGenerator<string> {
    // ------------------------------------------------------------------------
    // MOCK RESPONSE (Fallback until AWS Credentials are set up)
    // ------------------------------------------------------------------------
    if (!process.env.AWS_KNOWLEDGE_BASE_ID) {
      console.warn("[AwsBedrockKBProvider] AWS credentials / Knowledge Base ID not found. Using mock response.");
      const mockResponse = "This is a dummy response from the AWS Bedrock Knowledge Base provider. Please set your AWS credentials to use the real integration.";

      // Simulate streaming
      const chunks = mockResponse.split(" ");
      for (const chunk of chunks) {
        // await new Promise(r => setTimeout(r, 50)); 
        yield chunk + " ";
      }
      return;
    }

    // ------------------------------------------------------------------------
    // REAL AWS IMPLEMENTATION
    // ------------------------------------------------------------------------
    const sessionId = context.roomId; // Use roomId or practiceId as sessionId to maintain conversation context
    
    const command = new RetrieveAndGenerateCommand({
      input: {
        text: userInput,
      },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: this.knowledgeBaseId,
          modelArn: "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0", // Replace with desired model ARN
        },
      },
      sessionId: sessionId,
    });
    
    try {
      const response = await this.bedrockAgentRuntimeClient.send(command);
      const outputText = response.output?.text || "I'm sorry, I couldn't find an answer.";
      
      // To simulate a stream to the existing agent structure:
      const chunks = outputText.split(" ");
      for (const chunk of chunks) {
        yield chunk + " ";
      }
    } catch (error) {
      console.error("[AwsBedrockKBProvider] Error querying knowledge base:", error);
      yield "I encountered an error while searching my knowledge base.";
    }
  }
}
