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
- mock model provider

## Future features

- VS Code/Cursor extension
- real model providers
- eval runner
- hosted context engine
- model routing
- team sync
- mobile command centre

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
