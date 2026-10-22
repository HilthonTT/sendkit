# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue. Report it privately through
[GitHub security advisories](https://github.com/HilthonTT/sendkit/security/advisories/new).
You should get a response within a week.

## Handling secrets

- Telegram bot tokens grant full control of a bot. Keep them in `.env` (ignored
  by git) or the CLI config file, never in tracked files.
- The remote MCP server receives the bot token in the request URL. Only expose
  it over HTTPS, and make sure your proxy does not log request paths.
- If a token leaks, revoke it immediately with `/revoke` in
  [@BotFather](https://t.me/BotFather).
