import path from "node:path";
import fs from "fs-extra";
import chalk from "chalk";

import { writeTextFile } from "../utils/fs.js";
import {
  getEvalsDir,
  getMemoryDir,
  getOrkestraDir,
  getPromptsDir,
  getRunsDir,
  getTasksDir,
  getWorkflowsDir,
} from "../utils/paths.js";

const STARTER_CONFIG = `project:
  name: example-project

models:
  default: mock:default
  planning: mock:planning
  review: mock:review

context:
  include:
    - src/**
    - package.json
    - README.md
  exclude:
    - node_modules/**
    - dist/**
    - .git/**
    - .orkestra/runs/**
`;

const STARTER_FEATURE_WORKFLOW = `name: feature
description: Plan, implement, review, and hand over a feature.

steps:
  - name: plan
    prompt: prompts/plan.md
    model: planning

  - name: implement
    prompt: prompts/implement.md
    model: default

  - name: review
    prompt: prompts/review.md
    model: review
`;

const STARTER_EVAL = `name: api-quality
description: Baseline API quality evaluation scaffold for future MVP iterations.

checks:
  - name: api-contract-clarity
    expectation: Endpoints are explicit and consistently documented.
  - name: error-handling-quality
    expectation: API errors are stable, actionable, and tested.
`;

const PLAN_PROMPT = `You are helping plan a software change.

Task:
{{task}}

Relevant context:
{{context}}

Return:
- Summary
- Assumptions
- Files likely to change
- Implementation plan
- Risks
`;

const IMPLEMENT_PROMPT = `You are helping implement a software change.

Task:
{{task}}

Plan:
{{previous.plan}}

Relevant context:
{{context}}

Return:
- Proposed changes
- Code snippets or patch guidance
- Tests to add/update
`;

const REVIEW_PROMPT = `Review the proposed implementation.

Task:
{{task}}

Implementation:
{{previous.implement}}

Relevant context:
{{context}}

Return:
- Issues
- Security concerns
- Missing tests
- Suggested improvements
- Approval status
`;

const HANDOVER_PROMPT = `Generate a handover from this workflow run.

Task:
{{task}}

Workflow outputs:
{{outputs}}

Return:
- Summary
- Decisions
- Risks
- Next steps
`;

const STARTER_DECISIONS = `# Decisions

Record notable technical and product decisions here.
`;

const STARTER_HANDOVERS = `# Handovers

Generated workflow handovers will be appended below.
`;

const STARTER_PATTERNS = `# Patterns

Capture reusable implementation patterns and conventions here.
`;

export async function runInitCommand(repoRoot: string = process.cwd()): Promise<void> {
  const orkestraDir = getOrkestraDir(repoRoot);
  if (await fs.pathExists(orkestraDir)) {
    console.log(chalk.yellow(`Skipped initialization: ${orkestraDir} already exists.`));
    return;
  }

  await fs.ensureDir(orkestraDir);
  await fs.ensureDir(getWorkflowsDir(repoRoot));
  await fs.ensureDir(getTasksDir(repoRoot));
  await fs.ensureDir(getEvalsDir(repoRoot));
  await fs.ensureDir(getMemoryDir(repoRoot));
  await fs.ensureDir(getPromptsDir(repoRoot));
  await fs.ensureDir(getRunsDir(repoRoot));

  await writeTextFile(path.join(orkestraDir, "config.yml"), STARTER_CONFIG);
  await writeTextFile(path.join(getWorkflowsDir(repoRoot), "feature.yml"), STARTER_FEATURE_WORKFLOW);
  await writeTextFile(path.join(getEvalsDir(repoRoot), "api-quality.yml"), STARTER_EVAL);
  await writeTextFile(path.join(getMemoryDir(repoRoot), "decisions.md"), STARTER_DECISIONS);
  await writeTextFile(path.join(getMemoryDir(repoRoot), "handovers.md"), STARTER_HANDOVERS);
  await writeTextFile(path.join(getMemoryDir(repoRoot), "patterns.md"), STARTER_PATTERNS);
  await writeTextFile(path.join(getPromptsDir(repoRoot), "plan.md"), PLAN_PROMPT);
  await writeTextFile(path.join(getPromptsDir(repoRoot), "implement.md"), IMPLEMENT_PROMPT);
  await writeTextFile(path.join(getPromptsDir(repoRoot), "review.md"), REVIEW_PROMPT);
  await writeTextFile(path.join(getPromptsDir(repoRoot), "handover.md"), HANDOVER_PROMPT);

  console.log(chalk.green(`Initialized Orkestra in ${orkestraDir}`));
}
