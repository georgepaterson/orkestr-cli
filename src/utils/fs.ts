import path from "node:path";
import fs from "fs-extra";
import YAML from "yaml";

import { ORKESTRA_DIR_NAME, getOrkestraDir } from "./paths.js";

export class OrkestraCliError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OrkestraCliError";
  }
}

export async function ensureOrkestraExists(repoRoot: string): Promise<void> {
  const orkestraDir = getOrkestraDir(repoRoot);
  if (!(await fs.pathExists(orkestraDir))) {
    throw new OrkestraCliError(
      `Missing ${ORKESTRA_DIR_NAME}/ in ${repoRoot}. Run \`orkestra init\` first.`,
    );
  }
}

export async function readTextFile(
  filePath: string,
  options: { optional?: boolean; defaultValue?: string } = {},
): Promise<string> {
  if (!(await fs.pathExists(filePath))) {
    if (options.optional) {
      return options.defaultValue ?? "";
    }

    throw new OrkestraCliError(`Missing file: ${filePath}`);
  }

  return fs.readFile(filePath, "utf8");
}

export async function writeTextFile(filePath: string, contents: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, "utf8");
}

export async function appendTextFile(filePath: string, contents: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, contents, "utf8");
}

export async function readYamlFile<T>(filePath: string): Promise<T> {
  const raw = await readTextFile(filePath);
  let document: YAML.Document.Parsed;

  try {
    document = YAML.parseDocument(raw);
  } catch (error) {
    throw new OrkestraCliError(`Malformed YAML in ${filePath}.`, { cause: error });
  }

  if (document.errors.length > 0) {
    throw new OrkestraCliError(`Malformed YAML in ${filePath}: ${document.errors[0]?.message}`);
  }

  return document.toJS() as T;
}

export async function writeYamlFile(filePath: string, value: unknown): Promise<void> {
  await writeTextFile(filePath, YAML.stringify(value));
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  if (!(await fs.pathExists(filePath))) {
    throw new OrkestraCliError(`Missing file: ${filePath}`);
  }

  try {
    return await fs.readJson(filePath);
  } catch (error) {
    throw new OrkestraCliError(`Malformed JSON in ${filePath}.`, { cause: error });
  }
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, value, { spaces: 2 });
}

export function formatError(error: unknown): string {
  if (error instanceof OrkestraCliError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred.";
}
