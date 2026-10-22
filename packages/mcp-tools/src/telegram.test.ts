import { afterEach, describe, expect, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTelegramTool, type BotTokenResolver } from "./telegram";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function connect(resolveBotToken: BotTokenResolver) {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerTelegramTool(server, resolveBotToken);

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return client;
}

describe("telegram MCP tool", () => {
  it("sends the message with the resolved bot token", async () => {
    let requestedUrl = "";
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      requestedUrl = String(input);
      return Response.json({ ok: true, result: { message_id: 7 } });
    }) as typeof fetch;

    const client = await connect(async () => "resolved-token");
    const result = await client.callTool({
      name: "telegram",
      arguments: { chatId: "12345", message: "hello" },
    });

    expect(requestedUrl).toContain("/botresolved-token/");
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      ok: true,
      chatId: "12345",
      messageId: 7,
    });
  });

  it("reports a missing bot token as a tool error", async () => {
    const client = await connect(() => {
      throw new Error("TELEGRAM_BOT_TOKEN is required.");
    });
    const result = await client.callTool({
      name: "telegram",
      arguments: { chatId: "12345", message: "hello" },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to send Telegram message: TELEGRAM_BOT_TOKEN is required.",
      },
    ]);
  });
});
