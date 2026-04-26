import type { OrkestrConfig } from "../core/config.js";
import { OrkestrCliError } from "../utils/fs.js";
import { AnthropicAdapter } from "./anthropic-adapter.js";
import { MockProvider } from "./mock-provider.js";
import { OpenAiAdapter } from "./openai-adapter.js";
import type { GenerateRequest, ModelProvider, ProviderName } from "./provider.js";

class MissingCredentialProvider implements ModelProvider {
  private readonly providerName: ProviderName;
  private readonly envVarName: string;

  constructor(providerName: ProviderName, envVarName: string) {
    this.providerName = providerName;
    this.envVarName = envVarName;
  }

  async generate(request: GenerateRequest): Promise<string> {
    void request;
    throw new OrkestrCliError(
      `Missing API key for provider \`${this.providerName}\`. Set \`${this.envVarName}\` in your shell or .env file.`,
    );
  }
}

class RoutedProvider implements ModelProvider {
  private readonly providers: Record<ProviderName, ModelProvider>;

  constructor(providers: Record<ProviderName, ModelProvider>) {
    this.providers = providers;
  }

  async generate(request: GenerateRequest): Promise<string> {
    const provider = this.providers[request.provider];
    if (!provider) {
      throw new OrkestrCliError(`Provider \`${request.provider}\` is not configured.`);
    }

    return provider.generate(request);
  }
}

function readApiKey(envVarName: string): string | undefined {
  const raw = process.env[envVarName];
  if (typeof raw !== "string") {
    return undefined;
  }

  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function createProvider(config: OrkestrConfig): ModelProvider {
  const openAiEnv = config.providers.openai.apiKeyEnv;
  const anthropicEnv = config.providers.anthropic.apiKeyEnv;
  const openAiKey = readApiKey(openAiEnv);
  const anthropicKey = readApiKey(anthropicEnv);

  return new RoutedProvider({
    mock: new MockProvider(),
    openai: openAiKey
      ? new OpenAiAdapter({
          apiKey: openAiKey,
          baseUrl: config.providers.openai.baseUrl,
          organization: config.providers.openai.organization,
        })
      : new MissingCredentialProvider("openai", openAiEnv),
    anthropic: anthropicKey
      ? new AnthropicAdapter({
          apiKey: anthropicKey,
          baseUrl: config.providers.anthropic.baseUrl,
        })
      : new MissingCredentialProvider("anthropic", anthropicEnv),
  });
}
