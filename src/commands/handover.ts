import path from "node:path";
import chalk from "chalk";

import { loadConfig } from "../core/config.js";
import { renderPrompt } from "../core/prompt-renderer.js";
import { appendRunExchange, loadWorkflowRun } from "../core/run-store.js";
import { createProvider } from "../models/provider-factory.js";
import { OrkestrCliError, appendTextFile, ensureOrkestrExists, readTextFile } from "../utils/fs.js";
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

export async function generateHandoverCommand(
  runId: string,
  repoRoot: string = process.cwd(),
): Promise<void> {
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

  const modelAlias = "default";
  const modelConfig = config.models[modelAlias];
  if (!modelConfig) {
    throw new OrkestrCliError(
      "Missing model alias `default` in .orkestr/config.yml. Add a default model to generate handovers.",
    );
  }

  const provider = createProvider(config);
  const providerOutput = await provider.generate({
    provider: modelConfig.provider,
    model: modelConfig.model,
    stepName: "handover",
    prompt,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
  });

  await appendRunExchange(repoRoot, run.id, {
    createdAt: new Date().toISOString(),
    source: "handover",
    stepName: "handover",
    modelAlias,
    provider: modelConfig.provider,
    model: modelConfig.model,
    prompt,
    response: providerOutput,
  });

  const entry = formatHandoverEntry(
    task.title,
    run.id,
    parseHandoverOutput(providerOutput),
    new Date().toISOString(),
  );
  const handoversPath = path.join(getMemoryDir(repoRoot), "handovers.md");
  const existingContents = await readTextFile(handoversPath, { optional: true, defaultValue: "" });
  const separator = existingContents.trim().length > 0 ? "\n\n" : "";

  await appendTextFile(handoversPath, `${separator}${entry.trimEnd()}\n`);
  console.log(chalk.green(`Handover generated for run ${run.id}`));
}
