import Anthropic from "@anthropic-ai/sdk";

import type { GenerateRequest, ModelProvider } from "./provider.js";
import { OrkestrCliError } from "../utils/fs.js";

export interface AnthropicAdapterOptions {
  apiKey: string;
  baseUrl?: string;
}

function extractAnthropicText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  const blocks: string[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null) {
      continue;
    }

    const type = (block as { type?: unknown }).type;
    if (type !== "text") {
      continue;
    }

    const text = (block as { text?: unknown }).text;
    if (typeof text === "string" && text.trim().length > 0) {
      blocks.push(text.trim());
    }
  }

  return blocks.join("\n\n").trim();
}

export class AnthropicAdapter implements ModelProvider {
  private readonly client: Anthropic;

  constructor(options: AnthropicAdapterOptions) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });
  }

  async generate(request: GenerateRequest): Promise<string> {
    if (request.provider !== "anthropic") {
      throw new OrkestrCliError(
        `Anthropic adapter cannot service provider \`${request.provider}\` requests.`,
      );
    }

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature,
      messages: [
        {
          role: "user",
          content: request.prompt,
        },
      ],
    });

    const text = extractAnthropicText(response.content);
    if (!text) {
      throw new OrkestrCliError(
        `Anthropic returned an empty response for model \`${request.model}\` (step: ${request.stepName ?? "unknown"}).`,
      );
    }

    return text;
  }
}
