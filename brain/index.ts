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
    console.log("using system prompt")
    // POC: uses Anthropic + voice prompt
    return new PromptBrain();
  }
  
  if (config.type === "bedrock-kb") {
    console.log("using aws bedrock knowledge base");
    return new AwsBedrockKBProvider();
  }
  
  throw new Error(`Unsupported brain type: ${config.type}`);
}
