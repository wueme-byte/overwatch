"""Маркет Telegram: разбор лота и сопоставление названий (без сети)."""
from decimal import Decimal
from types import SimpleNamespace as NS

from fetchers.telegram import _to_listing, _gift_title_candidates, _norm
from models import Marketplace


def _attr(kind, name):
    return type(kind, (), {"name": name})()


def _amount(kind, amount):
    return type(kind, (), {"amount": amount})()


def _gift(**kw):
    d = dict(slug="MythMask-43880", title="Myth Mask", num=43880, resale_ton_only=True,
             attributes=[_attr("StarGiftAttributeModel", "Red Eye"),
                         _attr("StarGiftAttributeBackdrop", "Navy Blue"),
                         _attr("StarGiftAttributePattern", "Skull")],
             resell_amount=[_amount("StarsAmount", 661), _amount("StarsTonAmount", 10_350_000_000)])
    d.update(kw)
    return NS(**d)


def test_listing_from_telegram_gift():
    l = _to_listing(_gift(), "Myth Masks", "EQcol", 0.0)
    assert l.marketplace == Marketplace.TELEGRAM
    assert l.name == "Myth Mask #43880"
    assert l.price_ton == Decimal("10.35")
    assert l.nft_address == "tg:MythMask-43880"
    assert l.listing_url == "https://t.me/nft/MythMask-43880"
    assert l.model == "Red Eye"
    assert l.attributes["Backdrop"] == "Navy Blue" and l.attributes["Symbol"] == "Skull"
    assert l.attributes["tg_stars"] == 661 and l.attributes["tg_ton_only"] is True


def test_gift_without_ton_price_is_skipped():
    assert _to_listing(_gift(resell_amount=[_amount("StarsAmount", 661)]), "Myth Masks", "EQ", 0.0) is None


def test_collection_name_matches_singular_gift_title():
    cands = _gift_title_candidates("Myth Masks")
    assert _norm("Myth Mask") in cands
    assert _norm("Durov's Cap") in _gift_title_candidates("Durov's Caps")
    assert _norm("Plush Pepe") in _gift_title_candidates("Plush Pepes")
