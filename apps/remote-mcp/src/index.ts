import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono, type Context } from "hono";
import { createClerkClient } from "@clerk/backend";
import { generateClerkProtectedResourceMetadata } from "@clerk/mcp-tools/server";
import { registerTelegramTool } from "@sendkit/mcp-tools";

const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkPublishableKey) {
  throw new Error("CLERK_PUBLISHABLE_KEY environment variable is required");
}

if (!clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY environment variable is required");
}

const clerkClient = createClerkClient({
  publishableKey: clerkPublishableKey,
  secretKey: clerkSecretKey,
});

function createServer(botToken: string) {
  const server = new McpServer({
    name: "sendkit-remote",
    version: "0.0.0",
  });

  registerTelegramTool(server, () => botToken);

  return server;
}

const app = new Hono();

function protectedResourceMetadataUrl(c: Context, botToken: string) {
  return new URL(
    `/.well-known/oauth-protected-resource/${botToken}/mcp`,
    c.req.url,
  ).toString();
}

function unauthorizedMcpResponse(c: Context, botToken: string) {
  c.header(
    "WWW-Authenticate",
    `Bearer resource_metadata="${protectedResourceMetadataUrl(c, botToken)}"`,
  );
  return c.json({ error: "Unauthorized" }, 401);
}

app.get("/.well-known/oauth-protected-resource/:botToken/mcp", (c) => {
  return c.json(
    generateClerkProtectedResourceMetadata({
      publishableKey: clerkPublishableKey,
      resourceUrl: new URL(
        `/${c.req.param("botToken")}/mcp`,
        c.req.url,
      ).toString(),
    }),
  );
});

app.post("/:botToken/mcp", async (c) => {
  const botToken = c.req.param("botToken");
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorizedMcpResponse(c, botToken);
  }

  try {
    const requestState = await clerkClient.authenticateRequest(c.req.raw, {
      acceptsToken: "oauth_token",
    });

    if (!requestState.isAuthenticated) {
      return unauthorizedMcpResponse(c, botToken);
    }
  } catch {
    return unauthorizedMcpResponse(c, botToken);
  }

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

// Stateless server: there is no standalone SSE stream to open (GET) and no
// session to terminate (DELETE). The spec asks for 405 so clients fall back.
app.on(["GET", "DELETE"], "/:botToken/mcp", (c) => {
  c.header("Allow", "POST");
  return c.json({ error: "Method not allowed" }, 405);
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

const port = Number(process.env.PORT ?? 3000);

// Proxy chains append to these headers ("https, http"); the first entry is the
// one the client actually used.
function forwardedHeader(req: Request, name: string) {
  return req.headers.get(name)?.split(",")[0]?.trim() || undefined;
}

export default {
  port,
  fetch: (req: Request) => {
    const url = new URL(req.url);
    url.protocol = forwardedHeader(req, "x-forwarded-proto") ?? url.protocol;
    const forwardedHost = forwardedHeader(req, "x-forwarded-host");
    if (forwardedHost) {
      // Setting `host` without a port keeps the old one, which would leak the
      // internal listen port into the advertised OAuth metadata URLs.
      url.port = "";
      url.host = forwardedHost;
    }

    return app.fetch(new Request(url.toString(), req));
  },
};
