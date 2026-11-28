import asyncio
import signal
from telegram.ext import Application, CommandHandler
from bot.handlers import cmd_start
from config.settings import settings


async def run():
    app = Application.builder().token(settings.BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))

    print("Bot started.")
    await app.initialize()
    await app.updater.start_polling()
    await app.start()

    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGINT, stop_event.set)
    loop.add_signal_handler(signal.SIGTERM, stop_event.set)

    await stop_event.wait()

    print("Stopping...")
    await app.updater.stop()
    await app.stop()
    await app.shutdown()


if __name__ == "__main__":
    asyncio.run(run())
