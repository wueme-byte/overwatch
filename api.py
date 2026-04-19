import json
import asyncio
import aiohttp
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import from_url
from orchestrator import NFTOrchestrator
from filters import apply_filters
from config.settings import settings

COLLECTIONS_CACHE_KEY = "nft:collections"
COLLECTIONS_CACHE_TTL = 86400  # 24 часа

THEMES: dict = json.loads(Path("themes.json").read_text())


redis = from_url(settings.REDIS_URL, decode_responses=True)
orchestrator = NFTOrchestrator(redis)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await redis.aclose()


app = FastAPI(title="Overwatch API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _listing_dict(l) -> dict:
    return {
        "name": l.name,
        "model": l.model,
        "collection_name": l.collection_name,
        "price_ton": str(l.price_ton),
        "price_usd": str(l.price_usd) if l.price_usd else None,
        "currency": l.currency,
        "marketplace": l.marketplace.value,
        "listing_url": l.listing_url,
        "image_url": l.image_url,
        "attributes": l.attributes,
    }


@app.get("/listings")
async def get_listings(
    collection: str = Query(..., description="Имя или адрес коллекции"),
    model: str | None = Query(None),
    backdrop: str | None = Query(None),
    min_ton: float | None = Query(None),
    max_ton: float | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    try:
        listings = await orchestrator.fetch_listings(collection)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    model_images: dict[str, str | None] = {}
    all_backdrops: list[str] = []
    seen_backdrops: set[str] = set()
    for l in listings:
        if l.model and l.model not in model_images:
            model_images[l.model] = l.image_url
        b = l.attributes.get("Backdrop")
        if b and b not in seen_backdrops:
            seen_backdrops.add(b)
            all_backdrops.append(b)
    all_models = [{"name": m, "image": model_images[m]} for m in sorted(model_images)]
    all_backdrops.sort()

    filtered = apply_filters(listings, model, min_ton, max_ton, attrs={}, backdrop=backdrop)

    total = len(filtered)
    start = (page - 1) * page_size
    page_items = filtered[start:start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_listing_dict(l) for l in page_items],
        "models": all_models,
        "backdrops": all_backdrops,
    }


@app.get("/collections")
async def get_collections():
    cached = await redis.get(COLLECTIONS_CACHE_KEY)
    if cached:
        return json.loads(cached)

    collections = []
    cursor = None
    headers = {"Accept": "application/json"}
    if settings.GETGEMS_API_KEY:
        headers["Authorization"] = f"Bearer {settings.GETGEMS_API_KEY}"

    async with aiohttp.ClientSession() as session:
        while True:
            params = {"limit": 100}
            if cursor:
                params["after"] = cursor
            async with session.get(
                "https://api.getgems.io/public-api/v1/gifts/collections",
                params=params, headers=headers,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if not resp.ok:
                    body = await resp.text()
                    print(f"[Collections] GetGems error {resp.status}: {body}")
                    break
                data = await resp.json()

            response = data.get("response", {})
            items = response.get("items") or []
            cursor = response.get("cursor")

            for col in items:
                sizes = col.get("imageSizes") or {}
                collections.append({
                    "name": col.get("name", ""),
                    "address": col.get("address", ""),
                    "image": sizes.get("352") or sizes.get("96") or col.get("image") or None,
                })

            if not cursor or len(items) < 100:
                break

    await redis.setex(COLLECTIONS_CACHE_KEY, COLLECTIONS_CACHE_TTL, json.dumps(collections))
    return collections


@app.get("/themes")
async def get_themes():
    return [
        {"id": key, "name": theme["name"], "count": len(theme["items"])}
        for key, theme in THEMES.items()
    ]


@app.get("/themes/{theme_id}/listings")
async def get_theme_listings(
    theme_id: str,
    min_ton: float | None = Query(None),
    max_ton: float | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    theme = THEMES.get(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail=f"Theme '{theme_id}' not found")

    async def fetch_item(item: dict):
        try:
            listings = await orchestrator.fetch_listings(item["collection"])
            return apply_filters(listings, item["model"], None, None, attrs={})
        except Exception as e:
            print(f"[Themes] Error fetching {item['collection']}: {e}")
            return []

    results = await asyncio.gather(*[fetch_item(item) for item in theme["items"]])

    all_listings = [l for batch in results for l in batch]

    # сортируем по price_ton
    all_listings.sort(key=lambda l: l.price_ton)

    if min_ton is not None:
        all_listings = [l for l in all_listings if float(l.price_ton) >= min_ton]
    if max_ton is not None:
        all_listings = [l for l in all_listings if float(l.price_ton) <= max_ton]

    total = len(all_listings)
    start = (page - 1) * page_size
    page_items = all_listings[start:start + page_size]

    return {
        "theme": theme["name"],
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_listing_dict(l) for l in page_items],
    }
