#!/usr/bin/env node

import "dotenv/config";

import { Command } from "commander";
import chalk from "chalk";

import { buildContextCommand } from "./commands/context.js";
import { generateHandoverCommand } from "./commands/handover.js";
import { runInitCommand } from "./commands/init.js";
import { createTaskCommand } from "./commands/task.js";
import { runWorkflowCommand } from "./commands/workflow.js";
import { formatError } from "./utils/fs.js";

async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(chalk.red(formatError(error)));
    process.exitCode = 1;
  }
}

const program = new Command();
program
  .name("orkestr")
  .description("Repo-native AI workflow, memory, and evaluation CLI.")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize Orkestr in the current repository.")
  .action(() => runAction(() => runInitCommand()));

const taskCommand = program.command("task").description("Task operations.");
taskCommand
  .command("create")
  .description("Create a structured task.")
  .argument("<title>", "Task title")
  .requiredOption("--description <description>", "Task description")
  .action((title: string, options: { description: string }) =>
    runAction(() => createTaskCommand(title, options.description).then(() => undefined)),
  );

const contextCommand = program.command("context").description("Context operations.");
contextCommand
  .command("build")
  .description("Build a context pack for a task.")
  .requiredOption("--task <taskId>", "Task ID")
  .action((options: { task: string }) =>
    runAction(() => buildContextCommand(options.task).then(() => undefined)),
  );

const workflowCommand = program.command("workflow").description("Workflow operations.");
workflowCommand
  .command("run")
  .description("Run a workflow for a task.")
  .argument("<workflowName>", "Workflow name")
  .requiredOption("--task <taskId>", "Task ID")
  .action((workflowName: string, options: { task: string }) =>
    runAction(() => runWorkflowCommand(workflowName, options.task).then(() => undefined)),
  );

const handoverCommand = program.command("handover").description("Handover operations.");
handoverCommand
  .command("generate")
  .description("Generate and append a handover entry.")
  .requiredOption("--run <runId>", "Run ID")
  .action((options: { run: string }) => runAction(() => generateHandoverCommand(options.run)));

void program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.red(formatError(error)));
  process.exit(1);
});
