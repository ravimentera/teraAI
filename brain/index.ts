// brain/index.ts
import { BrainProvider, BRAIN_REGISTRY, BrainConfig, SessionContext } from "./types";
import { PromptBrain } from "./providers/promptBrain";
import { AwsBedrockKBProvider } from "./providers/awsBedrockKBProvider";

export * from "./types";

export function getBrainConfig(configKey: string): BrainConfig {
  const config = BRAIN_REGISTRY[configKey];
  if (!config) {
    throw new Error(`Brain config not found for key: ${configKey}`);
  }
  return config;
}

export function createBrainProvider(configKey: string): BrainProvider {
  const config = getBrainConfig(configKey);
  
  if (config.type === "prompt-brain") {
    // POC: uses Anthropic + voice prompt
    return new PromptBrain();
  }
  
  if (config.type === "bedrock-kb") {
    // NEW: AWS Bedrock Knowledge Base Provider
    return new AwsBedrockKBProvider();
  }
  
  throw new Error(`Unsupported brain type: ${config.type}`);
}
