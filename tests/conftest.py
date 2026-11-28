import time
from decimal import Decimal
import pytest
from models import NFTListing, Marketplace


@pytest.fixture
def make_listing():
    def _make(**kw):
        d = dict(uid="getgems:a1", name="Myth Mask #1", collection_name="Myth Masks",
                 collection_address="EQcol", nft_address="a1", price_nano=5_000_000_000,
                 price_ton=Decimal("5"), price_usd=None, marketplace=Marketplace.GETGEMS,
                 listing_url="https://getgems.io/nft/a1", image_url=None, fetched_at=time.time())
        d.update(kw)
        return NFTListing(**d)
    return _make


class FakeRedis:
    """Минимальная подмена Redis для тестов: get/setex/exists/pipeline."""
    def __init__(self):
        self.data = {}

    async def get(self, k):
        return self.data.get(k)

    async def setex(self, k, ttl, v):
        self.data[k] = v

    async def exists(self, k):
        return int(k in self.data)

    def pipeline(self):
        r, ops = self, []

        class P:
            def __getattr__(self, name):
                return lambda *a: ops.append((name, a)) or self

            async def execute(self):
                return [await getattr(r, n)(*a) for n, a in ops]
        return P()


@pytest.fixture
def fake_redis():
    return FakeRedis()
