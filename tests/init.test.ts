import path from "node:path";
import fs from "node:fs/promises";

import { runInitCommand } from "../src/commands/init.js";
import { ORKESTR_DIR_NAME } from "../src/utils/paths.js";

describe("runInitCommand", () => {
  let tempRepoRoot = "";

  beforeEach(async () => {
    const baseTmpDir = path.join(process.cwd(), "tmp");
    await fs.mkdir(baseTmpDir, { recursive: true });

    tempRepoRoot = path.join(
      baseTmpDir,
      `orkestr-test-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    await fs.mkdir(tempRepoRoot, { recursive: true });
  });

  afterEach(async () => {
    if (tempRepoRoot) {
      await fs.rm(tempRepoRoot, { recursive: true, force: true });
    }
  });

  it("creates .orkestr scaffolding in a temp repo", async () => {
    await runInitCommand(tempRepoRoot);

    const orkestrDir = path.join(tempRepoRoot, ORKESTR_DIR_NAME);

    await expect(fs.stat(orkestrDir)).resolves.toBeDefined();
    await expect(fs.stat(path.join(orkestrDir, "config.yml"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(orkestrDir, "tasks"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(orkestrDir, "runs"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(orkestrDir, "workflows", "feature.yml"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(orkestrDir, "prompts", "plan.md"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(orkestrDir, "memory", "handovers.md"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(orkestrDir, "evals", "api-quality.yml"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(tempRepoRoot, ".env.example"))).resolves.toBeDefined();
  });
});
