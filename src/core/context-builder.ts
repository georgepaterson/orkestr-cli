import path from "node:path";
import fs from "fs-extra";

import type { OrkestrConfig } from "./config.js";
import { readTextFile } from "../utils/fs.js";
import { getMemoryDir, toPosixPath } from "../utils/paths.js";

export interface TaskRecord {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  description: string;
}

export interface ContextFileEntry {
  path: string;
  content: string;
}

export interface ContextPack {
  id: string;
  taskId: string;
  createdAt: string;
  task: TaskRecord;
  memory: {
    decisions: string;
    handovers: string;
    patterns: string;
  };
  fileList: string[];
  files: ContextFileEntry[];
}

export interface BuildContextPackInput {
  repoRoot: string;
  task: TaskRecord;
  config: OrkestrConfig;
  contextId: string;
  createdAt: string;
}

const SKIP_DIRECTORY_NAMES = new Set([".git", "node_modules", "dist"]);

function compileGlobPattern(pattern: string): RegExp {
  const normalized = toPosixPath(pattern).replace(/^\.\//, "");
  const parts = normalized.split(/(\*\*|\*)/g);
  const regexBody = parts
    .map((part) => {
      if (part === "**") {
        return "__DOUBLE_STAR__";
      }

      if (part === "*") {
        return "__SINGLE_STAR__";
      }

      return part.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("")
    .replace(/__DOUBLE_STAR__/g, ".*")
    .replace(/__SINGLE_STAR__/g, "[^/]*");

  return new RegExp(`^${regexBody}$`);
}

function matchesAny(relPath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(relPath));
}

async function collectRepoFiles(repoRoot: string, relativeDir = ""): Promise<string[]> {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (SKIP_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }

      files.push(...(await collectRepoFiles(repoRoot, relativePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(toPosixPath(relativePath));
    }
  }

  return files;
}

async function readMemory(repoRoot: string): Promise<ContextPack["memory"]> {
  const memoryDir = getMemoryDir(repoRoot);

  return {
    decisions: await readTextFile(path.join(memoryDir, "decisions.md"), {
      optional: true,
      defaultValue: "",
    }),
    handovers: await readTextFile(path.join(memoryDir, "handovers.md"), {
      optional: true,
      defaultValue: "",
    }),
    patterns: await readTextFile(path.join(memoryDir, "patterns.md"), {
      optional: true,
      defaultValue: "",
    }),
  };
}

export async function buildContextPack(input: BuildContextPackInput): Promise<ContextPack> {
  const allFiles = await collectRepoFiles(input.repoRoot);
  const includeMatchers = input.config.context.include.map(compileGlobPattern);
  const excludeMatchers = input.config.context.exclude.map(compileGlobPattern);

  const selectedFiles = allFiles
    .filter(
      (filePath) => matchesAny(filePath, includeMatchers) && !matchesAny(filePath, excludeMatchers),
    )
    .sort();

  const fileEntries: ContextFileEntry[] = [];
  for (const filePath of selectedFiles) {
    const absolutePath = path.join(input.repoRoot, filePath);
    const content = await readTextFile(absolutePath, { optional: true, defaultValue: "" });
    fileEntries.push({ path: filePath, content });
  }

  return {
    id: input.contextId,
    taskId: input.task.id,
    createdAt: input.createdAt,
    task: input.task,
    memory: await readMemory(input.repoRoot),
    fileList: selectedFiles,
    files: fileEntries,
  };
}
