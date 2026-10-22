import { describe, expect, it } from "bun:test";
import { applyForwardedHeaders, createApp } from "./app";

const clerkPublishableKey = `pk_test_${btoa("example.clerk.accounts.dev$")}`;

function appWithAuth(isAuthenticated: boolean) {
  return createApp({
    clerkPublishableKey,
    authenticate: async () => isAuthenticated,
  });
}

function initializeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/123:ABC/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "0.0.0" },
      },
    }),
  });
}

describe("remote MCP app", () => {
  it("challenges requests without a bearer token", async () => {
    const response = await appWithAuth(true).fetch(initializeRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/123:ABC/mcp"',
    );
  });

  it("challenges requests whose bearer token fails authentication", async () => {
    const response = await appWithAuth(false).fetch(
      initializeRequest({ Authorization: "Bearer bad" }),
    );

    expect(response.status).toBe(401);
  });

  it("treats an authentication error as unauthenticated", async () => {
    const app = createApp({
      clerkPublishableKey,
      authenticate: async () => {
        throw new Error("Clerk unavailable");
      },
    });

    const response = await app.fetch(
      initializeRequest({ Authorization: "Bearer good" }),
    );

    expect(response.status).toBe(401);
  });

  it("serves MCP to authenticated requests", async () => {
    const response = await appWithAuth(true).fetch(
      applyForwardedHeaders(initializeRequest({ Authorization: "Bearer good" })),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { serverInfo: { name: string } };
    };
    expect(body.result.serverInfo.name).toBe("sendkit-remote");
  });

  it("advertises protected resource metadata for the bot's MCP URL", async () => {
    const response = await appWithAuth(true).fetch(
      new Request(
        "http://localhost:3000/.well-known/oauth-protected-resource/123:ABC/mcp",
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      resource: string;
      authorization_servers: string[];
    };
    expect(body.resource).toBe("http://localhost:3000/123:ABC/mcp");
    expect(body.authorization_servers).toEqual([
      "https://example.clerk.accounts.dev",
    ]);
  });

  it("rejects GET and DELETE with 405", async () => {
    const app = appWithAuth(true);

    for (const method of ["GET", "DELETE"]) {
      const response = await app.fetch(
        new Request("http://localhost:3000/123:ABC/mcp", { method }),
      );
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("POST");
    }
  });
});

describe("applyForwardedHeaders", () => {
  it("uses the first forwarded protocol and host and drops the listen port", () => {
    const req = applyForwardedHeaders(
      new Request("http://localhost:3000/123:ABC/mcp", {
        headers: {
          "X-Forwarded-Proto": "https, http",
          "X-Forwarded-Host": "sendkit.example.com, internal",
        },
      }),
    );

    expect(req.url).toBe("https://sendkit.example.com/123:ABC/mcp");
  });

  it("leaves the URL alone without forwarded headers", () => {
    const req = applyForwardedHeaders(
      new Request("http://localhost:3000/123:ABC/mcp"),
    );

    expect(req.url).toBe("http://localhost:3000/123:ABC/mcp");
  });
});
