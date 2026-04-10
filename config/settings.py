import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    TONAPI_KEY: str = os.getenv("TONAPI_KEY", "")
    GETGEMS_API_KEY: str = os.getenv("GETGEMS_API_KEY", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    POLL_INTERVAL_SECONDS: int = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "600"))
    MAX_RESULTS: int = int(os.getenv("MAX_RESULTS", "20"))
    # Fragment session cookies (stel_ton_token is optional — only needed for purchases)
    FRAGMENT_STEL_SSID: str = os.getenv("FRAGMENT_STEL_SSID", "")
    FRAGMENT_STEL_DT: str = os.getenv("FRAGMENT_STEL_DT", "")
    FRAGMENT_STEL_TOKEN: str = os.getenv("FRAGMENT_STEL_TOKEN", "")
    FRAGMENT_STEL_TON_TOKEN: str = os.getenv("FRAGMENT_STEL_TON_TOKEN", "")


settings = Settings()


def get_fragment_cookies() -> dict | None:
    """Returns Fragment cookies dict if the minimum required cookies are set, else None."""
    s = settings
    if not (s.FRAGMENT_STEL_SSID and s.FRAGMENT_STEL_DT and s.FRAGMENT_STEL_TOKEN):
        return None
    cookies = {
        "stel_ssid": s.FRAGMENT_STEL_SSID,
        "stel_dt": s.FRAGMENT_STEL_DT,
        "stel_token": s.FRAGMENT_STEL_TOKEN,
    }
    if s.FRAGMENT_STEL_TON_TOKEN:
        cookies["stel_ton_token"] = s.FRAGMENT_STEL_TON_TOKEN
    return cookies
