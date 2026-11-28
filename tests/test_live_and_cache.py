import asyncio
import json
from decimal import Decimal

from live import tme_slug, is_hidden
from orchestrator import NFTOrchestrator


def test_tme_slug():
    assert tme_slug("Hoarse Horse #9321") == "HoarseHorse-9321"
    assert tme_slug("Durov's Cap #5") == "DurovsCap-5"


def test_is_hidden(make_listing):
    l = make_listing(nft_address="A", price_ton=Decimal("7"))
    assert is_hidden(l, {"b:A"})                       # сгорел — всегда
    assert is_hidden(l, {"s:A:7"})                     # продан по этой цене
    assert not is_hidden(l, {"s:A:8"})                 # снова выставлен по другой цене
    assert not is_hidden(l, set())


def test_memory_cache_reparses_only_on_new_version(make_listing, fake_redis):
    """В1: список разбирается из Redis один раз на версию данных."""
    o = NFTOrchestrator(fake_redis)
    slug = "Myth Masks"
    payload = json.dumps([vars(make_listing(nft_address=str(i))) for i in range(3)], default=str)
    fake_redis.data.update({o._cache_key(slug): payload, o._ver_key(slug): "v1"})

    first = asyncio.run(o.fetch_listings(slug))
    second = asyncio.run(o.fetch_listings(slug))
    assert len(first) == 3 and second is first          # второй раз — из памяти

    fake_redis.data[o._cache_key(slug)] = json.dumps([vars(make_listing(nft_address="x"))], default=str)
    fake_redis.data[o._ver_key(slug)] = "v2"            # пришли свежие данные
    third = asyncio.run(o.fetch_listings(slug))
    assert [l.nft_address for l in third] == ["x"]
