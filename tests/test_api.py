"""К3 (белый список коллекций) и В7 (NEW отдаёт сервер)."""
import asyncio
import pytest
from fastapi import HTTPException

import api

COLS = [{"name": "Myth Masks", "address": "EQmyth", "image": None},
        {"name": "Plush Pepes", "address": "EQpepe", "image": None}]


@pytest.fixture(autouse=True)
def fixed_collections(monkeypatch):
    async def fake_list():
        return COLS
    async def empty(_redis):
        return {}
    monkeypatch.setattr(api, "_collections_list", fake_list)
    monkeypatch.setattr(api, "get_supply", empty)
    monkeypatch.setattr(api, "get_floor", empty)
    monkeypatch.setattr(api, "NEW_COLLECTIONS", ["Myth Masks"])


@pytest.mark.parametrize("given", ["Myth Masks", "myth masks", "  MYTH MASKS ", "EQmyth"])
def test_known_collection_is_canonicalized(given):
    assert asyncio.run(api._canon_collection(given)) == "Myth Masks"


@pytest.mark.parametrize("given", ["Totally Fake", "x'; DROP", ""])
def test_unknown_collection_rejected(given):
    with pytest.raises(HTTPException) as e:
        asyncio.run(api._canon_collection(given))
    assert e.value.status_code == 404


def test_collections_mark_new():
    got = {c["name"]: (c["is_new"], c["new_rank"]) for c in asyncio.run(api.get_collections())}
    assert got == {"Myth Masks": (True, 0), "Plush Pepes": (False, None)}


def test_internal_error_hides_details():
    e = api._internal_error(RuntimeError("redis://secret:6379"))
    assert e.status_code == 500 and e.detail == "Internal error"


def test_failed_getgems_does_not_cache_empty_list(monkeypatch):
    """В8: если GetGems упал, пустой список не запоминается на сутки."""
    import importlib
    real = importlib.reload(api)          # настоящий _collections_list, без подмены выше
    stored = {}

    class R:
        async def get(self, k): return None
        async def setex(self, k, ttl, v): stored[k] = v

    async def boom(_key=""):
        raise RuntimeError("GetGems 502")
    monkeypatch.setattr(real, "redis", R())
    monkeypatch.setattr(real, "fetch_gift_collections", boom)
    assert asyncio.run(real._collections_list()) == []
    assert stored == {}
