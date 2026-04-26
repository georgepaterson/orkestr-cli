import OpenAI from "openai";

import type { GenerateRequest, ModelProvider } from "./provider.js";
import { OrkestrCliError } from "../utils/fs.js";

export interface OpenAiAdapterOptions {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function extractOpenAiOutput(response: unknown): string {
  if (typeof response !== "object" || response === null) {
    return "";
  }

  const outputText = toString((response as { output_text?: unknown }).output_text).trim();
  if (outputText.length > 0) {
    return outputText;
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  const chunks: string[] = [];
  for (const item of output) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const block of content) {
      if (typeof block !== "object" || block === null) {
        continue;
      }

      const type = toString((block as { type?: unknown }).type);
      if (type !== "output_text" && type !== "text") {
        continue;
      }

      const text = toString((block as { text?: unknown }).text).trim();
      if (text.length > 0) {
        chunks.push(text);
      }
    }
  }

  return chunks.join("\n\n").trim();
}

export class OpenAiAdapter implements ModelProvider {
  private readonly client: OpenAI;

  constructor(options: OpenAiAdapterOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
      organization: options.organization,
    });
  }

  async generate(request: GenerateRequest): Promise<string> {
    if (request.provider !== "openai") {
      throw new OrkestrCliError(
        `OpenAI adapter cannot service provider \`${request.provider}\` requests.`,
      );
    }

    const response = await this.client.responses.create({
      model: request.model,
      input: request.prompt,
      temperature: request.temperature,
      max_output_tokens: request.maxTokens,
    });

    const text = extractOpenAiOutput(response);
    if (!text) {
      throw new OrkestrCliError(
        `OpenAI returned an empty response for model \`${request.model}\` (step: ${request.stepName ?? "unknown"}).`,
      );
    }

    return text;
  }
}
