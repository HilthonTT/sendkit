import {
  telegramMessageOptionsSchema,
  telegramMessageOutputSchema,
  telegramSendMessageResponseSchema,
  type TelegramMessageOutput,
  type TelegramMessageOptions,
} from "./schemas";

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 15_000;

export async function sendTelegramMessage(
  input: TelegramMessageOptions,
): Promise<TelegramMessageOutput> {
  // Zod's default error message is a JSON dump of the issues; callers show
  // this text to people (CLI) and models (MCP), so keep it to one line.
  const parsedInput = telegramMessageOptionsSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new Error(
      parsedInput.error.issues.map((issue) => issue.message).join("; "),
    );
  }
  const { botToken, chatId, message } = parsedInput.data;

  let response: Response;
  try {
    response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text: message }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // The request URL contains the bot token, so never let it leak through a
    // network error message.
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach the Telegram API: ${detail.replaceAll(botToken, "<bot-token>")}`,
    );
  }

  // Telegram answers errors with a JSON body too, but a proxy or an outage can
  // return HTML. Fall back to the status line instead of a JSON parse error.
  const parsedResponse = telegramSendMessageResponseSchema.safeParse(
    await response.json().catch(() => null),
  );

  if (!parsedResponse.success) {
    throw new Error(
      `Unexpected Telegram API response (HTTP ${response.status} ${response.statusText})`,
    );
  }

  const data = parsedResponse.data;
  if (!response.ok || !data.ok || !data.result) {
    const code = data.error_code ?? response.status;
    throw new Error(
      `Telegram API error ${code}: ${data.description ?? "message request failed"}`,
    );
  }

  return telegramMessageOutputSchema.parse({
    ok: true,
    chatId,
    messageId: data.result.message_id,
  });
}
