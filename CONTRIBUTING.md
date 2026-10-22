# Contributing

Thanks for helping out! sendkit is a [Bun](https://bun.sh) workspace.

## Setup

```bash
bun install
cp .env.example .env
```

## Project layout

```
apps/
  cli/          commander CLI (`sendkit`)
  local-mcp/    stdio MCP server
  remote-mcp/   Hono + Clerk HTTP MCP server
packages/
  core/         zod schemas + sendTelegramMessage (the only Telegram API caller)
  mcp-tools/    the shared `telegram` MCP tool definition
```

`apps/` holds things you run; `packages/` holds libraries the apps share.
Anything that talks to Telegram belongs in `packages/core`, and new MCP tools
belong in `packages/mcp-tools`, so the CLI and both servers stay in sync.

## Before opening a pull request

```bash
bun run check   # typecheck + tests
```

Tests live next to the code they cover (`*.test.ts`) and run with `bun test`.
Mock `fetch` instead of calling the real Telegram API, and never commit a bot
token or Clerk key.
