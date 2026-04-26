import fs from "fs-extra";
import chalk from "chalk";

import type { TaskRecord } from "../core/context-builder.js";
import { OrkestrCliError, ensureOrkestrExists, readYamlFile, writeTextFile } from "../utils/fs.js";
import { createEntityId, getTaskCandidates, getTasksDir } from "../utils/paths.js";

function formatDescriptionBlock(description: string): string {
  const lines = description.split(/\r?\n/);
  if (lines.length === 0) {
    return "  ";
  }

  return lines.map((line) => `  ${line}`).join("\n");
}

function validateTask(task: unknown, source: string): TaskRecord {
  if (typeof task !== "object" || task === null) {
    throw new OrkestrCliError(`Malformed task file at ${source}.`);
  }

  const typed = task as Partial<TaskRecord>;
  if (
    typeof typed.id !== "string" ||
    typeof typed.title !== "string" ||
    typeof typed.status !== "string" ||
    typeof typed.createdAt !== "string" ||
    typeof typed.description !== "string"
  ) {
    throw new OrkestrCliError(
      `Malformed task file at ${source}. Expected id, title, status, createdAt, and description fields.`,
    );
  }

  return typed as TaskRecord;
}

export async function createTaskCommand(
  title: string,
  description: string,
  repoRoot: string = process.cwd(),
): Promise<TaskRecord> {
  await ensureOrkestrExists(repoRoot);

  const id = createEntityId("task");
  const createdAt = new Date().toISOString();
  const taskFilePath = `${getTasksDir(repoRoot)}/${id}.yml`;

  await fs.ensureDir(getTasksDir(repoRoot));
  await writeTextFile(
    taskFilePath,
    `id: ${id}
title: ${JSON.stringify(title)}
status: open
createdAt: ${JSON.stringify(createdAt)}
description: |
${formatDescriptionBlock(description)}
`,
  );

  console.log(chalk.green(`Created task: ${id}`));
  return {
    id,
    title,
    status: "open",
    createdAt,
    description,
  };
}

export async function loadTaskById(repoRoot: string, taskId: string): Promise<TaskRecord> {
  await ensureOrkestrExists(repoRoot);

  const candidates = getTaskCandidates(repoRoot, taskId);
  const taskPath = (
    await Promise.all(
      candidates.map(async (candidate) => ({
        candidate,
        exists: await fs.pathExists(candidate),
      })),
    )
  ).find((candidate) => candidate.exists)?.candidate;

  if (!taskPath) {
    throw new OrkestrCliError(
      `Task \`${taskId}\` not found in .orkestr/tasks. Expected one of: ${candidates.join(", ")}`,
    );
  }

  const task = await readYamlFile<unknown>(taskPath);
  return validateTask(task, taskPath);
}
