"""Живые статусы лотов, которые сейчас на экране у пользователя.

Фронт раз в несколько секунд присылает адреса показанных карточек, а сервер
отвечает, какие из них пропали и почему:
  burned — подарок сожгли в крафте;
  sold   — продан. Точно — когда GetGems пишет «sold» в истории; для MRKT/Portals
           (их сделки GetGems не видит) — когда подарок жив, но пропал с продажи.
           Иногда это на самом деле снятый лот — пользователь согласился (28.11.2026);
  gone   — снят с продажи (GetGems прямо пишет «cancelSale»).

Откуда знаем:
  * История коллекции GetGems (/v1/collection/history) — события sold / burn /
    cancelSale для лотов на самом GetGems. Один запрос на коллекцию раз в 20 с,
    общий для всех пользователей.
  * Страница t.me/nft/<slug>: у сгоревшего подарка t.me отвечает редиректом на
    telegram.org (у живого — 200). Это нужно для MRKT/Portals: их подарки
    лежат внутри Telegram, в истории GetGems их сжигание не видно, а лот
    после сжигания ещё долго висит в выдаче GetGems.

Пропавшие лоты сервер запоминает в Redis (zset nft:hidden) и больше не отдаёт
в /listings: сгоревшие — навсегда, проданные/снятые — на 30 минут и только
по той же цене (если подарок снова выставят, новый лот покажется).
"""
import asyncio
import json
import time

import aiohttp

from config.settings import settings

GETGEMS_API = "https://api.getgems.io/public-api/v1"

BURNED, SOLD, GONE = "burned", "sold", "gone"

HIDDEN_KEY = "nft:hidden"          # zset: член → до какого времени (unix) скрывать
FOREVER = 4102444800.0             # 2100 год — «навсегда» для сгоревших
HIDE_GONE = 30 * 60                # проданные/снятые прячем на 30 минут
HIST_TTL = 20                      # история коллекции кэшируется на 20 с
ALIVE_TTL = 15 * 60                # «подарок жив» по t.me помним 15 минут
TME_PER_CALL = 4                   # не больше 4 запросов к t.me на один опрос
TME_GAP = 0.5                      # между запросами к t.me не меньше 0.5 с
TME_COOLDOWN = 90                  # t.me начал отказывать — пауза 90 с

_tme_lock = asyncio.Lock()
_tme_last = 0.0
_tme_pause_until = 0.0
_hist_inflight: dict[str, asyncio.Task] = {}


def tme_slug(name: str) -> str:
    """'Hoarse Horse #9321' → 'HoarseHorse-9321' (так же, как глазик на фронте)."""
    return name.replace(" ", "").replace("'", "").replace("#", "-")


def _burned_member(addr: str) -> str:
    return f"b:{addr}"


def _gone_member(addr: str, price_ton: str) -> str:
    return f"g:{addr}:{price_ton}"


def _sold_member(addr: str, price_ton: str) -> str:
    return f"s:{addr}:{price_ton}"


async def hidden_set(redis) -> set[str]:
    """Действующие записи «скрыть лот» (просроченные не берём)."""
    try:
        return set(await redis.zrangebyscore(HIDDEN_KEY, time.time(), "+inf"))
    except Exception as e:
        print(f"[Live] hidden set недоступен: {e}", flush=True)
        return set()


def is_hidden(listing, hidden: set[str]) -> bool:
    price = str(listing.price_ton)
    return (_burned_member(listing.nft_address) in hidden
            or _gone_member(listing.nft_address, price) in hidden
            or _sold_member(listing.nft_address, price) in hidden)


async def _fetch_history(col_addr: str) -> dict[str, str]:
    """Последнее событие по каждому подарку из ~100 свежих событий коллекции."""
    headers = {"Accept": "application/json"}
    if settings.GETGEMS_API_KEY:
        headers["Authorization"] = f"Bearer {settings.GETGEMS_API_KEY}"
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{GETGEMS_API}/collection/history/{col_addr}",
            params={"limit": 100}, headers=headers,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if not resp.ok:
                print(f"[Live] история {col_addr[:10]}...: HTTP {resp.status}", flush=True)
                return {}
            data = await resp.json()
    latest: dict[str, str] = {}
    for ev in (data.get("response") or {}).get("items") or []:   # от новых к старым
        addr = ev.get("address")
        kind = (ev.get("typeData") or {}).get("type")
        if addr and kind and addr not in latest:
            latest[addr] = kind
    return latest


async def _history(redis, col_addr: str) -> dict[str, str]:
    key = f"nft:history:{col_addr}"
    try:
        cached = await redis.get(key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    task = _hist_inflight.get(col_addr)
    if task is None:
        task = asyncio.ensure_future(_fetch_history(col_addr))
        _hist_inflight[col_addr] = task
        task.add_done_callback(lambda t, a=col_addr: _hist_inflight.pop(a, None))
    try:
        latest = await asyncio.shield(task)
    except Exception as e:
        print(f"[Live] история {col_addr[:10]}... не загрузилась: {e}", flush=True)
        return {}
    try:
        await redis.setex(key, HIST_TTL, json.dumps(latest))
    except Exception:
        pass
    return latest


async def _tme_burned(session: aiohttp.ClientSession, name: str) -> bool | None:
    """True — сгорел, False — жив, None — t.me не ответил толком (проверим позже)."""
    global _tme_last, _tme_pause_until
    async with _tme_lock:
        now = time.monotonic()
        if now < _tme_pause_until:
            return None
        if now - _tme_last < TME_GAP:
            await asyncio.sleep(TME_GAP - (now - _tme_last))
        _tme_last = time.monotonic()
        try:
            async with session.get(
                f"https://t.me/nft/{tme_slug(name)}",
                allow_redirects=False,
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                if resp.status == 200:
                    return False
                if resp.status in (301, 302) and "telegram.org" in resp.headers.get("Location", ""):
                    return True
                if resp.status == 429 or resp.status >= 500:
                    _tme_pause_until = time.monotonic() + TME_COOLDOWN
                return None
        except Exception:
            return None


async def live_status(redis, listings, items: list[dict]) -> dict[str, str]:
    """{адрес: burned|sold|gone} для пропавших из показанных `items`.

    items: [{"address", "name", "price_ton"}] — то, что сейчас на экране.
    listings: текущая выдача коллекции (orchestrator.fetch_listings).
    """
    if not items:
        return {}
    present = {l.nft_address: l for l in listings}
    col_addr = listings[0].collection_address if listings else ""
    history = await _history(redis, col_addr) if col_addr else {}
    hidden = await hidden_set(redis)

    result: dict[str, str] = {}
    need_tme: list[tuple[int, dict]] = []      # (приоритет, item): пропавшие проверяем первыми
    for it in items:
        addr = it["address"]
        ev = history.get(addr)
        if _burned_member(addr) in hidden or ev == "burn":
            result[addr] = BURNED
        elif _sold_member(addr, it["price_ton"]) in hidden:
            result[addr] = SOLD
        elif _gone_member(addr, it["price_ton"]) in hidden:
            result[addr] = GONE
        elif ev == "sold":
            result[addr] = SOLD
        elif addr not in present:
            need_tme.append((0, it))           # пропал из выдачи: сгорел или продан/снят?
        elif ev == "cancelSale":
            result[addr] = GONE                # снят, а выдача ещё не обновилась
        else:
            need_tme.append((1, it))           # на месте, но мог сгореть (MRKT/Portals)

    if need_tme:
        # «жив» недавно проверяли — t.me не дёргаем
        need_tme.sort(key=lambda x: x[0])
        keys = [f"nft:tme:alive:{it['address']}" for _, it in need_tme]
        try:
            alive_flags = await redis.mget(keys)
        except Exception:
            alive_flags = [None] * len(keys)
        budget = TME_PER_CALL
        async with aiohttp.ClientSession() as session:
            for (prio, it), alive in zip(need_tme, alive_flags):
                addr = it["address"]
                if alive:
                    if prio == 0:
                        result[addr] = SOLD    # жив, но пропал из выдачи — считаем проданным
                    continue
                if budget <= 0:
                    continue                   # не успели — проверим на следующем опросе
                budget -= 1
                burned = await _tme_burned(session, it["name"])
                if burned is True:
                    result[addr] = BURNED
                elif burned is False:
                    try:
                        await redis.setex(f"nft:tme:alive:{addr}", ALIVE_TTL, "1")
                    except Exception:
                        pass
                    if prio == 0:
                        result[addr] = SOLD

    # запоминаем, чтобы /listings их больше не отдавал
    if result:
        mapping = {}
        for it in items:
            st = result.get(it["address"])
            if st == BURNED:
                mapping[_burned_member(it["address"])] = FOREVER
            elif st == SOLD:
                mapping[_sold_member(it["address"], it["price_ton"])] = time.time() + HIDE_GONE
            elif st == GONE:
                mapping[_gone_member(it["address"], it["price_ton"])] = time.time() + HIDE_GONE
        try:
            await redis.zadd(HIDDEN_KEY, mapping)
            await redis.zremrangebyscore(HIDDEN_KEY, 0, time.time())
        except Exception as e:
            print(f"[Live] не удалось запомнить пропавшие: {e}", flush=True)
    return result
