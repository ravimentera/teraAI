// brain/providers/awsBedrockKBProvider.ts

import { BrainProvider, ConversationContext } from "../types";
import { VOICE_PROMPT } from "../prompt";
import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";

/**
 * AWSBedrockKBProvider
 * 
 * Uses the AWS Bedrock Knowledge Base (RetrieveAndGenerateCommand).
 */
export class AwsBedrockKBProvider implements BrainProvider {
  private bedrockAgentRuntimeClient: BedrockAgentRuntimeClient;
  private knowledgeBaseId = process.env.AWS_KNOWLEDGE_BASE_ID!;
  private modelArn = process.env.AWS_BEDROCK_MODEL_ARN || "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0";

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
    // but we return the voice prompt base for agent personality rules
    return VOICE_PROMPT;
  }

  async *chat(userInput: string, context: ConversationContext): AsyncGenerator<string> {
    if (!this.knowledgeBaseId) {
      console.warn("[AwsBedrockKBProvider] AWS KNOWLEDGE_BASE_ID not found. Using fallback message.");
      yield "I'm sorry, my knowledge base is not configured correctly. Please check the AWS credentials.";
      return;
    }

    const sessionId = context.roomId; // Maintain context through the LiveKit roomId
    
    const command = new RetrieveAndGenerateCommand({
      input: {
        text: userInput,
      },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: this.knowledgeBaseId,
          modelArn: this.modelArn,
        },
      },
      sessionId: sessionId,
    });
    
    try {
      const response = await this.bedrockAgentRuntimeClient.send(command);
      const outputText = response.output?.text || "I'm sorry, I couldn't find an answer.";
      
      // Simulate real-time streaming chunks to prevent timeout issues and mimic LLM behavior
      const chunks = outputText.split(" ");
      for (const chunk of chunks) {
        yield chunk + " ";
      }
    } catch (error) {
      console.error("[AwsBedrockKBProvider] Error querying knowledge base:", error);
      yield "I encountered an error while searching my knowledge base. Please try again.";
    }
  }
}
