import { Command } from "commander";
import { sendTelegramMessage } from "sendkit-core";

const program = new Command()
  .name("sendkit")
  .description("SendKit tutorial CLI")
  .showHelpAfterError();

program
  .command("telegram")
  .description("Send a Telegram message")
  .argument("<chatId>", "Telegram chat Id")
  .argument("<message>", "Message text to send")
  .action(async (chatId: string, message: string) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
      process.exit(1);
    }

    try {
      const result = await sendTelegramMessage({
        botToken: token,
        chatId,
        message,
      });

      console.log(`Sent Telegram message to chat ${result.chatId}`);
      console.log(`Telegram message ID: ${result.messageId}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`Telegram API request failed: ${detail}`);
      process.exit(1);
    }
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
