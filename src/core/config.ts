import fs from "fs-extra";

import { OrkestrCliError, ensureOrkestrExists, readYamlFile } from "../utils/fs.js";
import { getConfigPath } from "../utils/paths.js";

export interface OrkestrConfig {
  project: {
    name: string;
  };
  models: Record<string, string>;
  context: {
    include: string[];
    exclude: string[];
  };
}

function assertStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new OrkestrCliError(`Invalid config field \`${fieldName}\`. Expected a list of strings.`);
  }

  return value;
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

  const models = (config as Record<string, unknown>).models;
  if (typeof models !== "object" || models === null) {
    throw new OrkestrCliError("Invalid config field `models`. Expected a map of model aliases.");
  }

  const modelEntries = Object.entries(models as Record<string, unknown>);
  if (modelEntries.length === 0 || modelEntries.some(([, value]) => typeof value !== "string")) {
    throw new OrkestrCliError("Invalid config field `models`. Expected key/value string pairs.");
  }

  const context = (config as Record<string, unknown>).context;
  if (typeof context !== "object" || context === null) {
    throw new OrkestrCliError("Invalid config field `context`. Expected include/exclude lists.");
  }

  return {
    project: {
      name: (project as { name: string }).name,
    },
    models: modelEntries.reduce<Record<string, string>>((accumulator, [key, value]) => {
      accumulator[key] = value as string;
      return accumulator;
    }, {}),
    context: {
      include: assertStringArray((context as { include?: unknown }).include, "context.include"),
      exclude: assertStringArray((context as { exclude?: unknown }).exclude, "context.exclude"),
    },
  };
}
