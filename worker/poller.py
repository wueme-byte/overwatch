import asyncio
import json
from redis.asyncio import from_url
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from telegram import Bot
from orchestrator import NFTOrchestrator
from config.settings import settings

bot = Bot(settings.BOT_TOKEN)
redis = from_url(settings.REDIS_URL, decode_responses=True)
orchestrator = NFTOrchestrator(redis)


async def poll_subscriptions():
    sub_keys = await redis.keys("subscriptions:*")
    for key in sub_keys:
        slug = key.removeprefix("subscriptions:")
        subscribers = await redis.smembers(key)
        if not subscribers:
            continue

        try:
            fresh = await orchestrator.fetch_listings(slug, force_refresh=True)
        except Exception as e:
            print(f"[Worker] Error fetching {slug}: {e}")
            continue

        snapshot_key = f"nft:snapshot:{slug}"
        old_raw = await redis.get(snapshot_key)
        old_uids: set[str] = set(json.loads(old_raw)) if old_raw else set()
        current_uids = {l.uid for l in fresh}

        new_listings = [l for l in fresh if l.uid not in old_uids]
        if new_listings:
            text = f"*New listings in* `{slug}`:\n" + "\n".join(
                f"• [{l.name}]({l.listing_url}) — {l.price_display} ({l.marketplace.value})"
                for l in new_listings[:10]
            )
            for user_id in subscribers:
                try:
                    await bot.send_message(
                        int(user_id),
                        text,
                        parse_mode="Markdown",
                        disable_web_page_preview=True,
                    )
                except Exception as e:
                    print(f"[Worker] Failed to notify {user_id}: {e}")

        await redis.setex(snapshot_key, 3600, json.dumps(list(current_uids)))


def run():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        poll_subscriptions,
        "interval",
        seconds=settings.POLL_INTERVAL_SECONDS,
    )
    scheduler.start()
    print(f"Worker started. Polling every {settings.POLL_INTERVAL_SECONDS}s.")
    asyncio.get_event_loop().run_forever()


if __name__ == "__main__":
    run()
