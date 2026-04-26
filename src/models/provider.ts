export type ProviderName = "mock" | "openai" | "anthropic";

export interface GenerateRequest {
  provider: ProviderName;
  model: string;
  prompt: string;
  stepName?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelProvider {
  generate(request: GenerateRequest): Promise<string>;
}
