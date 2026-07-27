# sendkit

An MCP server, CLI, and Claude Skills toolkit for sending messages to external
services. Right now it can send Telegram messages, exposed three ways:

- a **CLI** (`sendkit telegram <chatId> <message>`)
- a **local MCP server** over stdio, for Claude Code / OpenCode / any MCP client
- a shared **core** library that both of the above build on

> This project follows the ["Code with Antonio"](https://www.youtube.com/watch?v=YKIUt9ytxIE)
> tutorial: <https://www.youtube.com/watch?v=YKIUt9ytxIE>

## Requirements

- [Bun](https://bun.sh) 1.3+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Setup

```bash
bun install
cp .env.example .env   # then fill in TELEGRAM_BOT_TOKEN
```

Bun loads `.env` automatically for both the CLI and the MCP server.

## Usage

### CLI

```bash
bun run dev:cli telegram <chatId> "Hello from sendkit"
```

To find your chat ID, message your bot and then open
`https://api.telegram.org/bot<TOKEN>/getUpdates` — the chat ID is in
`result[].message.chat.id`.

### Local MCP server

```bash
bun run dev:local-mcp
```

The server speaks JSON-RPC over stdio and registers a single `telegram` tool
taking `chatId` and `message`. The bot token is never a tool argument — it comes
from `TELEGRAM_BOT_TOKEN` in the server's environment.

**Claude Code** picks up `.mcp.json` in the repo root automatically. It runs the
server through Bun from the repo root, so the token is read from `.env` and no
secret has to be committed. **OpenCode** uses `opencode.json` — replace the
`<bot-token>` placeholder there with your own token (and keep it out of git).

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev:cli` | Run the CLI from source |
| `bun run dev:local-mcp` | Run the local MCP server over stdio |
| `bun test` | Run the test suite |
| `bun run typecheck` | Type-check the whole workspace with `tsc` |

## Layout

```
packages/
  core/        shared zod schemas + the sendTelegramMessage operation
  mcp-tools/   the `telegram` MCP tool, shared by both MCP servers
  cli/         commander-based CLI wrapping core
  local-mcp/   MCP stdio server wrapping mcp-tools
apps/
  remote-mcp/  Hono + Clerk MCP server over HTTP, wrapping mcp-tools
```

`packages/core` is the single place where the Telegram API is called and where
input/output shapes are validated, so the CLI and the MCP servers can never
drift apart. `packages/mcp-tools` plays the same role one layer up: it owns the
tool's name, description, schemas, and result formatting, so the local and
remote servers expose an identical tool and differ only in transport and in how
they resolve the bot token.

## License

[MIT](./LICENSE)
