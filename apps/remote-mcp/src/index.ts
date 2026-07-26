import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import {
  sendTelegramMessage,
  telegramMessageInputSchema,
  telegramMessageOutputSchema,
} from "sendkit-core";

function createServer(botToken: string) {
  const server = new McpServer({
    name: "sendkit-remote",
    version: "0.0.0",
  });

  server.registerTool(
    "telegram",
    {
      title: "Telegram",
      description: "Send a Telegram message.",
      inputSchema: telegramMessageInputSchema.shape,
      outputSchema: telegramMessageOutputSchema.shape,
    },
    async (input) => {
      try {
        const result = await sendTelegramMessage({
          ...input,
          botToken,
        });

        return {
          content: [
            {
              type: "text",
              text: `Sent Telegram message ${result.messageId} to chat ${result.chatId}`,
            },
          ],
          structuredContent: result,
        };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to send Telegram message: ${detail}`,
            },
          ],
        };
      }
    },
  );

  return server;
}

const app = new Hono();

app.post("/:botToken/mcp", async (c) => {
  const botToken = c.req.param("botToken");
  const server = createServer(botToken);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(c.req.raw);
  } finally {
    await server.close();
  }
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: (req: Request) => {
    const url = new URL(req.url);
    url.protocol = req.headers.get("x-forwarded-proto") ?? url.protocol;
    url.host = req.headers.get("x-forwarded-host") ?? url.host;

    return app.fetch(new Request(url, req));
  },
};
