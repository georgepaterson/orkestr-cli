import path from "node:path";

export const ORKESTR_DIR_NAME = ".orkestr";

export function getOrkestrDir(repoRoot: string): string {
  return path.join(repoRoot, ORKESTR_DIR_NAME);
}

export function getConfigPath(repoRoot: string): string {
  return path.join(getOrkestrDir(repoRoot), "config.yml");
}

export function getWorkflowsDir(repoRoot: string): string {
  return path.join(getOrkestrDir(repoRoot), "workflows");
}

export function getTasksDir(repoRoot: string): string {
  return path.join(getOrkestrDir(repoRoot), "tasks");
}

export function getEvalsDir(repoRoot: string): string {
  return path.join(getOrkestrDir(repoRoot), "evals");
}

export function getMemoryDir(repoRoot: string): string {
  return path.join(getOrkestrDir(repoRoot), "memory");
}

export function getPromptsDir(repoRoot: string): string {
  return path.join(getOrkestrDir(repoRoot), "prompts");
}

export function getRunsDir(repoRoot: string): string {
  return path.join(getOrkestrDir(repoRoot), "runs");
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

export function getRunArtifactsDir(repoRoot: string, runId: string): string {
  return path.join(getRunsDir(repoRoot), runId);
}

export function getRunTranscriptPath(repoRoot: string, runId: string): string {
  return path.join(getRunArtifactsDir(repoRoot, runId), "exchanges.jsonl");
}
