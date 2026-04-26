import path from "node:path";

export const ORKESTRA_DIR_NAME = ".orkestra";

export function getOrkestraDir(repoRoot: string): string {
  return path.join(repoRoot, ORKESTRA_DIR_NAME);
}

export function getConfigPath(repoRoot: string): string {
  return path.join(getOrkestraDir(repoRoot), "config.yml");
}

export function getWorkflowsDir(repoRoot: string): string {
  return path.join(getOrkestraDir(repoRoot), "workflows");
}

export function getTasksDir(repoRoot: string): string {
  return path.join(getOrkestraDir(repoRoot), "tasks");
}

export function getEvalsDir(repoRoot: string): string {
  return path.join(getOrkestraDir(repoRoot), "evals");
}

export function getMemoryDir(repoRoot: string): string {
  return path.join(getOrkestraDir(repoRoot), "memory");
}

export function getPromptsDir(repoRoot: string): string {
  return path.join(getOrkestraDir(repoRoot), "prompts");
}

export function getRunsDir(repoRoot: string): string {
  return path.join(getOrkestraDir(repoRoot), "runs");
}

export function createTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function createEntityId(prefix: string, date: Date = new Date()): string {
  return `${prefix}-${createTimestamp(date)}`;
}

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function getTaskCandidates(repoRoot: string, taskId: string): string[] {
  const tasksDir = getTasksDir(repoRoot);
  if (taskId.endsWith(".yml") || taskId.endsWith(".yaml")) {
    return [path.join(tasksDir, taskId)];
  }

  return [path.join(tasksDir, `${taskId}.yml`), path.join(tasksDir, `${taskId}.yaml`)];
}

export function getRunFilePath(repoRoot: string, runId: string): string {
  const fileName = runId.endsWith(".json") ? runId : `${runId}.json`;
  return path.join(getRunsDir(repoRoot), fileName);
}
