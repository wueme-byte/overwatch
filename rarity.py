"""Официальная редкость моделей подарков (как в Телеграме: «Hue Jester 3%»).

Ни GetGems, ни Fragment её не отдают, но публичная страница t.me/nft/<slug>
показывает её в таблице атрибутов:  <th>Model</th><td>Hue Jester <mark>3%</mark></td>.
Редкость модели внутри коллекции не меняется, поэтому берём одну страницу
на модель и храним ответ в Redis без срока жизни.
"""
import asyncio
import re
import time
from urllib.parse import quote

import aiohttp
from redis.asyncio import Redis

from models.nft import NFTListing
import logging
log = logging.getLogger("Rarity")

KEY = "nft:rarity:{}"          # hash: model -> "3%" или "Rare" (крафтовые)
# t.me ограничивает частые запросы с одного IP: вместо подарка отдаёт заглушку
# «Collectible Gift» без таблицы. Поэтому ходим вежливо: 2 запроса параллельно,
# пауза после каждого, а при заглушке — перерыв COOLDOWN секунд.
CONCURRENCY = 2
PAUSE = 0.4
COOLDOWN = 90
# t.me иногда отдаёт 302 на конкретный подарок (сожжён/скрыт) — пробуем несколько разных
TRIES_PER_MODEL = 5

# в <mark> процент ("3%") или, у крафтовых подарков, уровень редкости ("Rare", "Epic"...)
_MODEL_RE = re.compile(r"<th>Model</th><td>(.*?)\s*<mark>\s*([^<]+?)\s*</mark>", re.S)
_filling: dict[str, asyncio.Task] = {}   # коллекция -> фоновый сбор
_cooldown_until = 0.0                     # до этого времени t.me не трогаем


def gift_slug(name: str) -> str:
    # "Plush Pepe #1654" -> "PlushPepe-1654" (как во фронте для глазика)
    return re.sub(r"[\s']", "", name).replace("#", "-")


async def _fetch_model_pct(session: aiohttp.ClientSession, name: str) -> tuple[str, str | None]:
    """("ok", "3%") | ("missing", None) — этого подарка нет, берём другой |
    ("throttled", None) — t.me притормаживает, надо подождать."""
    url = f"https://t.me/nft/{gift_slug(name)}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), allow_redirects=False) as resp:
            if resp.status != 200:
                return "missing", None   # 302 на telegram.org
            html = await resp.text()
    except Exception:
        return "throttled", None
    finally:
        await asyncio.sleep(PAUSE)
    if "tgme_gift_table" not in html:
        return "throttled", None         # заглушка вместо подарка
    m = _MODEL_RE.search(html)
    if not m:
        return "missing", None
    return "ok", m.group(2)


async def _fill(redis: Redis, collection: str, samples: dict[str, list[str]]) -> None:
    """Фоновый сбор редкости до конца: если t.me притормозил — ждёт паузу и продолжает."""
    while samples:
        wait = _cooldown_until - time.time()
        if wait > 0:
            await asyncio.sleep(wait)
        await _fill_round(redis, collection, samples)
        known = await redis.hgetall(KEY.format(collection))
        left = {m: n for m, n in samples.items() if m not in known}
        if len(left) == len(samples) and time.time() >= _cooldown_until:
            break   # раунд без заглушки и без находок — у оставшихся моделей редкости нет
        samples = left


async def _fill_round(redis: Redis, collection: str, samples: dict[str, list[str]]) -> None:
    """Один проход по моделям; каждую найденную сразу пишет в Redis."""
    global _cooldown_until
    key = KEY.format(collection)
    sem = asyncio.Semaphore(CONCURRENCY)
    stop = asyncio.Event()
    found = 0

    async def one(model: str, names: list[str]):
        nonlocal found
        async with sem:
            for name in names:
                if stop.is_set():
                    return
                status, value = await _fetch_model_pct(session, name)
                if status == "ok":
                    await redis.hset(key, model, value)
                    found += 1
                    return
                if status == "throttled":
                    stop.set()
                    return

    async with aiohttp.ClientSession(headers={"User-Agent": "Mozilla/5.0"}) as session:
        await asyncio.gather(*(one(m, n) for m, n in samples.items()))

    if stop.is_set():
        _cooldown_until = time.time() + COOLDOWN
        log.warning(f"{collection}: +{found}, t.me throttles — pause {COOLDOWN}s")
    elif found < len(samples):
        log.info(f"{collection}: +{found}, no rarity for {len(samples) - found} model(s)")


# ── Основной источник: api.changes.tg ──────────────────────────────────────
# Отдаёт все модели подарка одним запросом с официальной редкостью Telegram
# (rarityPermille), а у крафтовых — уровень (rarityTier: uncommon/rare/epic/
# legendary). Сверено с t.me на Myth Masks: обычные совпали 100 из 101.
# Подарок называется в единственном числе ("Myth Mask") — берём из имени лота.
CHANGES_API = "https://api.changes.tg/models/{}"
CHANGES_RECHECK = 3600            # если в источнике не всё — переспросить не раньше чем через час
DONE_MARK = "__changes"           # служебное поле в hash: источник уже применён
_changes_checked: dict[str, float] = {}


def _fmt_pct(permille: int) -> str:
    return f"{permille / 10:g}%"      # 3 -> "0.3%", 30 -> "3%"


async def _from_changes(gift_name: str) -> tuple[dict[str, str], set[str]] | None:
    """(модель -> "0.3%" | "Legendary", множество крафтовых) или None при сбое."""
    url = CHANGES_API.format(quote(gift_name))
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json(content_type=None)
    except Exception as e:
        log.warning(f"changes.tg {gift_name}: {e}")
        return None
    if not isinstance(data, list):
        return None
    values: dict[str, str] = {}
    crafted: set[str] = set()
    for m in data:
        tier = m.get("rarityTier")
        if m.get("crafted") and tier:
            value = str(tier).capitalize()
        elif isinstance(m.get("rarityPermille"), int):
            value = _fmt_pct(m["rarityPermille"])
        else:
            continue
        for name in {m.get("name"), m.get("telegramName")} - {None, ""}:
            values[name] = value
            if m.get("crafted"):
                crafted.add(name)
    return values, crafted


async def apply_changes(redis: Redis, collection: str, gift_name: str, known: dict[str, str]) -> dict[str, str]:
    """Дописывает редкость из changes.tg: недостающие модели + уровни крафтовых
    (крафтовым заменяет процент, собранный раньше с t.me)."""
    res = await _from_changes(gift_name)
    _changes_checked[collection] = time.time()
    if res is None:
        return known
    values, crafted = res
    update = {m: v for m, v in values.items() if m in crafted or m not in known}
    update[DONE_MARK] = "1"
    await redis.hset(KEY.format(collection), mapping=update)
    known.update(update)
    return known


async def model_rarity(redis: Redis, collection: str, listings: list[NFTListing]) -> dict[str, str]:
    """Сразу отдаёт то, что уже известно. Сначала changes.tg (один запрос на коллекцию),
    недостающее — в фоне со страниц t.me (фронт переспрашивает и видит, как процентов
    становится больше)."""
    key = KEY.format(collection)
    known: dict[str, str] = await redis.hgetall(key)

    models = {l.model for l in listings if l.model}
    missing = models - known.keys()
    recheck_ok = time.time() - _changes_checked.get(collection, 0) > CHANGES_RECHECK
    if listings and (DONE_MARK not in known or (missing and recheck_ok)):
        gift_name = listings[0].name.split(" #")[0].strip()
        known = await apply_changes(redis, collection, gift_name, known)

    # по нескольку представителей на каждую модель, у которой ещё нет цифры
    samples: dict[str, list[str]] = {}
    for l in listings:
        if l.model and l.model not in known:
            names = samples.setdefault(l.model, [])
            if len(names) < TRIES_PER_MODEL:
                names.append(l.name)

    running = _filling.get(collection)
    if samples and (running is None or running.done()):
        task = asyncio.ensure_future(_fill(redis, collection, samples))
        _filling[collection] = task
        task.add_done_callback(lambda t: t.cancelled() or t.exception() and log.warning(f"{collection}: fill failed: {t.exception()}"))
    return {m: v for m, v in known.items() if not m.startswith("__")}


async def load_seed(redis: Redis, path: str = "rarity_seed.json") -> None:
    """При старте API: заранее собранная редкость (seed_rarity.py) → Redis.
    Коллекции, где источник уже применён (есть DONE_MARK), не трогаем."""
    import json, os
    if not os.path.exists(path):
        return
    with open(path) as f:
        seed: dict[str, dict[str, str]] = json.load(f)
    loaded = 0
    for collection, models in seed.items():
        key = KEY.format(collection)
        if await redis.hexists(key, DONE_MARK):
            continue
        await redis.hset(key, mapping={**models, DONE_MARK: "1"})
        loaded += 1
    log.info(f"seed: {len(seed)} collections in file, loaded {loaded}")
