"""Флор (самая дешёвая цена «купить сразу») по каждой коллекции — для карточек на странице Search.

Источник: GetGems /nfts/on-sale/{адрес} — лоты идут от дешёвых к дорогим, и среди них
есть лоты MRKT и Portals (ExternalSale), так что флор общий по трём маркетам.
Плюс маркет внутри Telegram (fetchers/telegram.py): берём минимум из двух.
Fragment не учитывается (он почти никогда не дешевле).
Аукционы и лоты в USDT пропускаем: флор — только фикс-цена в TON.

Фон (floor_loop) обходит все коллекции раз в REFRESH секунд, по одному запросу
в PAUSE секунд — чтобы не съедать лимит GetGems (400 запросов / 5 мин),
который нужен для загрузки лотов.

Redis: hash nft:floor  {имя коллекции: "6.12"}
"""
import asyncio
from decimal import Decimal

import aiohttp
from redis.asyncio import Redis

from config.settings import settings
from fetchers.telegram import telegram_market
import logging
log = logging.getLogger("Floor")

KEY = "nft:floor"
GETGEMS_API = "https://api.getgems.io/public-api/v1"
PAUSE = 1.0
REFRESH = 15 * 60
PEEK = 20  # сколько самых дешёвых лотов смотреть (вдруг первые — аукционы/USDT)


async def _floor_of(session: aiohttp.ClientSession, address: str) -> Decimal | None:
    headers = {"Authorization": f"Bearer {settings.GETGEMS_API_KEY}"} if settings.GETGEMS_API_KEY else {}
    for attempt in range(3):
        async with session.get(f"{GETGEMS_API}/nfts/on-sale/{address}", params={"limit": PEEK},
                               headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status == 429:
                await asyncio.sleep(5 * (attempt + 1))
                continue
            if resp.status != 200:
                log.warning(f"{address[:8]}…: HTTP {resp.status}")
                return None
            items = ((await resp.json()).get("response") or {}).get("items") or []
        prices = [
            int(s.get("fullPrice") or 0)
            for s in (i.get("sale") or {} for i in items)
            if s.get("type") in ("FixPriceSale", "ExternalSale")
            and s.get("currency", "TON") == "TON"
            and int(s.get("fullPrice") or 0) > 0
        ]
        return Decimal(min(prices)) / Decimal(10**9) if prices else None
    return None


async def collect(redis: Redis, collections: list[dict]) -> int:
    done = 0
    async with aiohttp.ClientSession() as session:
        for col in collections:
            name, address = col.get("name", ""), col.get("address", "")
            if not name or not address:
                continue
            try:
                floor = await _floor_of(session, address)
            except Exception as e:
                log.warning(f"{name}: {e!r}")
                floor = None
            # маркет Telegram: если там дешевле — флор оттуда
            try:
                tg = await telegram_market.floor_ton(name)
                if tg is not None and (floor is None or tg < floor):
                    floor = tg
            except Exception as e:
                log.warning(f"{name} (Telegram): {type(e).__name__}: {e!r}")
            if floor is not None:
                await redis.hset(KEY, name, f"{floor.normalize():f}")
                done += 1
            await asyncio.sleep(PAUSE)
    return done


async def get_all(redis: Redis) -> dict[str, float]:
    out = {}
    for k, v in (await redis.hgetall(KEY)).items():
        try:
            out[k] = float(v)
        except ValueError:
            pass
    return out


async def floor_loop(redis: Redis, get_collections) -> None:
    while True:
        try:
            cols = await get_collections()
            n = await collect(redis, cols)
            log.info(f"updated {n}/{len(cols)} collections")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            log.warning(f"loop error: {e!r}")
        await asyncio.sleep(REFRESH)
