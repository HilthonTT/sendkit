import { z } from "zod";

// Telegram rejects longer messages with "message is too long".
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export const telegramMessageInputSchema = z.object({
  chatId: z.string().min(1, "Chat ID is required"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(
      TELEGRAM_MAX_MESSAGE_LENGTH,
      `Message must be at most ${TELEGRAM_MAX_MESSAGE_LENGTH} characters`,
    ),
});

export const telegramMessageOptionsSchema = telegramMessageInputSchema.extend({
  botToken: z.string().min(1, "Telegram bot token is required"),
});

export const telegramSendMessageResponseSchema = z.object({
  ok: z.boolean(),
  result: z
    .object({
      message_id: z.number(),
    })
    .optional(),
  error_code: z.number().optional(),
  description: z.string().optional(),
});

export const telegramMessageOutputSchema = z.object({
  ok: z.literal(true),
  chatId: z.string(),
  messageId: z.number(),
});

export type TelegramMessageInput = z.infer<typeof telegramMessageInputSchema>;
export type TelegramMessageOptions = z.infer<
  typeof telegramMessageOptionsSchema
>;
export type TelegramMessageOutput = z.infer<typeof telegramMessageOutputSchema>;
