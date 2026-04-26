import fs from "fs-extra";

import type { ProviderName } from "../models/provider.js";
import { OrkestrCliError, ensureOrkestrExists, readYamlFile } from "../utils/fs.js";
import { getConfigPath } from "../utils/paths.js";

export interface ProviderConfig {
  apiKeyEnv: string;
  baseUrl?: string;
  organization?: string;
}

export interface ModelConfig {
  provider: ProviderName;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OrkestrConfig {
  project: {
    name: string;
  };
  providers: {
    openai: ProviderConfig;
    anthropic: ProviderConfig;
  };
  models: Record<string, ModelConfig>;
  context: {
    include: string[];
    exclude: string[];
  };
}

const DEFAULT_OPENAI_ENV = "OPENAI_API_KEY";
const DEFAULT_ANTHROPIC_ENV = "ANTHROPIC_API_KEY";
const SUPPORTED_PROVIDERS: ProviderName[] = ["mock", "openai", "anthropic"];

function assertStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new OrkestrCliError(`Invalid config field \`${fieldName}\`. Expected a list of strings.`);
  }

  return value;
}

function parseString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OrkestrCliError(
      `Invalid config field \`${fieldName}\`. Expected a non-empty string.`,
    );
  }

  return value.trim();
}

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseString(value, fieldName);
}

function parseOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new OrkestrCliError(`Invalid config field \`${fieldName}\`. Expected a number.`);
  }

  return value;
}

function parseProviderName(value: unknown, fieldName: string): ProviderName {
  if (typeof value !== "string" || !SUPPORTED_PROVIDERS.includes(value as ProviderName)) {
    throw new OrkestrCliError(
      `Invalid config field \`${fieldName}\`. Expected one of: ${SUPPORTED_PROVIDERS.join(", ")}.`,
    );
  }

  return value as ProviderName;
}

function parseProviderConfig(
  value: unknown,
  fieldName: string,
  fallbackApiKeyEnv: string,
): ProviderConfig {
  if (value === undefined) {
    return { apiKeyEnv: fallbackApiKeyEnv };
  }

  if (typeof value !== "object" || value === null) {
    throw new OrkestrCliError(`Invalid config field \`${fieldName}\`. Expected a mapping.`);
  }

  const typed = value as { apiKeyEnv?: unknown; baseUrl?: unknown; organization?: unknown };
  const apiKeyEnv =
    typed.apiKeyEnv === undefined
      ? fallbackApiKeyEnv
      : parseString(typed.apiKeyEnv, `${fieldName}.apiKeyEnv`);

  return {
    apiKeyEnv,
    baseUrl: parseOptionalString(typed.baseUrl, `${fieldName}.baseUrl`),
    organization: parseOptionalString(typed.organization, `${fieldName}.organization`),
  };
}

function parseLegacyModel(value: string): ModelConfig {
  const [prefix, ...remainder] = value.split(":");
  if (remainder.length > 0 && SUPPORTED_PROVIDERS.includes(prefix as ProviderName)) {
    return {
      provider: prefix as ProviderName,
      model: remainder.join(":") || "default",
    };
  }

  return {
    provider: "mock",
    model: value,
  };
}

function parseModelConfig(value: unknown, alias: string): ModelConfig {
  if (typeof value === "string") {
    return parseLegacyModel(value);
  }

  if (typeof value !== "object" || value === null) {
    throw new OrkestrCliError(
      `Invalid config field \`models.${alias}\`. Expected a model mapping or legacy string.`,
    );
  }

  const typed = value as {
    provider?: unknown;
    model?: unknown;
    temperature?: unknown;
    maxTokens?: unknown;
  };

  const maxTokens = parseOptionalNumber(typed.maxTokens, `models.${alias}.maxTokens`);
  if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens <= 0)) {
    throw new OrkestrCliError(
      `Invalid config field \`models.${alias}.maxTokens\`. Expected a positive integer.`,
    );
  }

  return {
    provider: parseProviderName(typed.provider, `models.${alias}.provider`),
    model: parseString(typed.model, `models.${alias}.model`),
    temperature: parseOptionalNumber(typed.temperature, `models.${alias}.temperature`),
    maxTokens,
  };
}

export async function loadConfig(repoRoot: string): Promise<OrkestrConfig> {
  await ensureOrkestrExists(repoRoot);

  const configPath = getConfigPath(repoRoot);
  if (!(await fs.pathExists(configPath))) {
    throw new OrkestrCliError(`Missing config file at ${configPath}. Run \`orkestr init\` first.`);
  }

  const config = await readYamlFile<unknown>(configPath);
  if (typeof config !== "object" || config === null) {
    throw new OrkestrCliError("Invalid config. Expected a YAML object in .orkestr/config.yml.");
  }

  const project = (config as Record<string, unknown>).project;
  if (
    typeof project !== "object" ||
    project === null ||
    typeof (project as { name?: unknown }).name !== "string"
  ) {
    throw new OrkestrCliError("Invalid config field `project.name`. Expected a string.");
  }

  const providers = (config as Record<string, unknown>).providers;
  if (providers !== undefined && (typeof providers !== "object" || providers === null)) {
    throw new OrkestrCliError(
      "Invalid config field `providers`. Expected openai/anthropic mappings.",
    );
  }

  const providerMappings = providers as
    | {
        openai?: unknown;
        anthropic?: unknown;
      }
    | undefined;

  const models = (config as Record<string, unknown>).models;
  if (typeof models !== "object" || models === null) {
    throw new OrkestrCliError("Invalid config field `models`. Expected a map of model aliases.");
  }

  const modelEntries = Object.entries(models as Record<string, unknown>);
  if (modelEntries.length === 0) {
    throw new OrkestrCliError("Invalid config field `models`. Expected at least one model alias.");
  }

  const context = (config as Record<string, unknown>).context;
  if (typeof context !== "object" || context === null) {
    throw new OrkestrCliError("Invalid config field `context`. Expected include/exclude lists.");
  }

  return {
    project: {
      name: (project as { name: string }).name,
    },
    providers: {
      openai: parseProviderConfig(providerMappings?.openai, "providers.openai", DEFAULT_OPENAI_ENV),
      anthropic: parseProviderConfig(
        providerMappings?.anthropic,
        "providers.anthropic",
        DEFAULT_ANTHROPIC_ENV,
      ),
    },
    models: modelEntries.reduce<Record<string, ModelConfig>>((accumulator, [key, value]) => {
      accumulator[key] = parseModelConfig(value, key);
      return accumulator;
    }, {}),
    context: {
      include: assertStringArray((context as { include?: unknown }).include, "context.include"),
      exclude: assertStringArray((context as { exclude?: unknown }).exclude, "context.exclude"),
    },
  };
}
