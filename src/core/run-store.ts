import path from "node:path";
import fs from "fs-extra";

import type { ContextPack } from "./context-builder.js";
import { OrkestrCliError, readJsonFile, writeJsonFile } from "../utils/fs.js";
import { getRunFilePath, getRunTranscriptPath, getRunsDir } from "../utils/paths.js";

export interface WorkflowRunStep {
  name: string;
  modelAlias: string;
  provider: string;
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

export interface RunExchange {
  createdAt: string;
  source: "workflow" | "handover";
  stepName: string;
  modelAlias: string;
  provider: string;
  model: string;
  prompt: string;
  response: string;
}

async function appendRunExchangeLine(
  repoRoot: string,
  runId: string,
  exchange: RunExchange,
): Promise<string> {
  const transcriptPath = getRunTranscriptPath(repoRoot, runId);
  await fs.ensureDir(path.dirname(transcriptPath));
  await fs.appendFile(transcriptPath, `${JSON.stringify(exchange)}\n`, "utf8");
  return transcriptPath;
}

export async function saveContextPack(repoRoot: string, contextPack: ContextPack): Promise<string> {
  const outputPath = getRunFilePath(repoRoot, contextPack.id);
  await writeJsonFile(outputPath, contextPack);
  return outputPath;
}

export async function saveWorkflowRun(repoRoot: string, workflowRun: WorkflowRun): Promise<string> {
  const outputPath = getRunFilePath(repoRoot, workflowRun.id);
  await writeJsonFile(outputPath, workflowRun);

  for (const step of workflowRun.steps) {
    await appendRunExchangeLine(repoRoot, workflowRun.id, {
      createdAt: workflowRun.createdAt,
      source: "workflow",
      stepName: step.name,
      modelAlias: step.modelAlias,
      provider: step.provider,
      model: step.model,
      prompt: step.prompt,
      response: step.output,
    });
  }

  return outputPath;
}

export async function appendRunExchange(
  repoRoot: string,
  runId: string,
  exchange: RunExchange,
): Promise<string> {
  return appendRunExchangeLine(repoRoot, runId, exchange);
}

export async function loadWorkflowRun(repoRoot: string, runId: string): Promise<WorkflowRun> {
  const runPath = getRunFilePath(repoRoot, runId);
  if (!(await fs.pathExists(runPath))) {
    throw new OrkestrCliError(`Missing run file for \`${runId}\` at ${runPath}.`);
  }

  const run = await readJsonFile<unknown>(runPath);
  if (typeof run !== "object" || run === null) {
    throw new OrkestrCliError(`Invalid run payload in ${runPath}.`);
  }

  const typed = run as Partial<WorkflowRun>;
  if (
    typeof typed.id !== "string" ||
    typeof typed.workflow !== "string" ||
    typeof typed.taskId !== "string" ||
    typeof typed.createdAt !== "string" ||
    !Array.isArray(typed.steps)
  ) {
    throw new OrkestrCliError(`Malformed run file in ${runPath}.`);
  }

  return typed as WorkflowRun;
}

export async function ensureRunsDirectory(repoRoot: string): Promise<void> {
  await fs.ensureDir(getRunsDir(repoRoot));
}
