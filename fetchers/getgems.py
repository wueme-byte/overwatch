import time
import asyncio
import aiohttp
from decimal import Decimal
from models import NFTListing, Marketplace

GETGEMS_API = "https://api.getgems.io/public-api/v1"

# Параллельная загрузка больших коллекций (см. GetGemsClient.get_listings)
SEQUENTIAL_PAGES = 3          # столько страниц грузим по очереди, прежде чем делить по цене
GG_CONCURRENCY = 6            # одновременных запросов к GetGems на одну загрузку
# границы участков: цена после первых страниц × множитель (у пола лотов гуще всего)
LANE_MULTS = (1.03, 1.07, 1.12, 1.2, 1.3, 1.45, 1.65, 2, 2.6, 3.5, 5, 8, 15, 40)


def _cursor_price(cursor: str | None) -> float | None:
    """Цена из курсора GetGems "2,9.5,41515" → 9.5 (None, если формат другой)."""
    try:
        return float(cursor.split(",")[1])
    except (AttributeError, IndexError, ValueError):
        return None


def _normalize(s: str) -> str:
    """Нижний регистр + нормализация апострофов."""
    return s.lower().replace("\u2019", "'").replace("\u2018", "'")


# \u2500\u2500 \u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u043c\u0430\u0440\u043a\u0435\u0442\u044b \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# GetGems \u043e\u0442\u0434\u0430\u0451\u0442 \u0432 /nfts/on-sale \u0438 \u0447\u0443\u0436\u0438\u0435 \u043b\u043e\u0442\u044b: sale.type == "ExternalSale",
# sale.link \u2014 \u043f\u0440\u044f\u043c\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u043b\u043e\u0442 \u0432 \u043c\u0430\u0440\u043a\u0435\u0442\u0435. fullPrice \u2014 \u0441\u0443\u043c\u043c\u0430 \u0434\u043b\u044f \u043f\u043e\u043a\u0443\u043f\u0430\u0442\u0435\u043b\u044f
# (\u0443 MRKT GetGems \u0443\u0436\u0435 \u043f\u0440\u0438\u0431\u0430\u0432\u0438\u043b \u0435\u0433\u043e 2%, \u0443 Portals \u0446\u0435\u043d\u0430 \u043a\u0430\u043a \u043d\u0430 \u0441\u0430\u043c\u043e\u043c \u043c\u0430\u0440\u043a\u0435\u0442\u0435).
_EXTERNAL_MARKETS = (
    ("t.me/mrkt", Marketplace.MRKT),
    ("t.me/portals", Marketplace.PORTALS),
)


def _external_marketplace(link: str) -> Marketplace | None:
    for prefix, market in _EXTERNAL_MARKETS:
        if prefix in link:
            return market
    return None


# \u2500\u2500 \u041a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u0438-\u0434\u0432\u043e\u0439\u043d\u0438\u043a\u0438 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# \u0423 \u043e\u0431\u044b\u0447\u043d\u043e\u0439 gift-\u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u0438 ownerAddress == address. \u041d\u043e GetGems \u0437\u0430\u0432\u043e\u0434\u0438\u0442 \u0438 \u0441\u0432\u043e\u0438
# \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u0438-\u0434\u0432\u043e\u0439\u043d\u0438\u043a\u0438 (owner \u2014 \u043a\u043e\u0448\u0435\u043b\u0451\u043a GetGems): \u043f\u043e\u0434\u0430\u0440\u043a\u0438, \u043b\u0435\u0436\u0430\u0449\u0438\u0435 \u043d\u0430 \u0435\u0433\u043e \u0440\u0435\u043b\u0435\u0435\u0440\u0435.
# \u041f\u0440\u0438\u043c\u0435\u0440: \u00abMyth Mask\u00bb (76 \u043b\u043e\u0442\u043e\u0432, \u0442\u043e\u043b\u044c\u043a\u043e GetGems) \u043f\u0440\u0438 \u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u00abMyth Masks\u00bb.
# \u0414\u0432\u043e\u0439\u043d\u0438\u043a \u043f\u0440\u044f\u0447\u0435\u0442\u0441\u044f \u0438\u0437 \u0441\u043f\u0438\u0441\u043a\u0430, \u0430 \u0435\u0433\u043e \u043b\u043e\u0442\u044b \u043f\u043e\u0434\u043c\u0435\u0448\u0438\u0432\u0430\u044e\u0442\u0441\u044f \u0432 \u043e\u0441\u043d\u043e\u0432\u043d\u0443\u044e \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u044e.

def _stem(name: str) -> str:
    """\u00abMyth Masks\u00bb \u0438 \u00abMyth Mask\u00bb \u2192 \u00abmyth mask\u00bb."""
    n = _normalize(name).strip()
    return n[:-1] if n.endswith("s") else n


def split_twins(cols: list[dict]) -> tuple[list[dict], dict[str, list[str]]]:
    """\u0414\u0435\u043b\u0438\u0442 \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u0438 \u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0438 \u0434\u0432\u043e\u0439\u043d\u0438\u043a\u0438.

    \u0412\u043e\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 (\u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u0438, {\u0430\u0434\u0440\u0435\u0441 \u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439: [\u0430\u0434\u0440\u0435\u0441\u0430 \u0434\u0432\u043e\u0439\u043d\u0438\u043a\u043e\u0432]}).
    \u041a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u044f, \u0443 \u043a\u043e\u0442\u043e\u0440\u043e\u0439 \u043d\u0435 \u043d\u0430\u0448\u043b\u043e\u0441\u044c \u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u043f\u0430\u0440\u044b, \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044f \u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439.
    """
    def is_own(c: dict) -> bool:
        return not c.get("ownerAddress") or c.get("ownerAddress") == c.get("address")

    main_by_stem = {_stem(c.get("name") or ""): c for c in cols if is_own(c)}
    mains: list[dict] = []
    twins: dict[str, list[str]] = {}
    for c in cols:
        main = None if is_own(c) else main_by_stem.get(_stem(c.get("name") or ""))
        if main is None:
            mains.append(c)
        else:
            twins.setdefault(main["address"], []).append(c["address"])
    return mains, twins


_COLLECTIONS_TTL = 3600
_collections_cache: tuple[float, list[dict]] | None = None


class GetGemsClient:
    def __init__(self, session: aiohttp.ClientSession, api_key: str = ""):
        self.session = session
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        } if api_key else {"Accept": "application/json"}

    async def _iter_collections(self):
        """Постранично отдаёт gift-коллекции GetGems."""
        cursor = None

        while True:
            params = {"limit": 100}
            if cursor:
                params["after"] = cursor

            async with self.session.get(
                f"{GETGEMS_API}/gifts/collections",
                params=params,
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()

            response = data.get("response", {})
            items = response.get("items") or []
            cursor = response.get("cursor")

            for col in items:
                yield col

            if not cursor or len(items) < 100:
                break

    async def _all_collections(self) -> list[dict]:
        """Все gift-коллекции, кэш в памяти процесса на час."""
        global _collections_cache
        if _collections_cache and time.time() - _collections_cache[0] < _COLLECTIONS_TTL:
            return _collections_cache[1]
        cols = [c async for c in self._iter_collections()]
        _collections_cache = (time.time(), cols)
        return cols

    async def _main_collections(self) -> list[dict]:
        return split_twins(await self._all_collections())[0]

    async def twin_addresses(self, main_address: str) -> list[str]:
        """Адреса коллекций-двойников, чьи лоты надо подмешать в main_address."""
        return split_twins(await self._all_collections())[1].get(main_address, [])

    async def search_collection(self, query: str) -> tuple[str, str] | None:
        """Ищет коллекцию по имени среди gift коллекций. Возвращает (address, name) или None.

        Приоритет совпадений: точное → starts with → contains.
        Апострофы нормализуются перед сравнением.
        """
        query_norm = _normalize(query)

        exact: tuple[str, str] | None = None
        starts: tuple[str, str] | None = None
        contains: tuple[str, str] | None = None

        for col in await self._main_collections():
            name = col.get("name") or ""
            name_norm = _normalize(name)
            pair = (col["address"], name)

            if name_norm == query_norm:
                return pair  # точное — сразу возвращаем
            if starts is None and name_norm.startswith(query_norm):
                starts = pair
            if contains is None and query_norm in name_norm:
                contains = pair

        return exact or starts or contains

    async def name_by_address(self, address: str) -> str:
        """Обратный поиск: имя коллекции по её адресу. Пустая строка, если не нашли."""
        for col in await self._all_collections():
            if col.get("address") == address:
                return col.get("name") or ""
        return ""

    def _sem(self) -> asyncio.Semaphore:
        # не больше GG_CONCURRENCY одновременных запросов на клиента — лимит GetGems 400 запросов / 5 мин с IP
        if not hasattr(self, "_semaphore"):
            self._semaphore = asyncio.Semaphore(GG_CONCURRENCY)
        return self._semaphore

    async def _on_sale_page(self, collection_address: str, cursor: str | None) -> tuple[list[dict], str | None]:
        """Одна страница /nfts/on-sale (100 лотов) с повтором при 429."""
        retry_count = 0
        while True:
            params = {"limit": 100}
            if cursor:
                params["after"] = cursor
            async with self._sem():
                async with self.session.get(
                    f"{GETGEMS_API}/nfts/on-sale/{collection_address}",
                    params=params,
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status == 429:
                        wait = 5 * (2 ** retry_count)
                        print(f"[GetGems] 429 rate limit, waiting {wait}s (attempt {retry_count + 1})")
                        retry_count += 1
                        resp_429 = True
                    else:
                        resp_429 = False
                        resp.raise_for_status()
                        data = await resp.json()
            if resp_429:
                await asyncio.sleep(wait)
                continue
            response = data.get("response", {})
            items = response.get("items") or []
            next_cursor = response.get("cursor")
            print(f"[GetGems] fetched batch: {len(items)} items, cursor={bool(next_cursor)}")
            await asyncio.sleep(0.2)
            return items, next_cursor

    async def _on_sale_lane(self, collection_address: str, start: str | None, stop_price: float | None) -> list[dict]:
        """Листает страницы от курсора start, пока цена в курсоре не дойдёт до stop_price
        (None — до конца). Лоты на границе могут попасть и в соседний участок — дубли
        потом убираются по адресу NFT."""
        out: list[dict] = []
        cursor = start
        while True:
            items, cursor = await self._on_sale_page(collection_address, cursor)
            out.extend(items)
            if not cursor or len(items) < 100:
                return out
            if stop_price is not None:
                p = _cursor_price(cursor)
                if p is None or p >= stop_price:
                    return out

    def _parse_items(self, items: list[dict], collection_name: str, report_address: str,
                     listings: list[NFTListing], seen: set[str]) -> None:
        """Превращает сырые лоты GetGems в NFTListing (без повторов по адресу NFT)."""
        for item in items:
            sale = item.get("sale")
            if not sale:
                continue

            price_nano = int(sale.get("fullPrice", 0))
            if price_nano == 0:
                continue

            currency = sale.get("currency", "TON")  # "TON" или "USDT"

            nft_addr = item.get("address", "")
            if nft_addr in seen:
                continue
            seen.add(nft_addr)

            marketplace = Marketplace.GETGEMS
            listing_url = f"https://getgems.io/nft/{nft_addr}"
            if sale.get("type") == "ExternalSale":
                # лот на MRKT/Portals: ведём прямо туда. Незнакомый маркет —
                # оставляем страницу GetGems, кнопка «купить» там перекинет сама
                link = sale.get("link") or ""
                external = _external_marketplace(link)
                if external:
                    marketplace, listing_url = external, link
            name = item.get("name") or "Unknown"
            raw_attrs = item.get("attributes") or []
            attributes = {
                a.get("traitType", ""): a.get("value", "")
                for a in raw_attrs
                if a.get("traitType")
            }
            model = attributes.get("Model") or attributes.get("model") or None

            divisor = Decimal(10**6) if currency == "USDT" else Decimal(10**9)
            price_amount = Decimal(price_nano) / divisor
            # для сортировки храним цену в единых единицах (нано-единицы исходной валюты)
            # USDT-лоты хранятся с price_nano как есть — сортируются отдельно от TON
            listings.append(NFTListing(
                uid=f"{marketplace.value.lower()}:{nft_addr}",
                name=name,
                collection_name=collection_name,
                collection_address=report_address,
                nft_address=nft_addr,
                price_nano=price_nano,
                price_ton=price_amount,
                price_usd=price_amount if currency == "USDT" else None,
                marketplace=marketplace,
                listing_url=listing_url,
                image_url=item.get("image"),
                fetched_at=time.time(),
                model=model,
                attributes=attributes,
                currency=currency,
            ))


    async def get_listings(
        self,
        collection_address: str,
        collection_name: str,
        report_address: str | None = None,
    ) -> list[NFTListing]:
        """Лоты коллекции. report_address — адрес, под которым записать лоты
        (для двойника — адрес основной коллекции).

        GetGems отдаёт лоты по возрастанию цены, курсор вида "2,<цена>,<id>".
        Первые SEQUENTIAL_PAGES страниц грузим по очереди (маленьким коллекциям
        этого хватает). Если лотов больше — делим остаток по цене на участки
        и грузим их параллельно: курсор "2,<цена>,0" начинает выдачу с этой цены.
        """
        report_address = report_address or collection_address
        listings: list[NFTListing] = []
        seen: set[str] = set()

        cursor = None
        for _ in range(SEQUENTIAL_PAGES):
            items, cursor = await self._on_sale_page(collection_address, cursor)
            self._parse_items(items, collection_name, report_address, listings, seen)
            if not cursor or len(items) < 100:
                print(f"[GetGems] total listings: {len(listings)}")
                return listings

        parts = cursor.split(",")
        base = _cursor_price(cursor)
        if len(parts) != 3 or base is None or base <= 0:
            # незнакомый формат курсора — по-старому, страница за страницей
            print(f"[GetGems] unknown cursor format {cursor!r}, sequential fetch")
            lanes = [(cursor, None)]
        else:
            prefix = parts[0]
            bounds = [round(base * m, 6) for m in LANE_MULTS]
            lanes = [(cursor, bounds[0])]
            for i, b in enumerate(bounds):
                stop = bounds[i + 1] if i + 1 < len(bounds) else None
                lanes.append((f"{prefix},{b},0", stop))

        t0 = time.time()
        results = await asyncio.gather(
            *(self._on_sale_lane(collection_address, start, stop) for start, stop in lanes),
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, Exception):
                raise r
        for items in results:
            self._parse_items(items, collection_name, report_address, listings, seen)

        print(f"[GetGems] total listings: {len(listings)} ({len(lanes)} lanes, {time.time() - t0:.1f}s)")
        return listings
