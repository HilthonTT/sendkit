# sendkit

An MCP server and CLI toolkit for sending messages to external services. Right
now it can send Telegram messages, exposed three ways:

- a **CLI** (`sendkit telegram <chatId> <message>`)
- a **local MCP server** over stdio, for Claude Code / OpenCode / any MCP client
- a **remote MCP server** over HTTP, with Clerk OAuth

All three sit on a shared core, so the Telegram API is only called in one place.

> This project follows the ["Code with Antonio"](https://www.youtube.com/watch?v=YKIUt9ytxIE)
> tutorial: <https://www.youtube.com/watch?v=YKIUt9ytxIE>

## Requirements

- [Bun](https://bun.sh) 1.3+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A [Clerk](https://clerk.com) app — only for the remote MCP server

## Setup

```bash
bun install
cp .env.example .env
```

`.env` is read by the MCP servers: `TELEGRAM_BOT_TOKEN` for the local one,
`CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` for the remote one. Bun loads it
automatically. The CLI does not use `.env` — see below.

## Usage

### CLI

The CLI keeps its token in `~/.config/sendkit/config.json` (mode `0600`), written
once by `init`:

```bash
bun run dev:cli init --telegram-bot-token <token>
bun run dev:cli telegram <chatId> "Hello from sendkit"
```

To find your chat ID, message your bot and then open
`https://api.telegram.org/bot<TOKEN>/getUpdates` — the chat ID is in
`result[].message.chat.id`.

### Local MCP server

```bash
bun run dev:local-mcp
```

Speaks JSON-RPC over stdio and registers a single `telegram` tool taking
`chatId` and `message`. The bot token is never a tool argument — it comes from
`TELEGRAM_BOT_TOKEN` in the server's environment.

**Claude Code** picks up `.mcp.json` in the repo root automatically. It runs the
server through Bun from the repo root, so the token is read from `.env` and no
secret has to be committed. **OpenCode** uses `opencode.json` — replace the
`<bot-token>` placeholder there with your own token (and keep it out of git).

### Remote MCP server

```bash
bun run dev:remote-mcp   # listens on PORT, default 3000
```

Serves the same `telegram` tool at `POST /:botToken/mcp`, guarded by a Clerk
OAuth bearer token. Unauthenticated requests get a `401` plus a
`WWW-Authenticate` header pointing at the protected-resource metadata at
`/.well-known/oauth-protected-resource/:botToken/mcp`, which is how MCP clients
discover where to log in.

Note that the bot token lives in the URL path, so each client brings its own —
the server holds no Telegram credentials. Only run this over HTTPS.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev:cli` | Run the CLI from source |
| `bun run dev:local-mcp` | Run the local MCP server over stdio |
| `bun run dev:remote-mcp` | Run the remote MCP server over HTTP |
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
