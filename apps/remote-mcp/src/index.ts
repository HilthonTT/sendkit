import { createClerkClient } from "@clerk/backend";
import { applyForwardedHeaders, createApp } from "./app";

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

const app = createApp({
  clerkPublishableKey,
  authenticate: async (req) => {
    const requestState = await clerkClient.authenticateRequest(req, {
      acceptsToken: "oauth_token",
    });
    return requestState.isAuthenticated;
  },
});

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: (req: Request) => app.fetch(applyForwardedHeaders(req)),
};
