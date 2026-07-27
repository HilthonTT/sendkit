import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  sendTelegramMessage,
  telegramMessageInputSchema,
  telegramMessageOutputSchema,
} from "sendkit-core";

// Resolved per call rather than passed in as a string: the local server reads
// it from the environment and wants a missing token reported as a tool error,
// while the remote server derives it from the request it is currently serving.
export type BotTokenResolver = () => string | Promise<string>;

export function registerTelegramTool(
  server: McpServer,
  resolveBotToken: BotTokenResolver,
) {
  return server.registerTool(
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
          botToken: await resolveBotToken(),
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
}
