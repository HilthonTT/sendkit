import {
  telegramMessageOptionsSchema,
  telegramMessageOutputSchema,
  telegramSendMessageRequestSchema,
  telegramSendMessageResponseSchema,
  type TelegramMessageOutput,
  type TelegramMessageOptions,
} from "./schemas";

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 15_000;

export async function sendTelegramMessage(
  input: TelegramMessageOptions,
): Promise<TelegramMessageOutput> {
  const parsedInput = telegramMessageOptionsSchema.parse(input);
  const requestBody = telegramSendMessageRequestSchema.parse({
    chat_id: parsedInput.chatId,
    text: parsedInput.message,
  });

  const response = await fetch(
    `${TELEGRAM_API_BASE_URL}/bot${parsedInput.botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

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
    throw new Error(data.description ?? "Telegram message request failed");
  }

  return telegramMessageOutputSchema.parse({
    ok: true,
    chatId: parsedInput.chatId,
    messageId: data.result.message_id,
  });
}
