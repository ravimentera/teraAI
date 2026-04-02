// brain/index.ts
import { BrainProvider, BRAIN_REGISTRY, BrainConfig, SessionContext } from "./types";
import { PromptBrain } from "./providers/promptBrain";

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
  
  throw new Error(`Unsupported brain type: ${config.type}`);
}
