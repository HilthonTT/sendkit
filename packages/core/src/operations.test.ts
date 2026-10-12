import { afterEach, describe, expect, it } from "bun:test";
import { sendTelegramMessage } from "./operations";
import { TELEGRAM_MAX_MESSAGE_LENGTH } from "./schemas";

const originalFetch = globalThis.fetch;

type FetchArgs = Parameters<typeof fetch>;
type FetchCall = { url: string; init: NonNullable<FetchArgs[1]> };

function mockFetch(response: Response) {
  const calls: FetchCall[] = [];

  globalThis.fetch = (async (input: FetchArgs[0], init: FetchArgs[1]) => {
    calls.push({ url: String(input), init: init ?? {} });
    return response;
  }) as typeof fetch;

  return calls;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("sendTelegramMessage", () => {
  it("posts a JSON body to the Telegram API and returns the message id", async () => {
    const calls = mockFetch(
      jsonResponse({ ok: true, result: { message_id: 42 } }),
    );

    const result = await sendTelegramMessage({
      botToken: "test-token",
      chatId: "12345",
      message: "hello",
    });

    expect(result).toEqual({ ok: true, chatId: "12345", messageId: 42 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.telegram.org/bottest-token/sendMessage",
    );
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      chat_id: "12345",
      text: "hello",
    });
  });

  it("throws with the Telegram error code and description when the API rejects the request", async () => {
    mockFetch(
      jsonResponse(
        {
          ok: false,
          error_code: 400,
          description: "Bad Request: chat not found",
        },
        400,
      ),
    );

    await expect(
      sendTelegramMessage({
        botToken: "test-token",
        chatId: "12345",
        message: "hello",
      }),
    ).rejects.toThrow("Telegram API error 400: Bad Request: chat not found");
  });

  it("keeps the bot token out of network error messages", async () => {
    globalThis.fetch = (async (
      input: FetchArgs[0],
      _init: FetchArgs[1],
    ): Promise<Response> => {
      throw new Error(`Unable to connect to ${String(input)}`);
    }) as typeof fetch;

    const error = await sendTelegramMessage({
      botToken: "secret-token",
      chatId: "12345",
      message: "hello",
    }).then(
      () => undefined,
      (e: unknown) => (e instanceof Error ? e.message : String(e)),
    );

    expect(error).toStartWith("Could not reach the Telegram API");
    expect(error).not.toContain("secret-token");
  });

  it("throws a readable error when the response is not Telegram JSON", async () => {
    mockFetch(
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        statusText: "Bad Gateway",
      }),
    );

    await expect(
      sendTelegramMessage({
        botToken: "test-token",
        chatId: "12345",
        message: "hello",
      }),
    ).rejects.toThrow("Unexpected Telegram API response (HTTP 502");
  });

  it("rejects invalid input with a readable message before making a request", async () => {
    const calls = mockFetch(jsonResponse({ ok: true }));

    await expect(
      sendTelegramMessage({
        botToken: "test-token",
        chatId: "",
        message: "hello",
      }),
    ).rejects.toThrow(/^Chat ID is required$/);
    expect(calls).toHaveLength(0);
  });

  it("rejects messages longer than Telegram allows", async () => {
    const calls = mockFetch(jsonResponse({ ok: true }));

    await expect(
      sendTelegramMessage({
        botToken: "test-token",
        chatId: "12345",
        message: "x".repeat(TELEGRAM_MAX_MESSAGE_LENGTH + 1),
      }),
    ).rejects.toThrow(`at most ${TELEGRAM_MAX_MESSAGE_LENGTH} characters`);
    expect(calls).toHaveLength(0);
  });
});
