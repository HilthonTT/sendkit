import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTelegramTool } from "@sendkit/mcp-tools";

const server = new McpServer({
  name: "sendkit-local",
  version: "0.0.0",
});

registerTelegramTool(server, () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is required. Configure it in your MCP client environment.",
    );
  }

  return token;
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout carries the JSON-RPC stream, so all logging has to go to stderr.
  console.error("sendkit local MCP server running on stdio");
}

await main();
