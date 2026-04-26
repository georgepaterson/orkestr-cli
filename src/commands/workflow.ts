import chalk from "chalk";

import { loadConfig } from "../core/config.js";
import { buildContextPack } from "../core/context-builder.js";
import { runWorkflow } from "../core/workflow-runner.js";
import { saveWorkflowRun } from "../core/run-store.js";
import { createProvider } from "../models/provider-factory.js";
import { createEntityId } from "../utils/paths.js";
import { loadTaskById } from "./task.js";

export async function runWorkflowCommand(
  workflowName: string,
  taskId: string,
  repoRoot: string = process.cwd(),
): Promise<string> {
  const task = await loadTaskById(repoRoot, taskId);
  const config = await loadConfig(repoRoot);

  const contextPack = await buildContextPack({
    repoRoot,
    task,
    config,
    contextId: createEntityId("context"),
    createdAt: new Date().toISOString(),
  });

  const run = await runWorkflow({
    repoRoot,
    workflowName,
    task,
    contextPack,
    config,
    provider: createProvider(config),
    runId: createEntityId("run"),
    createdAt: new Date().toISOString(),
  });

  const outputPath = await saveWorkflowRun(repoRoot, run);
  console.log(chalk.green(`Workflow run saved: ${run.id}`));
  console.log(chalk.gray(outputPath));
  return run.id;
}
