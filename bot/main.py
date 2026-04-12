import asyncio
import signal
from redis.asyncio import from_url
from telegram.ext import Application, CommandHandler
from bot.handlers import make_handlers
from config.settings import settings


async def run():
    redis = from_url(settings.REDIS_URL, decode_responses=True)
    cmd_start, cmd_collection, cmd_models, cmd_track, cmd_untrack, cmd_mysubs, cmd_theme = make_handlers(redis)

    app = Application.builder().token(settings.BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("collection", cmd_collection))
    app.add_handler(CommandHandler("models", cmd_models))
    app.add_handler(CommandHandler("track", cmd_track))
    app.add_handler(CommandHandler("untrack", cmd_untrack))
    app.add_handler(CommandHandler("mysubs", cmd_mysubs))
    app.add_handler(CommandHandler("theme", cmd_theme))

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
