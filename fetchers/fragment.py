import re
import time
from decimal import Decimal
from types import SimpleNamespace

from pyfragment.methods.search_gifts import search_gifts as _search_gifts
from pyfragment.types.constants import DEFAULT_TIMEOUT
from models import NFTListing, Marketplace


def _collection_slug(name: str) -> str:
    """Best-effort: 'Durov\'s Cap' → 'durovscap'."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _slug_matches_collection(nft_id: str, col_slug: str) -> bool:
    """Проверяет принадлежность подарка к коллекции по slug.

    Fragment gift slugs: 'durovscap-143', 'evileyestop-55' и т.д.
    Проверяем и col_slug и col_slug без trailing 's' (для 'Durov's Caps' → 'durovscaps' → 'durovscap').
    """
    candidates = {col_slug}
    if col_slug.endswith("s"):
        candidates.add(col_slug[:-1])
    return any(nft_id.startswith(c + "-") for c in candidates)


class FragmentClient:
    """Read-only Fragment gifts client using pyfragment internals.

    Bypasses FragmentClient's constructor validation so that stel_ton_token
    (only needed for purchases) isn't required for search operations.
    """

    def __init__(self, cookies: dict):
        # pyfragment's search_gifts only accesses client.cookies and client.timeout
        self._proxy = SimpleNamespace(cookies=cookies, timeout=DEFAULT_TIMEOUT)

    async def get_listings(self, collection_address: str, collection_name: str = "") -> list[NFTListing]:
        listings: list[NFTListing] = []
        offset = None
        col_slug = _collection_slug(collection_name) if collection_name else None
        # Fragment slugs не имеют trailing 's': "Durov's Caps" → "durovscaps" → "durovscap"
        frag_collection = col_slug.rstrip("s") if col_slug else None
        print(f"[Fragment] starting search: collection={frag_collection!r}")

        while True:
            result = await _search_gifts(
                self._proxy,
                query="",
                collection=frag_collection,
                filter="sale",
                sort="price_asc",
                offset=offset,
            )
            print(f"[Fragment] got {len(result.items)} items, next_offset={result.next_offset}")

            for item in result.items:
                price_str = item.get("price")
                if not price_str:
                    continue
                try:
                    price_ton = Decimal(str(price_str))
                except Exception:
                    continue

                price_nano = int(price_ton * Decimal(10 ** 9))
                slug = item.get("slug", "")
                # slug is "gift/durovscap-1821" → nft_id = "durovscap-1821"
                nft_id = slug[len("gift/"):] if slug.startswith("gift/") else slug
                name = item.get("name", "Unknown")

                # отсеиваем подарки не из нашей коллекции
                if col_slug and not _slug_matches_collection(nft_id, col_slug):
                    continue

                status = item.get("status") or ""
                listings.append(NFTListing(
                    uid=f"fragment:{nft_id}",
                    name=name,
                    collection_name=collection_name or "Fragment Gift",
                    collection_address=collection_address,
                    nft_address=nft_id,
                    price_nano=price_nano,
                    price_ton=price_ton,
                    price_usd=None,
                    marketplace=Marketplace.FRAGMENT,
                    listing_url=f"https://fragment.com/{slug}",
                    image_url=None,
                    attributes={"fragment_status": status} if status else {},
                    fetched_at=time.time(),
                ))

            if result.next_offset is None or result.next_offset == offset:
                break
            offset = result.next_offset

        print(f"[Fragment] total listings: {len(listings)}")
        return listings
