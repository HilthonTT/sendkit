import { z } from "zod";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

export const configPath = join(homedir(), ".config", "sendkit", "config.json");

const cliConfigSchema = z.object({
  telegramBotToken: z.string().min(1).optional(),
});

// TODO: Not secure, but it'll do for now
export function writeTelegramBotToken(token: string) {
  mkdirSync(dirname(configPath), { recursive: true });

  const data = `${JSON.stringify({ telegramBotToken: token }, null, 2)}\n`;
  writeFileSync(configPath, data, {
    mode: 0o600,
  });
  // `mode` only applies when the file is created; tighten an existing one too.
  chmodSync(configPath, 0o600);
}

export function getTelegramBotToken() {
  if (!existsSync(configPath)) {
    throw new Error("Telegram bot token is required. Run `sendkit init`.");
  }

  let config: z.infer<typeof cliConfigSchema>;
  try {
    config = cliConfigSchema.parse(JSON.parse(readFileSync(configPath, "utf8")));
  } catch {
    throw new Error(
      `Invalid config at ${configPath}. Run \`sendkit init\` to recreate it.`,
    );
  }

  const token = config.telegramBotToken;
  if (!token) {
    throw new Error("Telegram bot token is required. Run `sendkit init`.");
  }

  return token;
}
