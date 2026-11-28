import json
import asyncio
import aiohttp
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import from_url
from orchestrator import NFTOrchestrator
from filters import apply_filters
from fetchers.getgems import split_twins
from rarity import model_rarity, load_seed
from supply import load_supply_seed, supply_loop, get_all as get_supply
from floor import floor_loop, get_all as get_floor
from live import live_status, hidden_set, is_hidden
from stats import record as record_visit, verify_init_data
from warm import warm_loop
from config.settings import settings

COLLECTIONS_CACHE_KEY = "nft:collections"
COLLECTIONS_CACHE_TTL = 86400  # 24 часа

THEMES: dict = json.loads(Path("themes.json").read_text())


redis = from_url(settings.REDIS_URL, decode_responses=True)
orchestrator = NFTOrchestrator(redis)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # заранее собранная редкость моделей (rarity_seed.json) — сразу в Redis
    try:
        await load_seed(redis)
    except Exception as e:
        print(f"[Rarity] seed not loaded: {e}", flush=True)
    # supply подарков: файл supply_seed.json → Redis, дальше фон обновляет раз в сутки
    try:
        await load_supply_seed(redis)
    except Exception as e:
        print(f"[Supply] seed not loaded: {e}", flush=True)
    supply_task = asyncio.create_task(supply_loop(redis, _collections_list))
    # флор по коллекциям для карточек на Search — фон, раз в 15 минут
    floor_task = asyncio.create_task(floor_loop(redis, _collections_list))
    # коллекции из NEW держим загруженными, чтобы открывались сразу
    warm_task = asyncio.create_task(warm_loop(orchestrator))
    yield
    supply_task.cancel()
    floor_task.cancel()
    warm_task.cancel()
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
        "nft_address": l.nft_address,
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


async def _canon_collection(name: str) -> str:
    """К3: принимаем только коллекции из нашего списка /collections (по имени или адресу,
    без учёта регистра) и возвращаем каноническое имя. Иначе любой мог бы перебором
    названий гонять запросы к GetGems и платному прокси Fragment и засорять Redis."""
    key = (name or "").strip().lower()
    cols = await _collections_list()
    if not cols:
        return name  # список не загрузился (GetGems лёг) — не блокируем всё приложение
    for c in cols:
        if c["name"].lower() == key or (c.get("address") or "").lower() == key:
            return c["name"]
    raise HTTPException(status_code=404, detail="Unknown collection")


@app.get("/listings")
async def get_listings(
    collection: str = Query(..., description="Имя или адрес коллекции"),
    # можно несколько: ?model=A&model=B — лоты любой из выбранных моделей
    model: list[str] | None = Query(None),
    backdrop: list[str] | None = Query(None),
    min_ton: float | None = Query(None),
    max_ton: float | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    collection = await _canon_collection(collection)
    try:
        listings = await orchestrator.fetch_listings(collection)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # сгоревшие и только что проданные/снятые (см. live.py) не показываем
    hidden = await hidden_set(redis)
    if hidden:
        listings = [l for l in listings if not is_hidden(l, hidden)]

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


class LiveItem(BaseModel):
    address: str
    name: str
    price_ton: str


class LiveCheck(BaseModel):
    collection: str
    items: list[LiveItem] = Field(default_factory=list, max_length=60)


@app.post("/listings/live")
async def listings_live(body: LiveCheck):
    """Какие из карточек на экране сгорели / проданы / сняты: {"status": {адрес: "burned"|"sold"|"gone"}}."""
    body.collection = await _canon_collection(body.collection)
    try:
        listings = await orchestrator.fetch_listings(body.collection)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    status = await live_status(redis, listings, [i.model_dump() for i in body.items])
    return {"status": status}


class Visit(BaseModel):
    event: str = Field(..., pattern="^(open|collection)$")
    collection: str | None = Field(None, max_length=100)
    # Telegram.WebApp.initData — строка, подписанная Telegram ключом нашего бота
    init_data: str | None = Field(None, max_length=4096)


@app.post("/visit")
async def visit(body: Visit, request: Request):
    """Счётчик посетителей (см. stats.py). Ошибки глотаем — статистика не должна ломать приложение.
    К4: кто зашёл, берём только из initData с верной подписью Telegram; без неё — гость по IP."""
    ip = request.headers.get("x-real-ip") or (request.client.host if request.client else None)
    user = verify_init_data(body.init_data, settings.BOT_TOKEN) if body.init_data else None
    collection = None
    if body.event == "collection" and body.collection:
        try:
            collection = await _canon_collection(body.collection)
        except HTTPException:
            return {"ok": True}  # незнакомую коллекцию в статистику не пишем
    try:
        await record_visit(redis, body.event, collection, user, ip, request.headers.get("user-agent"))
    except Exception as e:
        print(f"[Stats] {type(e).__name__}: {e!r}", flush=True)
    return {"ok": True}


@app.get("/rarity")
async def get_rarity(collection: str = Query(...)):
    """Редкость моделей коллекции: {"Hue Jester": "3%", ...}.
    Отдельно от /listings: первый раз собирается несколько секунд, дальше из Redis."""
    collection = await _canon_collection(collection)
    try:
        listings = await orchestrator.fetch_listings(collection)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not listings:
        return {}
    return await model_rarity(redis, listings[0].collection_name, listings)


@app.get("/collections")
async def get_collections():
    collections = await _collections_list()
    # supply и флор подмешиваем при каждом ответе (не в кэш) — свежие числа видны сразу
    supply = await get_supply(redis)
    floor = await get_floor(redis)
    return [{**c, "supply": supply.get(c["name"]), "floor": floor.get(c["name"])} for c in collections]


async def _collections_list():
    cached = await redis.get(COLLECTIONS_CACHE_KEY)
    if cached:
        return json.loads(cached)

    collections = []
    raw_cols: list[dict] = []
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

            raw_cols.extend(items)

            if not cursor or len(items) < 100:
                break

    # двойники (коллекции-копии на релеере GetGems) не показываем:
    # их лоты подмешиваются в основную коллекцию в orchestrator
    mains, _ = split_twins(raw_cols)
    for col in mains:
        sizes = col.get("imageSizes") or {}
        collections.append({
            "name": col.get("name", ""),
            "address": col.get("address", ""),
            "image": sizes.get("352") or sizes.get("96") or col.get("image") or None,
        })

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
