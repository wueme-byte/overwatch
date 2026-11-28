"""К4 (подпись Telegram) и В4 (ссылки маркетплейсов)."""
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from fetchers.getgems import _external_marketplace
from models import Marketplace
from stats import verify_init_data

TOKEN = "123456:TEST_TOKEN"


def _signed(fields: dict, token: str = TOKEN) -> str:
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    return urlencode({**fields, "hash": hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()})


def _fields(**kw):
    d = {"auth_date": str(int(time.time())), "query_id": "q", "user": json.dumps({"id": 42, "first_name": "A"})}
    d.update(kw)
    return d


def test_valid_signature_returns_user():
    assert verify_init_data(_signed(_fields()), TOKEN)["id"] == 42


@pytest.mark.parametrize("init_data", [
    _signed(_fields(), token="999:OTHER"),                          # чужой токен
    _signed(_fields()).replace("%22id%22%3A+42", "%22id%22%3A+7"),   # подменили id
    _signed(_fields(auth_date=str(int(time.time()) - 3 * 86400))),  # старше суток
    "garbage", "",
])
def test_bad_init_data_rejected(init_data):
    assert verify_init_data(init_data, TOKEN) is None


@pytest.mark.parametrize("link,market", [
    ("https://t.me/mrkt/app?startapp=abc", Marketplace.MRKT),
    ("https://t.me/portals/market?startapp=gift_1", Marketplace.PORTALS),
    ("https://T.me/MRKT/app", Marketplace.MRKT),
    ("javascript:alert(1)//t.me/mrkt", None),
    ("https://evil.com/t.me/mrkt", None),
    ("http://t.me/mrkt/app", None),
    ("https://t.me.evil.com/mrkt", None),
    ("https://t.me/notmrkt/app", None),
    ("", None),
])
def test_external_marketplace(link, market):
    assert _external_marketplace(link) == market
