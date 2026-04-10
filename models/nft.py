from dataclasses import dataclass, field
from enum import Enum
from decimal import Decimal
from typing import Optional


class Marketplace(str, Enum):
    GETGEMS = "GetGems"
    FRAGMENT = "Fragment"


@dataclass(frozen=True)
class NFTListing:
    uid: str                        # f"{marketplace}:{nft_address}" — dedup key
    name: str
    collection_name: str
    collection_address: str
    nft_address: str
    price_nano: int                 # price in nanotons (raw)
    price_ton: Decimal              # price_nano / 1e9
    price_usd: Optional[Decimal]
    marketplace: Marketplace
    listing_url: str
    image_url: Optional[str]
    fetched_at: float               # unix timestamp
    model: Optional[str] = None    # вариация внутри коллекции (Pinkie Cap, Macintosh...)
    attributes: dict = field(default_factory=dict)  # все атрибуты из metadata
    currency: str = "TON"          # "TON" или "USDT"

    @property
    def price_display(self) -> str:
        if self.currency == "USDT":
            return f"{self.price_ton:.2f} USDT"
        ton = f"{self.price_ton:.2f} TON"
        if self.price_usd:
            return f"{ton} (~${self.price_usd:.0f})"
        return ton
