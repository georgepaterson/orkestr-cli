import fs from "fs-extra";

import type { ContextPack } from "./context-builder.js";
import { OrkestraCliError, readJsonFile, writeJsonFile } from "../utils/fs.js";
import { getRunFilePath, getRunsDir } from "../utils/paths.js";

export interface WorkflowRunStep {
  name: string;
  model: string;
  prompt: string;
  output: string;
}

export interface WorkflowRun {
  id: string;
  workflow: string;
  taskId: string;
  createdAt: string;
  steps: WorkflowRunStep[];
}

export async function saveContextPack(repoRoot: string, contextPack: ContextPack): Promise<string> {
  const outputPath = getRunFilePath(repoRoot, contextPack.id);
  await writeJsonFile(outputPath, contextPack);
  return outputPath;
}

export async function saveWorkflowRun(repoRoot: string, workflowRun: WorkflowRun): Promise<string> {
  const outputPath = getRunFilePath(repoRoot, workflowRun.id);
  await writeJsonFile(outputPath, workflowRun);
  return outputPath;
}

export async function loadWorkflowRun(repoRoot: string, runId: string): Promise<WorkflowRun> {
  const runPath = getRunFilePath(repoRoot, runId);
  if (!(await fs.pathExists(runPath))) {
    throw new OrkestraCliError(`Missing run file for \`${runId}\` at ${runPath}.`);
  }

  const run = await readJsonFile<unknown>(runPath);
  if (typeof run !== "object" || run === null) {
    throw new OrkestraCliError(`Invalid run payload in ${runPath}.`);
  }

  const typed = run as Partial<WorkflowRun>;
  if (
    typeof typed.id !== "string" ||
    typeof typed.workflow !== "string" ||
    typeof typed.taskId !== "string" ||
    typeof typed.createdAt !== "string" ||
    !Array.isArray(typed.steps)
  ) {
    throw new OrkestraCliError(`Malformed run file in ${runPath}.`);
  }

  return typed as WorkflowRun;
}

export async function ensureRunsDirectory(repoRoot: string): Promise<void> {
  await fs.ensureDir(getRunsDir(repoRoot));
}
