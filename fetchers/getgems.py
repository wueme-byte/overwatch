import time
import asyncio
import aiohttp
from decimal import Decimal
from models import NFTListing, Marketplace

GETGEMS_API = "https://api.getgems.io/public-api/v1"


def _normalize(s: str) -> str:
    """Нижний регистр + нормализация апострофов."""
    return s.lower().replace("\u2019", "'").replace("\u2018", "'")


class GetGemsClient:
    def __init__(self, session: aiohttp.ClientSession, api_key: str = ""):
        self.session = session
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        } if api_key else {"Accept": "application/json"}

    async def search_collection(self, query: str) -> tuple[str, str] | None:
        """Ищет коллекцию по имени среди gift коллекций. Возвращает (address, name) или None.

        Приоритет совпадений: точное → starts with → contains.
        Апострофы нормализуются перед сравнением.
        """
        cursor = None
        query_norm = _normalize(query)

        exact: tuple[str, str] | None = None
        starts: tuple[str, str] | None = None
        contains: tuple[str, str] | None = None

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
                name = col.get("name") or ""
                name_norm = _normalize(name)
                pair = (col["address"], name)

                if name_norm == query_norm:
                    return pair  # точное — сразу возвращаем
                if starts is None and name_norm.startswith(query_norm):
                    starts = pair
                if contains is None and query_norm in name_norm:
                    contains = pair

            if not cursor or len(items) < 100:
                break

        return exact or starts or contains

    async def get_listings(self, collection_address: str, collection_name: str) -> list[NFTListing]:
        listings: list[NFTListing] = []
        cursor = None

        retry_count = 0

        while True:
            params = {"limit": 100}
            if cursor:
                params["after"] = cursor

            async with self.session.get(
                f"{GETGEMS_API}/nfts/on-sale/{collection_address}",
                params=params,
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status == 429:
                    wait = 5 * (2 ** retry_count)
                    print(f"[GetGems] 429 rate limit, waiting {wait}s (attempt {retry_count + 1})")
                    await asyncio.sleep(wait)
                    retry_count += 1
                    continue
                retry_count = 0
                resp.raise_for_status()
                data = await resp.json()

            response = data.get("response", {})
            items = response.get("items") or []
            cursor = response.get("cursor")

            print(f"[GetGems] fetched batch: {len(items)} items, cursor={bool(cursor)}")

            for item in items:
                sale = item.get("sale")
                if not sale:
                    continue

                price_nano = int(sale.get("fullPrice", 0))
                if price_nano == 0:
                    continue

                currency = sale.get("currency", "TON")  # "TON" или "USDT"

                nft_addr = item.get("address", "")
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
                    uid=f"getgems:{nft_addr}",
                    name=name,
                    collection_name=collection_name,
                    collection_address=collection_address,
                    nft_address=nft_addr,
                    price_nano=price_nano,
                    price_ton=price_amount,
                    price_usd=price_amount if currency == "USDT" else None,
                    marketplace=Marketplace.GETGEMS,
                    listing_url=f"https://getgems.io/nft/{nft_addr}",
                    image_url=item.get("image"),
                    fetched_at=time.time(),
                    model=model,
                    attributes=attributes,
                    currency=currency,
                ))

            if not cursor or len(items) < 100:
                break

            await asyncio.sleep(0.2)

        print(f"[GetGems] total listings: {len(listings)}")
        return listings
