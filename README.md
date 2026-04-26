# Orkestra CLI

Orkestra is a repo-native workflow, memory, and evaluation layer for AI-assisted software development.

This package is the local-first MVP CLI (`@orkestra/cli`).

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

- `orkestra init`
- `orkestra task create "<title>" --description "<description>"`
- `orkestra context build --task <task-id>`
- `orkestra workflow run feature --task <task-id>`
- `orkestra handover generate --run <run-id>`

## Development

```bash
npm install
npm run build
npm link
```

## License

GNU Affero General Public License v3.0.
