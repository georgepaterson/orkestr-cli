import YAML from "yaml";

function getValueByPath(source: Record<string, unknown>, pathExpression: string): unknown {
  const parts = pathExpression.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(part in (current as Record<string, unknown>))
    ) {
      return "";
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function stringifyTemplateValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return YAML.stringify(value).trim();
}

export function renderPrompt(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, expression: string) => {
    const value = getValueByPath(variables, expression.trim());
    return stringifyTemplateValue(value);
  });
}
