import os
import asyncio
import json
import aiohttp
from decimal import Decimal
from redis.asyncio import Redis
from fetchers import GetGemsClient, FragmentClient
from models import NFTListing, Marketplace
from config.settings import settings, get_fragment_cookies

if settings.FRAGMENT_PROXY:
    os.environ.setdefault("HTTPS_PROXY", settings.FRAGMENT_PROXY)

CACHE_TTL = settings.CACHE_TTL
TON_PRICE_FALLBACK = Decimal("3.0")


async def _fetch_ton_price(session: aiohttp.ClientSession) -> Decimal:
    """Получает курс TON/USD с CoinGecko."""
    try:
        async with session.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "the-open-network", "vs_currencies": "usd"},
            timeout=aiohttp.ClientTimeout(total=5),
        ) as resp:
            data = await resp.json()
            return Decimal(str(data["the-open-network"]["usd"]))
    except Exception as e:
        print(f"[Orchestrator] Не удалось получить курс TON: {e}, используем {TON_PRICE_FALLBACK}$")
        return TON_PRICE_FALLBACK


def _deserialize_listing(item: dict) -> NFTListing:
    """Восстанавливает NFTListing из JSON-кэша, приводя поля к нужным типам."""
    item = dict(item)
    item["price_ton"] = Decimal(item["price_ton"])
    if item.get("price_usd") is not None:
        item["price_usd"] = Decimal(item["price_usd"])
    item["marketplace"] = Marketplace(item["marketplace"])
    return NFTListing(**item)


def _usd_sort_key(listing: NFTListing, ton_price: Decimal) -> Decimal:
    """Приводит цену к USD для единой сортировки TON и USDT лотов."""
    if listing.currency == "USDT":
        return listing.price_ton  # price_ton уже хранит сумму в USDT
    return listing.price_ton * ton_price


class NFTOrchestrator:
    def __init__(self, redis: Redis):
        self.redis = redis
        self._inflight: dict[str, asyncio.Task] = {}

    def _cache_key(self, slug: str) -> str:
        return f"nft:listings:{slug}"

    async def fetch_listings(self, collection_slug: str, force_refresh: bool = False) -> list[NFTListing]:
        key = self._cache_key(collection_slug)

        if not force_refresh:
            cached = await self.redis.get(key)
            if cached:
                raw = json.loads(cached)
                return [_deserialize_listing(item) for item in raw]

        # если уже идёт запрос для этой коллекции — ждём его результата
        if collection_slug in self._inflight:
            print(f"[Orchestrator] Waiting for inflight request: {collection_slug}")
            return await asyncio.shield(self._inflight[collection_slug])

        task = asyncio.ensure_future(self._do_fetch(collection_slug))
        self._inflight[collection_slug] = task
        try:
            return await task
        finally:
            self._inflight.pop(collection_slug, None)

    async def _do_fetch(self, collection_slug: str) -> list[NFTListing]:
        key = self._cache_key(collection_slug)
        async with aiohttp.ClientSession() as session:
            gg = GetGemsClient(session, api_key=settings.GETGEMS_API_KEY)

            # если передан адрес — используем напрямую, иначе ищем по имени
            if collection_slug.startswith(("EQ", "UQ")) and len(collection_slug) > 40:
                col_addr = collection_slug
                col_name = col_addr[:10] + "..."
            else:
                result = await gg.search_collection(collection_slug)
                if not result:
                    raise ValueError(f"Коллекция «{collection_slug}» не найдена")
                col_addr, col_name = result

            tasks = [
                gg.get_listings(col_addr, col_name),
                _fetch_ton_price(session),
            ]

            frag_cookies = get_fragment_cookies()
            if frag_cookies:
                frag = FragmentClient(frag_cookies)
                tasks.append(asyncio.wait_for(frag.get_listings(col_addr, col_name), timeout=15.0))
            else:
                print("[Orchestrator] Fragment cookies not configured — skipping Fragment")

            results = await asyncio.gather(*tasks, return_exceptions=True)

        gg_results = results[0]
        ton_price = results[1] if isinstance(results[1], Decimal) else TON_PRICE_FALLBACK
        frag_results = results[2] if len(results) > 2 else []

        print(f"[Orchestrator] Курс TON: ${ton_price}")

        all_listings: list[NFTListing] = []
        for result in (gg_results, frag_results):
            if isinstance(result, Exception):
                print(f"[Orchestrator] Fetcher error: {result}")
            else:
                all_listings.extend(result)

        seen: dict[str, NFTListing] = {}
        for listing in all_listings:
            addr = listing.nft_address
            if addr not in seen:
                seen[addr] = listing
            elif listing.marketplace == Marketplace.FRAGMENT:
                seen[addr] = listing
            elif seen[addr].marketplace != Marketplace.FRAGMENT and _usd_sort_key(listing, ton_price) < _usd_sort_key(seen[addr], ton_price):
                seen[addr] = listing

        deduped = sorted(seen.values(), key=lambda x: _usd_sort_key(x, ton_price))

        await self.redis.setex(
            key, CACHE_TTL,
            json.dumps([vars(l) for l in deduped], default=str),
        )
        return deduped
