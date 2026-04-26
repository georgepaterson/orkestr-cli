import path from "node:path";
import fs from "fs-extra";
import chalk from "chalk";

import { writeTextFile } from "../utils/fs.js";
import {
  getEvalsDir,
  getMemoryDir,
  getOrkestrDir,
  getPromptsDir,
  getRunsDir,
  getTasksDir,
  getWorkflowsDir,
} from "../utils/paths.js";

const STARTER_CONFIG = `project:
  name: example-project

providers:
  openai:
    apiKeyEnv: OPENAI_API_KEY
  anthropic:
    apiKeyEnv: ANTHROPIC_API_KEY

models:
  default:
    provider: openai
    model: gpt-4.1-mini
  planning:
    provider: anthropic
    model: claude-3-5-sonnet-latest
    maxTokens: 2048
  review:
    provider: anthropic
    model: claude-3-5-sonnet-latest
    maxTokens: 2048

context:
  include:
    - src/**
    - package.json
    - README.md
  exclude:
    - node_modules/**
    - dist/**
    - .git/**
    - .orkestr/runs/**
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

const STARTER_DOT_ENV_EXAMPLE = `OPENAI_API_KEY=
ANTHROPIC_API_KEY=
`;

export async function runInitCommand(repoRoot: string = process.cwd()): Promise<void> {
  const orkestrDir = getOrkestrDir(repoRoot);
  if (await fs.pathExists(orkestrDir)) {
    console.log(chalk.yellow(`Skipped initialization: ${orkestrDir} already exists.`));
    return;
  }

  await fs.ensureDir(orkestrDir);
  await fs.ensureDir(getWorkflowsDir(repoRoot));
  await fs.ensureDir(getTasksDir(repoRoot));
  await fs.ensureDir(getEvalsDir(repoRoot));
  await fs.ensureDir(getMemoryDir(repoRoot));
  await fs.ensureDir(getPromptsDir(repoRoot));
  await fs.ensureDir(getRunsDir(repoRoot));

  await writeTextFile(path.join(orkestrDir, "config.yml"), STARTER_CONFIG);
  await writeTextFile(
    path.join(getWorkflowsDir(repoRoot), "feature.yml"),
    STARTER_FEATURE_WORKFLOW,
  );
  await writeTextFile(path.join(getEvalsDir(repoRoot), "api-quality.yml"), STARTER_EVAL);
  await writeTextFile(path.join(getMemoryDir(repoRoot), "decisions.md"), STARTER_DECISIONS);
  await writeTextFile(path.join(getMemoryDir(repoRoot), "handovers.md"), STARTER_HANDOVERS);
  await writeTextFile(path.join(getMemoryDir(repoRoot), "patterns.md"), STARTER_PATTERNS);
  await writeTextFile(path.join(getPromptsDir(repoRoot), "plan.md"), PLAN_PROMPT);
  await writeTextFile(path.join(getPromptsDir(repoRoot), "implement.md"), IMPLEMENT_PROMPT);
  await writeTextFile(path.join(getPromptsDir(repoRoot), "review.md"), REVIEW_PROMPT);
  await writeTextFile(path.join(getPromptsDir(repoRoot), "handover.md"), HANDOVER_PROMPT);

  const dotEnvExamplePath = path.join(repoRoot, ".env.example");
  if (!(await fs.pathExists(dotEnvExamplePath))) {
    await writeTextFile(dotEnvExamplePath, STARTER_DOT_ENV_EXAMPLE);
  }

  console.log(chalk.green(`Initialized Orkestr in ${orkestrDir}`));
}
