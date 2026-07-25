import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  sendTelegramMessage,
  telegramMessageInputSchema,
  telegramMessageOutputSchema,
} from "sendkit-core";

const server = new McpServer({
  name: "sendkit-local",
  version: "0.0.0",
});

function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is required. Configure it in your MCP client environment.",
    );
  }

  return token;
}

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
        botToken: getTelegramBotToken(),
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout carries the JSON-RPC stream, so all logging has to go to stderr.
  console.error("sendkit local MCP server running on stdio");
}

await main();
