import path from "node:path";
import fs from "fs-extra";

import type { ContextPack, TaskRecord } from "./context-builder.js";
import type { OrkestraConfig } from "./config.js";
import type { ModelProvider } from "../models/provider.js";
import { renderPrompt } from "./prompt-renderer.js";
import type { WorkflowRun, WorkflowRunStep } from "./run-store.js";
import { OrkestraCliError, readTextFile, readYamlFile } from "../utils/fs.js";
import { getOrkestraDir } from "../utils/paths.js";

interface WorkflowStepDefinition {
  name: string;
  prompt: string;
  model: string;
}

interface WorkflowDefinition {
  name: string;
  description?: string;
  steps: WorkflowStepDefinition[];
}

export interface RunWorkflowInput {
  repoRoot: string;
  workflowName: string;
  task: TaskRecord;
  contextPack: ContextPack;
  config: OrkestraConfig;
  provider: ModelProvider;
  runId: string;
  createdAt: string;
}

async function loadWorkflowDefinition(repoRoot: string, workflowName: string): Promise<WorkflowDefinition> {
  const workflowPath = path.join(getOrkestraDir(repoRoot), "workflows", `${workflowName}.yml`);
  if (!(await fs.pathExists(workflowPath))) {
    throw new OrkestraCliError(`Workflow \`${workflowName}\` was not found at ${workflowPath}.`);
  }

  const workflow = await readYamlFile<unknown>(workflowPath);
  if (typeof workflow !== "object" || workflow === null) {
    throw new OrkestraCliError(`Invalid workflow file at ${workflowPath}.`);
  }

  const typed = workflow as Partial<WorkflowDefinition>;
  if (typeof typed.name !== "string" || !Array.isArray(typed.steps)) {
    throw new OrkestraCliError(`Malformed workflow file at ${workflowPath}. Expected \`name\` and \`steps\`.`);
  }

  for (const step of typed.steps) {
    if (
      typeof step !== "object" ||
      step === null ||
      typeof (step as Partial<WorkflowStepDefinition>).name !== "string" ||
      typeof (step as Partial<WorkflowStepDefinition>).prompt !== "string" ||
      typeof (step as Partial<WorkflowStepDefinition>).model !== "string"
    ) {
      throw new OrkestraCliError(
        `Malformed workflow step in ${workflowPath}. Each step needs \`name\`, \`prompt\`, and \`model\`.`,
      );
    }
  }

  return typed as WorkflowDefinition;
}

function resolveModelAlias(config: OrkestraConfig, modelAlias: string): string {
  const model = config.models[modelAlias];
  if (!model) {
    throw new OrkestraCliError(`Model alias \`${modelAlias}\` is missing in .orkestra/config.yml.`);
  }

  return model;
}

export async function runWorkflow(input: RunWorkflowInput): Promise<WorkflowRun> {
  const workflow = await loadWorkflowDefinition(input.repoRoot, input.workflowName);
  const previous: Record<string, string> = {};
  const stepOutputs: WorkflowRunStep[] = [];

  for (const step of workflow.steps) {
    const promptPath = path.join(getOrkestraDir(input.repoRoot), step.prompt);
    if (!(await fs.pathExists(promptPath))) {
      throw new OrkestraCliError(`Prompt template for step \`${step.name}\` not found: ${promptPath}`);
    }

    const template = await readTextFile(promptPath);
    const renderedPrompt = renderPrompt(template, {
      task: input.task,
      context: {
        task: input.contextPack.task,
        memory: input.contextPack.memory,
        fileList: input.contextPack.fileList,
        files: input.contextPack.files,
      },
      previous,
      outputs: previous,
    });

    const output = await input.provider.generate({
      model: resolveModelAlias(input.config, step.model),
      stepName: step.name,
      prompt: renderedPrompt,
    });

    stepOutputs.push({
      name: step.name,
      model: step.model,
      prompt: renderedPrompt,
      output,
    });

    previous[step.name] = output;
  }

  return {
    id: input.runId,
    workflow: workflow.name,
    taskId: input.task.id,
    createdAt: input.createdAt,
    steps: stepOutputs,
  };
}
