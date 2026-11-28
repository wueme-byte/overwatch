"""Supply подарка — сколько всего выпущено (Telegram: «135 120/181 231 issued» → 181231).

Ни GetGems, ни changes.tg этого не отдают, источник — публичная страница
t.me/nft/<Slug>-<номер>, строка Quantity.

Как устроено (как с редкостью):
- supply_seed.json в репозитории — грузится в Redis при старте API (load_supply_seed),
  на проде цифры есть сразу;
- фоновый цикл (supply_loop) раз в сутки обходит все коллекции и обновляет числа
  (у подарков, которые ещё продаются, выпуск растёт), новые коллекции дописывает сам.
  Ходит медленно, по одному запросу, чтобы t.me не включал заглушку.

Redis: hash nft:supply  {имя коллекции: число}
"""
import asyncio
import json
import re
from pathlib import Path

import aiohttp
from redis.asyncio import Redis

from config.settings import settings
import logging
log = logging.getLogger("Supply")

KEY = "nft:supply"
SEED_FILE = "supply_seed.json"
GETGEMS_API = "https://api.getgems.io/public-api/v1"

PAUSE = 1.5            # между запросами к t.me
COOLDOWN = 90          # t.me отдал заглушку — ждём
REFRESH_EVERY = 86400  # полный обход раз в сутки

_QTY = re.compile(r"<th>Quantity</th><td>([^<]*)")


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower().replace("’", "'"))


def _slug(gift: str) -> str:
    # "B-Day Candle" → "BDayCandle", "Durov's Cap" → "DurovsCap"
    return re.sub(r"[^A-Za-z0-9]", "", gift)


async def _gift_names(session: aiohttp.ClientSession) -> dict[str, str]:
    """Имена подарков в ед. числе (как в ссылках t.me): норма → имя."""
    async with session.get("https://api.changes.tg/gifts", timeout=aiohttp.ClientTimeout(total=15)) as resp:
        gifts: list[str] = await resp.json(content_type=None)
    return {_norm(g): g for g in gifts}


async def _gift_from_getgems(session: aiohttp.ClientSession, address: str) -> str | None:
    """Запасной путь: имя подарка из имени любого лота ("Myth Mask #94303" → "Myth Mask")."""
    headers = {"Authorization": f"Bearer {settings.GETGEMS_API_KEY}"} if settings.GETGEMS_API_KEY else {}
    try:
        async with session.get(f"{GETGEMS_API}/nfts/on-sale/{address}", params={"limit": 1},
                               headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                return None
            items = ((await resp.json()).get("response") or {}).get("items") or []
    except Exception:
        return None
    name = (items[0].get("name") or "") if items else ""
    return name.split(" #")[0].strip() if "#" in name else None


async def _fetch_supply(session: aiohttp.ClientSession, gift: str) -> tuple[str, int | None]:
    """("ok", 181231) | ("missing", None) | ("throttled", None).
    Конкретный номер может быть сожжён/скрыт (302) — пробуем несколько."""
    for num in (1, 2, 3, 10, 100):
        url = f"https://t.me/nft/{_slug(gift)}-{num}"
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), allow_redirects=False) as resp:
                if resp.status == 302:
                    continue
                html = await resp.text()
        except Exception:
            continue
        m = _QTY.search(html)
        if not m:
            # 200 без таблицы — заглушка «Collectible Gift», t.me притормаживает
            return "throttled", None
        total = m.group(1).split("/")[-1]
        digits = re.sub(r"\D", "", total)
        return ("ok", int(digits)) if digits else ("missing", None)
    return "missing", None


async def collect(redis: Redis, collections: list[dict], only_missing: bool = False) -> dict[str, int]:
    """Обойти коллекции и записать supply в Redis. Возвращает то, что собрали."""
    known = await redis.hgetall(KEY)
    found: dict[str, int] = {}
    async with aiohttp.ClientSession() as session:
        try:
            by_norm = await _gift_names(session)
        except Exception as e:
            log.warning(f"changes.tg gifts: {e}")
            by_norm = {}

        for col in collections:
            name, address = col.get("name", ""), col.get("address", "")
            if not name or (only_missing and name in known):
                continue
            n = _norm(name)
            # "Myth Masks" → "Myth Mask", "Hex Pots" → "Hex Pot", "Jingle Bells" как есть
            gift = by_norm.get(n) or by_norm.get(n[:-1]) or by_norm.get(n[:-2]) \
                or await _gift_from_getgems(session, address)
            if not gift:
                log.warning(f"{name}: gift name not resolved")
                continue

            for _ in range(5):
                status, value = await _fetch_supply(session, gift)
                if status != "throttled":
                    break
                log.warning(f"t.me throttles — pause {COOLDOWN}s")
                await asyncio.sleep(COOLDOWN)

            if status == "ok":
                found[name] = value
                await redis.hset(KEY, name, value)
            else:
                log.info(f"{name} ({gift}): {status}")
            await asyncio.sleep(PAUSE)
    return found


async def get_all(redis: Redis) -> dict[str, int]:
    return {k: int(v) for k, v in (await redis.hgetall(KEY)).items() if v.isdigit()}


async def load_supply_seed(redis: Redis, path: str = SEED_FILE) -> None:
    """Заранее собранные числа → Redis (свежие из Redis не затираем)."""
    p = Path(path)
    if not p.exists():
        return
    seed: dict[str, int] = json.loads(p.read_text())
    known = await redis.hgetall(KEY)
    missing = {k: v for k, v in seed.items() if k not in known}
    if missing:
        await redis.hset(KEY, mapping=missing)
    log.info(f"seed: {len(seed)} in file, {len(missing)} added")


async def supply_loop(redis: Redis, get_collections) -> None:
    """Фон: сразу дописать недостающие, дальше раз в сутки обновить все."""
    first = True
    while True:
        try:
            cols = await get_collections()
            got = await collect(redis, cols, only_missing=first)
            log.info(f"updated {len(got)} collections")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            log.warning(f"loop error: {e}")
        first = False
        await asyncio.sleep(REFRESH_EVERY)
