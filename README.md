# Orkestr CLI

Orkestr is a repo-native workflow, memory, and evaluation layer for AI-assisted software development.

This package is the local-first MVP CLI (`@orkestr/cli`).

## MVP features

- local-first CLI
- structured tasks
- workflow runner
- prompt templates
- context pack generation
- persistent handovers and memory
- OpenAI + Anthropic model adapters
- per-run prompt/response transcripts in `.orkestr/runs/<run-id>/exchanges.jsonl`
- deterministic mock model provider for unit tests

## Future features

- VS Code/Cursor extension
- eval runner
- hosted context engine
- model routing
- team sync
- mobile command centre

## Environment

Copy `.env.example` to `.env` and add your keys:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Model config

The scaffolded `.orkestr/config.yml` supports provider configuration and model aliases:

```yaml
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
```

For unit tests or local deterministic runs, you can still route aliases to mock models:

```yaml
models:
  default: mock:default
```

## Commands

- `orkestr init`
- `orkestr task create "<title>" --description "<description>"`
- `orkestr context build --task <task-id>`
- `orkestr workflow run feature --task <task-id>`
- `orkestr handover generate --run <run-id>`

## Development

```bash
npm install
npm run build
npm link
```

## License

GNU Affero General Public License v3.0.
