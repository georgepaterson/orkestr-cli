export interface GenerateRequest {
  model: string;
  prompt: string;
  stepName?: string;
}

export interface ModelProvider {
  generate(request: GenerateRequest): Promise<string>;
}
