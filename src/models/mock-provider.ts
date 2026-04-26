import { createHash } from "node:crypto";

import type { GenerateRequest, ModelProvider } from "./provider.js";

function digestPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
}

function createWorkflowOutput(request: GenerateRequest): string {
  const hash = digestPrompt(request.prompt);
  const step = request.stepName ?? "unknown-step";

  return [
    `MockProvider output`,
    `model: ${request.model}`,
    `step: ${step}`,
    `promptDigest: ${hash}`,
    "",
    `Summary`,
    `- Deterministic mock response for the ${step} step.`,
    `- Replace this provider with a real model integration in later milestones.`,
    "",
    `Suggested actions`,
    `- Review the output and decide what to implement.`,
    `- Add or update tests before finalizing changes.`,
  ].join("\n");
}

function createHandoverOutput(request: GenerateRequest): string {
  const hash = digestPrompt(request.prompt);

  return [
    "Summary:",
    `- Completed a deterministic workflow handover draft (digest: ${hash}).`,
    "- Workflow outputs were captured and summarized for follow-up.",
    "",
    "Decisions:",
    "- Keep model routing on mock aliases for this MVP.",
    "- Use saved run artifacts as the source of truth for handover notes.",
    "",
    "Next steps:",
    "- Convert implementation guidance into concrete commits.",
    "- Validate behavior with tests and review feedback.",
  ].join("\n");
}

export class MockProvider implements ModelProvider {
  async generate(request: GenerateRequest): Promise<string> {
    const isHandoverPrompt =
      request.stepName === "handover" || request.prompt.toLowerCase().includes("generate a handover");

    if (isHandoverPrompt) {
      return createHandoverOutput(request);
    }

    return createWorkflowOutput(request);
  }
}
