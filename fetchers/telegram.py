"""Маркет перепродажи подарков внутри самого Telegram (покупка за ⭐ / TON).

Читается только обычным аккаунтом Telegram (не ботом): MTProto-метод
payments.getResaleStarGifts. Используется отдельный технический аккаунт Overwatch;
его сессия лежит на сервере в TG_SESSION_DIR (по умолчанию /tg), наружу не выходит.

Бережём аккаунт: один общий клиент на весь API, не чаще одного запроса раз в
MIN_GAP секунд, FLOOD_WAIT до FLOOD_SLEEP секунд пережидаем, больше — отдаём ошибку
(оркестратор тогда возьмёт прошлый удачный ответ).

Берём только самые дешёвые лоты (MAX_LISTINGS): список в приложении отсортирован
по цене, а у крупных коллекций лотов десятки тысяч.
"""
import asyncio
import logging
import os
import re
import time
from decimal import Decimal

from models import NFTListing, Marketplace

log = logging.getLogger("Telegram")

MAX_LISTINGS = 300          # самых дешёвых лотов на коллекцию
PAGE = 100                  # лотов за один запрос
MIN_GAP = 1.2               # секунд между запросами к Telegram (при 0.35 на подсчёте флора ловили FLOOD_WAIT 9–13 с)
FLOOD_SLEEP = 60            # FLOOD_WAIT короче — подождать, длиннее — ошибка
CATALOG_TTL = 6 * 3600      # каталог подарков (название → id) обновляем раз в 6 ч


def _load_env_file(path: str) -> None:
    """KEY=VALUE построчно; уже заданные переменные окружения не трогаем."""
    try:
        with open(path) as f:
            for line in f:
                k, sep, v = line.strip().partition("=")
                if sep and k and not k.startswith("#"):
                    os.environ.setdefault(k, v)
    except OSError:
        pass


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _gift_title_candidates(collection_name: str) -> list[str]:
    """'Myth Masks' → ['mythmasks', 'mythmask', 'mythmas']: в каталоге Telegram
    подарок называется в единственном числе ('Myth Mask', 'Durov's Cap')."""
    n = _norm(collection_name)
    out = [n]
    if n.endswith("es"):
        out.append(n[:-2])
    if n.endswith("s"):
        out.append(n[:-1])
    return out


class TelegramMarket:
    def __init__(self):
        self._client = None
        self._lock = asyncio.Lock()
        self._last = 0.0
        self._catalog: dict[str, int] = {}      # нормализованное название → gift_id
        self._catalog_at = 0.0
        self.enabled = False

    async def start(self) -> None:
        """Запуск при старте API. Нет ключей/сессии — маркет просто выключен."""
        workdir = os.getenv("TG_SESSION_DIR", "/tg")
        _load_env_file(os.path.join(workdir, ".env"))   # TG_API_ID / TG_API_HASH лежат рядом с сессией
        api_id, api_hash = os.getenv("TG_API_ID"), os.getenv("TG_API_HASH")
        session = os.path.join(workdir, "overwatch_market.session")
        if not (api_id and api_hash and os.path.exists(session)):
            log.info("нет ключей или сессии — маркет Telegram выключен")
            return
        try:
            from pyrogram import Client
            self._client = Client(
                "overwatch_market", api_id=int(api_id), api_hash=api_hash,
                workdir=workdir, no_updates=True, sleep_threshold=FLOOD_SLEEP,
            )
            await self._client.start()
            self.enabled = True
            log.info("маркет Telegram подключён")
        except Exception as e:
            log.warning(f"не удалось подключиться: {type(e).__name__}: {e!r}")
            self._client = None

    async def stop(self) -> None:
        if self._client and self.enabled:
            try:
                await self._client.stop()
            except Exception:
                pass
        self.enabled = False

    async def _invoke(self, query):
        """Один запрос к Telegram с паузой между запросами (общей на весь API)."""
        async with self._lock:
            wait = self._last + MIN_GAP - time.monotonic()
            if wait > 0:
                await asyncio.sleep(wait)
            try:
                return await self._client.invoke(query)
            finally:
                self._last = time.monotonic()

    async def _gift_id(self, collection_name: str) -> int | None:
        from pyrogram.raw import functions as F
        if time.time() - self._catalog_at > CATALOG_TTL or not self._catalog:
            cat = await self._invoke(F.payments.GetStarGifts(hash=0))
            self._catalog = {_norm(g.title): g.id for g in cat.gifts if getattr(g, "title", None)}
            self._catalog_at = time.time()
        for cand in _gift_title_candidates(collection_name):
            if cand in self._catalog:
                return self._catalog[cand]
        return None

    async def get_listings(self, collection_address: str, collection_name: str,
                           limit: int = MAX_LISTINGS) -> list[NFTListing]:
        if not self.enabled:
            return []
        from pyrogram.raw import functions as F
        gift_id = await self._gift_id(collection_name)
        if gift_id is None:
            log.info(f"{collection_name}: нет в каталоге Telegram")
            return []

        listings: list[NFTListing] = []
        offset = ""
        now = time.time()
        while len(listings) < limit:
            r = await self._invoke(F.payments.GetResaleStarGifts(
                gift_id=gift_id, offset=offset, limit=min(PAGE, limit - len(listings)), sort_by_price=True,
            ))
            for g in r.gifts:
                lst = _to_listing(g, collection_name, collection_address, now)
                if lst:
                    listings.append(lst)
            offset = r.next_offset or ""
            if not offset or not r.gifts:
                break
        log.info(f"{collection_name}: {len(listings)} лотов (всего на маркете {getattr(r, 'count', '?')})")
        return listings

    async def floor_ton(self, collection_name: str) -> Decimal | None:
        """Самая дешёвая цена коллекции на маркете Telegram (в TON) — для флора."""
        if not self.enabled:
            return None
        from pyrogram.raw import functions as F
        gift_id = await self._gift_id(collection_name)
        if gift_id is None:
            return None
        r = await self._invoke(F.payments.GetResaleStarGifts(gift_id=gift_id, offset="", limit=1, sort_by_price=True))
        for g in r.gifts:
            ton = _ton_price(g)
            if ton is not None:
                return ton
        return None


def _ton_price(g) -> Decimal | None:
    """Цена в TON: Telegram сам отдаёт эквивалент в TON рядом с ценой в ⭐."""
    for a in getattr(g, "resell_amount", None) or []:
        if type(a).__name__ == "StarsTonAmount":
            return Decimal(a.amount) / Decimal(10 ** 9)
    return None


def _to_listing(g, collection_name: str, collection_address: str, now: float) -> NFTListing | None:
    slug = getattr(g, "slug", None)
    price_ton = _ton_price(g)
    if not slug or price_ton is None:
        return None
    attrs: dict = {}
    for a in g.attributes or []:
        kind = type(a).__name__
        name = getattr(a, "name", None)
        if not name:
            continue
        if kind == "StarGiftAttributeModel":
            attrs["Model"] = name
        elif kind == "StarGiftAttributeBackdrop":
            attrs["Backdrop"] = name
        elif kind == "StarGiftAttributePattern":
            attrs["Symbol"] = name
    stars = next((a.amount for a in (g.resell_amount or []) if type(a).__name__ != "StarsTonAmount"), None)
    if stars is not None:
        attrs["tg_stars"] = int(stars)
    if getattr(g, "resale_ton_only", False):
        attrs["tg_ton_only"] = True
    return NFTListing(
        uid=f"telegram:{slug}",
        name=f"{g.title} #{g.num}",
        collection_name=collection_name,
        collection_address=collection_address,
        # у подарка внутри Telegram нет адреса в блокчейне — свой ключ по slug
        nft_address=f"tg:{slug}",
        price_nano=int(price_ton * Decimal(10 ** 9)),
        price_ton=price_ton,
        price_usd=None,
        marketplace=Marketplace.TELEGRAM,
        listing_url=f"https://t.me/nft/{slug}",
        image_url=None,
        model=attrs.get("Model"),
        attributes=attrs,
        fetched_at=now,
    )


# один клиент на весь процесс API
telegram_market = TelegramMarket()
