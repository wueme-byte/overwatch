import os
import time
import asyncio
import json
from collections import OrderedDict
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
COLLECTIONS_CACHE_KEY = "nft:collections"
# Запасная копия листингов: когда свежий кэш (CACHE_TTL) истёк, отдаём её сразу,
# а свежие данные подтягиваем в фоне — чтобы пользователь не ждал полную загрузку.
STALE_TTL = 6 * 3600
# В1: сколько коллекций держать разобранными в памяти процесса (самые недавние).
# Myth Masks ~17 800 лотов — самая крупная; остальные в разы меньше.
MEM_MAX_COLLECTIONS = 12


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
        # В1: slug → (версия данных, готовый список NFTListing). Раньше на КАЖДЫЙ запрос
        # из Redis приходил JSON (у Myth Masks 15 МБ) и разбирался заново: ~0.7–0.85 с
        # на сервере с одним ядром, и всё это время API больше никому не отвечал.
        # Теперь разбираем один раз на каждую новую версию данных.
        self._mem: "OrderedDict[str, tuple[str, list[NFTListing]]]" = OrderedDict()

    def _cache_key(self, slug: str) -> str:
        return f"nft:listings:{slug}"

    def _ver_key(self, slug: str) -> str:
        # метка версии: меняется при каждой записи свежих данных (см. _do_fetch);
        # по ней видно, что разобранная копия в памяти всё ещё актуальна
        return f"nft:listings:ver:{slug}"

    def _mem_put(self, slug: str, ver: str, listings: list[NFTListing]) -> None:
        self._mem[slug] = (ver, listings)
        self._mem.move_to_end(slug)
        while len(self._mem) > MEM_MAX_COLLECTIONS:
            self._mem.popitem(last=False)

    def _stale_key(self, slug: str) -> str:
        return f"nft:listings:stale:{slug}"

    def _start_fetch(self, collection_slug: str) -> asyncio.Task:
        """Запускает загрузку коллекции, если она ещё не идёт; возвращает задачу."""
        task = self._inflight.get(collection_slug)
        if task is None:
            task = asyncio.ensure_future(self._do_fetch(collection_slug))
            self._inflight[collection_slug] = task

            def _done(t: asyncio.Task, slug=collection_slug):
                self._inflight.pop(slug, None)
                if not t.cancelled() and t.exception():
                    print(f"[Orchestrator] Загрузка {slug} упала: {t.exception()}")
            task.add_done_callback(_done)
        return task

    async def _resolve_collection_name(self, gg: GetGemsClient, address: str) -> str:
        """Имя коллекции по адресу: сперва кэш /collections, затем GetGems.

        Fragment ищет подарки по имени коллекции, а не по адресу, поэтому без
        настоящего имени его фетчер бесполезен. Возвращает "" если имя не найдено.
        """
        try:
            cached = await self.redis.get(COLLECTIONS_CACHE_KEY)
            if cached:
                for col in json.loads(cached):
                    if col.get("address") == address:
                        return col.get("name") or ""
        except Exception as e:
            print(f"[Orchestrator] Кэш коллекций недоступен: {e}")

        try:
            return await gg.name_by_address(address)
        except Exception as e:
            print(f"[Orchestrator] Не удалось определить имя коллекции: {e}")
            return ""

    async def _getgems_with_twins(self, gg: GetGemsClient, col_addr: str, display_name: str) -> list[NFTListing]:
        """Лоты GetGems по коллекции плюс лоты её двойников (см. split_twins).

        Сбой основной коллекции пробрасывается, сбой двойника только логируется.
        """
        try:
            twins = await gg.twin_addresses(col_addr)
        except Exception as e:
            print(f"[Orchestrator] Не удалось получить двойников {col_addr[:10]}...: {e}")
            twins = []

        results = await asyncio.gather(
            gg.get_listings(col_addr, display_name),
            *(gg.get_listings(t, display_name, report_address=col_addr) for t in twins),
            return_exceptions=True,
        )
        if isinstance(results[0], Exception):
            raise results[0]

        listings = list(results[0])
        for twin, res in zip(twins, results[1:]):
            if isinstance(res, Exception):
                print(f"[Orchestrator] Двойник {twin[:10]}... не загрузился: {res}")
            else:
                print(f"[Orchestrator] Двойник {twin[:10]}...: +{len(res)} лотов")
                listings.extend(res)
        return listings

    async def fetch_listings(self, collection_slug: str, force_refresh: bool = False) -> list[NFTListing]:
        key = self._cache_key(collection_slug)

        if not force_refresh:
            # одним обращением к Redis: жив ли свежий кэш и какая версия данных
            pipe = self.redis.pipeline()
            pipe.exists(key)
            pipe.get(self._ver_key(collection_slug))
            fresh_alive, ver = await pipe.execute()

            mem = self._mem.get(collection_slug)
            if mem and ver and mem[0] == ver:
                self._mem.move_to_end(collection_slug)
                if not fresh_alive:
                    self._start_fetch(collection_slug)  # копия устарела — обновим в фоне
                return mem[1]

            # в памяти нет или там старая версия — разбираем из Redis (один раз)
            cached = await self.redis.get(key) if fresh_alive else None
            if cached:
                listings = [_deserialize_listing(item) for item in json.loads(cached)]
                if ver:
                    self._mem_put(collection_slug, ver, listings)
                return listings

            # свежего нет — отдаём запасную копию, обновление идёт в фоне
            stale = await self.redis.get(self._stale_key(collection_slug))
            if stale:
                self._start_fetch(collection_slug)
                listings = [_deserialize_listing(item) for item in json.loads(stale)]
                if ver:
                    self._mem_put(collection_slug, ver, listings)
                return listings

        # данных нет совсем (или force_refresh) — ждём загрузку;
        # если она уже идёт для этой коллекции, ждём её же
        if collection_slug in self._inflight:
            print(f"[Orchestrator] Waiting for inflight request: {collection_slug}")
        return await asyncio.shield(self._start_fetch(collection_slug))

    async def _do_fetch(self, collection_slug: str) -> list[NFTListing]:
        key = self._cache_key(collection_slug)
        async with aiohttp.ClientSession() as session:
            gg = GetGemsClient(session, api_key=settings.GETGEMS_API_KEY)

            # если передан адрес — используем напрямую, иначе ищем по имени
            if collection_slug.startswith(("EQ", "UQ")) and len(collection_slug) > 40:
                col_addr = collection_slug
                col_name = await self._resolve_collection_name(gg, col_addr)
            else:
                result = await gg.search_collection(collection_slug)
                if not result:
                    raise ValueError(f"Коллекция «{collection_slug}» не найдена")
                col_addr, col_name = result

            display_name = col_name or col_addr[:10] + "..."

            tasks = [
                self._getgems_with_twins(gg, col_addr, display_name),
                _fetch_ton_price(session),
            ]

            frag_cookies = get_fragment_cookies()
            if not frag_cookies:
                print("[Orchestrator] Fragment cookies not configured — skipping Fragment")
            elif not col_name:
                # без имени Fragment вернёт чужие подарки — лучше пропустить источник
                print(f"[Orchestrator] Имя коллекции {col_addr[:10]}... не определено — Fragment пропущен")
            else:
                frag = FragmentClient(frag_cookies)
                tasks.append(asyncio.wait_for(frag.get_listings(col_addr, col_name), timeout=15.0))

            results = await asyncio.gather(*tasks, return_exceptions=True)

        gg_results = results[0]
        ton_price = results[1] if isinstance(results[1], Decimal) else TON_PRICE_FALLBACK
        frag_results = results[2] if len(results) > 2 else []

        print(f"[Orchestrator] Курс TON: ${ton_price}")

        # Обогащаем Fragment листинги атрибутами из GetGems по совпадению имени
        if not isinstance(gg_results, Exception) and not isinstance(frag_results, Exception):
            gg_attrs_by_name: dict[str, dict] = {
                l.name: l.attributes for l in gg_results if l.attributes.get("Backdrop")
            }
            enriched_frag = []
            for l in frag_results:
                if not l.attributes.get("Backdrop") and l.name in gg_attrs_by_name:
                    gg_a = gg_attrs_by_name[l.name]
                    merged_attrs = {**gg_a, **l.attributes}
                    merged_model = l.model or gg_a.get("Model")
                    l = NFTListing(**{**vars(l), "attributes": merged_attrs, "model": merged_model})
                enriched_frag.append(l)
            frag_results = enriched_frag

        all_listings: list[NFTListing] = []
        for source, result in (("GetGems", gg_results), ("Fragment", frag_results)):
            if isinstance(result, Exception):
                print(f"[Orchestrator] Fetcher error [{source}] ({display_name}): "
                      f"{type(result).__name__}: {result!r}")
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

        payload = json.dumps([vars(l) for l in deduped], default=str)
        ver = f"{time.time():.6f}"
        pipe = self.redis.pipeline()
        pipe.setex(key, CACHE_TTL, payload)
        pipe.setex(self._stale_key(collection_slug), STALE_TTL, payload)
        pipe.setex(self._ver_key(collection_slug), STALE_TTL, ver)
        await pipe.execute()
        # в памяти — копия «как из Redis» (Decimal/Enum те же), чтобы ответы не отличались
        self._mem_put(collection_slug, ver, [_deserialize_listing(i) for i in json.loads(payload)])
        return deduped
