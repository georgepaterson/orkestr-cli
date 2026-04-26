import chalk from "chalk";

import { loadConfig } from "../core/config.js";
import { buildContextPack } from "../core/context-builder.js";
import { saveContextPack } from "../core/run-store.js";
import { loadTaskById } from "./task.js";
import { createEntityId } from "../utils/paths.js";

export async function buildContextCommand(
  taskId: string,
  repoRoot: string = process.cwd(),
): Promise<string> {
  const task = await loadTaskById(repoRoot, taskId);
  const config = await loadConfig(repoRoot);
  const createdAt = new Date().toISOString();
  const contextId = createEntityId("context");

  const contextPack = await buildContextPack({
    repoRoot,
    task,
    config,
    contextId,
    createdAt,
  });

  const outputPath = await saveContextPack(repoRoot, contextPack);
  console.log(chalk.green(`Context pack saved: ${contextPack.id}`));
  console.log(chalk.gray(outputPath));
  return contextPack.id;
}
