#!/usr/bin/env bun
import { Command } from "commander";
import { sendTelegramMessage } from "@sendkit/core";
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

const configPath = join(homedir(), ".config", "sendkit", "config.json");
const cliConfigSchema = z.object({
  telegramBotToken: z.string().min(1).optional(),
});

// TODO: Not secure, but it'll do for now
function writeTelegramBotToken(token: string) {
  mkdirSync(dirname(configPath), { recursive: true });

  const data = `${JSON.stringify({ telegramBotToken: token }, null, 2)}\n`;
  writeFileSync(configPath, data, {
    mode: 0o600,
  });
  // `mode` only applies when the file is created; tighten an existing one too.
  chmodSync(configPath, 0o600);
}

function getTelegramBotToken() {
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

const program = new Command()
  .name("sendkit")
  .description("Send messages from the command line")
  .showHelpAfterError();

program
  .command("init")
  .description("Configure SendKit CLI local settings")
  .requiredOption("--telegram-bot-token <botToken>", "Telegram bot token")
  .action((options: { telegramBotToken: string }) => {
    writeTelegramBotToken(options.telegramBotToken);
    console.log(`Saved SendKit CLI config to ${configPath}`);
  });

program
  .command("telegram")
  .description("Send a Telegram message")
  .argument("<chatId>", "Telegram chat ID")
  .argument("<message>", "Message text to send")
  .action(async (chatId: string, message: string) => {
    const result = await sendTelegramMessage({
      botToken: getTelegramBotToken(),
      chatId,
      message,
    });

    console.log(JSON.stringify(result));
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
