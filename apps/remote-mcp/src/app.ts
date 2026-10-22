import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono, type Context } from "hono";
import { generateClerkProtectedResourceMetadata } from "@clerk/mcp-tools/server";
import { registerTelegramTool } from "@sendkit/mcp-tools";

export type AppOptions = {
  clerkPublishableKey: string;
  // Resolves to true when the request carries a valid OAuth bearer token.
  authenticate: (req: Request) => Promise<boolean>;
};

function createServer(botToken: string) {
  const server = new McpServer({
    name: "sendkit-remote",
    version: "0.0.0",
  });

  registerTelegramTool(server, () => botToken);

  return server;
}

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

export function createApp({ clerkPublishableKey, authenticate }: AppOptions) {
  const app = new Hono();

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

    const isAuthenticated = await authenticate(c.req.raw).catch(() => false);
    if (!isAuthenticated) {
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

  return app;
}

// Proxy chains append to these headers ("https, http"); the first entry is the
// one the client actually used.
function forwardedHeader(req: Request, name: string) {
  return req.headers.get(name)?.split(",")[0]?.trim() || undefined;
}

// Rewrites the request URL to the one the client used, so the OAuth metadata
// URLs we advertise point at the public host rather than the listen address.
export function applyForwardedHeaders(req: Request) {
  const url = new URL(req.url);
  url.protocol = forwardedHeader(req, "x-forwarded-proto") ?? url.protocol;
  const forwardedHost = forwardedHeader(req, "x-forwarded-host");
  if (forwardedHost) {
    // Setting `host` without a port keeps the old one, which would leak the
    // internal listen port into the advertised OAuth metadata URLs.
    url.port = "";
    url.host = forwardedHost;
  }

  return new Request(url.toString(), req);
}
