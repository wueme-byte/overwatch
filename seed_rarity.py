"""Разовый сбор редкости моделей для ВСЕХ коллекций → rarity_seed.json.

Редкость модели в Telegram не меняется, поэтому её достаточно собрать один раз.
Файл лежит в репозитории, API при старте загружает его в Redis (load_seed) —
на проде проценты есть сразу, без сбора.

Запуск (внутри контейнера API, чтобы были Redis и ключи):
    docker exec overwatch-api-1 python seed_rarity.py
    docker cp overwatch-api-1:/app/rarity_seed.json .
"""
import asyncio
import json
import re

import aiohttp
from redis.asyncio import from_url

from config.settings import settings
from rarity import KEY, DONE_MARK, apply_changes

SEED_FILE = "rarity_seed.json"
GETGEMS_API = "https://api.getgems.io/public-api/v1"


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower().replace("’", "'"))


async def gift_name_from_getgems(session: aiohttp.ClientSession, address: str) -> str | None:
    """Имя подарка из имени любого лота: "Myth Mask #94303" → "Myth Mask"."""
    headers = {"Authorization": f"Bearer {settings.GETGEMS_API_KEY}"} if settings.GETGEMS_API_KEY else {}
    for path in (f"/nfts/on-sale/{address}", f"/nfts/collection/{address}"):
        async with session.get(f"{GETGEMS_API}{path}", params={"limit": 1}, headers=headers,
                               timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                continue
            items = ((await resp.json()).get("response") or {}).get("items") or []
            if items and "#" in (items[0].get("name") or ""):
                return items[0]["name"].split(" #")[0].strip()
    return None


async def main():
    redis = from_url(settings.REDIS_URL, decode_responses=True)
    collections = json.loads(await redis.get("nft:collections") or "[]")
    if not collections:
        raise SystemExit("Нет кэша коллекций — открой /collections и запусти снова")

    async with aiohttp.ClientSession() as session:
        async with session.get("https://api.changes.tg/gifts", timeout=aiohttp.ClientTimeout(total=15)) as resp:
            gifts: list[str] = await resp.json(content_type=None)
        by_norm = {_norm(g): g for g in gifts}

        seed: dict[str, dict[str, str]] = {}
        unresolved = []
        for col in collections:
            name, address = col["name"], col["address"]
            n = _norm(name)
            # "Myth Masks" → "Myth Mask", "Jingle Bells" → "Jingle Bells", "Hex Pots" → "Hex Pot"
            gift = by_norm.get(n) or by_norm.get(n[:-1]) or by_norm.get(n[:-2])
            if not gift:
                gift = await gift_name_from_getgems(session, address)
                await asyncio.sleep(0.3)
            if not gift:
                unresolved.append(name)
                continue
            known = await redis.hgetall(KEY.format(name))
            known = await apply_changes(redis, name, gift, known)
            await asyncio.sleep(0.2)
            models = {m: v for m, v in known.items() if not m.startswith("__")}
            if DONE_MARK in known and models:
                seed[name] = models
                crafted = sum(1 for v in models.values() if not v.endswith("%"))
                print(f"{name:28} ← {gift:24} моделей {len(models):4}  крафтовых {crafted}")
            else:
                unresolved.append(name)

    with open(SEED_FILE, "w") as f:
        json.dump(seed, f, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"\nГотово: {len(seed)} коллекций в {SEED_FILE}; без данных: {unresolved}")
    await redis.aclose()


if __name__ == "__main__":
    asyncio.run(main())
