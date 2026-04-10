from decimal import Decimal
from models import NFTListing, Marketplace
import time


def make_listing(**kwargs) -> NFTListing:
    defaults = dict(
        uid="getgems:addr1",
        name="Spider #1",
        collection_name="Spider-Man",
        collection_address="EQ...",
        nft_address="addr1",
        price_nano=5_000_000_000,
        price_ton=Decimal("5.00"),
        price_usd=None,
        marketplace=Marketplace.GETGEMS,
        listing_url="https://getgems.io/nft/addr1",
        image_url=None,
        fetched_at=time.time(),
    )
    defaults.update(kwargs)
    return NFTListing(**defaults)


def test_price_display_without_usd():
    listing = make_listing(price_nano=5_000_000_000, price_ton=Decimal("5.00"))
    assert listing.price_display == "5.00 TON"


def test_price_display_with_usd():
    listing = make_listing(
        price_nano=5_000_000_000,
        price_ton=Decimal("5.00"),
        price_usd=Decimal("15.00"),
    )
    assert listing.price_display == "5.00 TON (~$15)"
