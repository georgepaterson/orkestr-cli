import path from "node:path";
import chalk from "chalk";

import { loadConfig } from "../core/config.js";
import { renderPrompt } from "../core/prompt-renderer.js";
import { loadWorkflowRun } from "../core/run-store.js";
import { MockProvider } from "../models/mock-provider.js";
import { appendTextFile, ensureOrkestrExists, readTextFile } from "../utils/fs.js";
import { getMemoryDir, getPromptsDir } from "../utils/paths.js";
import { loadTaskById } from "./task.js";

interface HandoverSections {
  summary: string;
  decisions: string;
  nextSteps: string;
}

function parseHandoverOutput(rawOutput: string): HandoverSections {
  const buckets: HandoverSections = {
    summary: "",
    decisions: "",
    nextSteps: "",
  };

  let current: keyof HandoverSections | null = null;
  for (const line of rawOutput.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^summary:/i.test(trimmed)) {
      current = "summary";
      continue;
    }
    if (/^decisions:/i.test(trimmed)) {
      current = "decisions";
      continue;
    }
    if (/^next steps:/i.test(trimmed)) {
      current = "nextSteps";
      continue;
    }

    if (current) {
      buckets[current] += `${line}\n`;
    }
  }

  return {
    summary: buckets.summary.trim() || rawOutput.trim(),
    decisions: buckets.decisions.trim() || "- No decisions captured.",
    nextSteps: buckets.nextSteps.trim() || "- No next steps captured.",
  };
}

function formatHandoverEntry(
  taskTitle: string,
  runId: string,
  sections: HandoverSections,
  createdAt: string,
): string {
  return `## Handover: ${taskTitle}

Date: ${createdAt}  
Run: ${runId}

### Summary

${sections.summary}

### Decisions

${sections.decisions}

### Next steps

${sections.nextSteps}
`;
}

export async function generateHandoverCommand(runId: string, repoRoot: string = process.cwd()): Promise<void> {
  await ensureOrkestrExists(repoRoot);

  const run = await loadWorkflowRun(repoRoot, runId);
  const task = await loadTaskById(repoRoot, run.taskId);
  const config = await loadConfig(repoRoot);

  const promptTemplate = await readTextFile(path.join(getPromptsDir(repoRoot), "handover.md"));
  const outputs = run.steps.reduce<Record<string, string>>((accumulator, step) => {
    accumulator[step.name] = step.output;
    return accumulator;
  }, {});

  const prompt = renderPrompt(promptTemplate, {
    task,
    outputs,
  });

  const provider = new MockProvider();
  const modelAlias = config.models.default ?? "mock:default";
  const providerOutput = await provider.generate({
    model: modelAlias,
    stepName: "handover",
    prompt,
  });

  const entry = formatHandoverEntry(task.title, run.id, parseHandoverOutput(providerOutput), new Date().toISOString());
  const handoversPath = path.join(getMemoryDir(repoRoot), "handovers.md");
  const existingContents = await readTextFile(handoversPath, { optional: true, defaultValue: "" });
  const separator = existingContents.trim().length > 0 ? "\n\n" : "";

  await appendTextFile(handoversPath, `${separator}${entry.trimEnd()}\n`);
  console.log(chalk.green(`Handover generated for run ${run.id}`));
}
