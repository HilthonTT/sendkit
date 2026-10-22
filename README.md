# sendkit

Send Telegram messages from a **CLI**, a **local MCP server** (stdio), or a
**remote MCP server** (HTTP + Clerk OAuth). All three share one core, so the
Telegram API is called and validated in a single place.

> Built following the [Code with Antonio](https://www.youtube.com/watch?v=YKIUt9ytxIE) tutorial.

**Requirements:** [Bun](https://bun.sh) 1.3+, a bot token from
[@BotFather](https://t.me/BotFather), and a [Clerk](https://clerk.com) app (remote server only).

```bash
bun install
cp .env.example .env   # TELEGRAM_BOT_TOKEN (local MCP), CLERK_* keys (remote MCP)
```

## CLI

The CLI ignores `.env`; `init` stores the token in `~/.config/sendkit/config.json` (mode `0600`).

```bash
bun run dev:cli init --telegram-bot-token <token>
bun run dev:cli telegram <chatId> "Hello from sendkit"
```

Run `bun link` in `apps/cli` to get a global `sendkit` command. To find a chat ID,
message your bot and open `https://api.telegram.org/bot<TOKEN>/getUpdates`
(`result[].message.chat.id`).

## Local MCP server

`bun run dev:local-mcp` registers a `telegram` tool (`chatId`, `message`) over stdio.
The token comes from `TELEGRAM_BOT_TOKEN`, never from a tool argument.
Claude Code (`.mcp.json`) and OpenCode (`opencode.json`) both start it from the
repo root, where Bun loads the token from `.env`. Don't put tokens in those files:
they are tracked by git.

## Remote MCP server

`bun run dev:remote-mcp` (port `PORT`, default 3000) serves the same tool at
`POST /:botToken/mcp`, guarded by a Clerk OAuth bearer token. Unauthenticated
requests get a `401` whose `WWW-Authenticate` header points MCP clients at
`/.well-known/oauth-protected-resource/:botToken/mcp`. Behind a proxy,
`X-Forwarded-Proto`/`X-Forwarded-Host` are honored. Each client brings its own
bot token in the URL, so **only run this over HTTPS**.

## Development

`bun test` runs the tests; `bun run typecheck` type-checks the workspace.

```
apps/cli/             commander CLI
apps/local-mcp/       stdio MCP server
apps/remote-mcp/      Hono + Clerk HTTP MCP server
packages/core/        zod schemas + sendTelegramMessage (the only Telegram API caller)
packages/mcp-tools/   the shared `telegram` MCP tool definition
```

## License

[GPL-3.0](./LICENSE)
