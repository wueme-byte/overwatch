"""Счётчик посетителей мини-аппа.

Фронт шлёт POST /visit: {event: "open" | "collection", collection?, user?: {id, username, first_name}}.
Кто это — по Telegram id из WebApp; вне Telegram — по IP (web:<ip>).

Redis:
  stats:visitors:<YYYY-MM-DD>   set   id посетителей за день
  stats:cols:<YYYY-MM-DD>       zset  коллекция → сколько раз открыли
  stats:log:<YYYY-MM-DD>        list  события JSON {t, id, event, collection}
  stats:user:<id>               hash  name, username, first_seen, last_seen
Дневные ключи живут 90 дней.

Посмотреть: docker exec overwatch-api-1 python stats.py [дней=4]
"""
import hashlib
import hmac
import json
import sys
import time
from urllib.parse import parse_qsl
from datetime import datetime, timezone, timedelta

DAY_TTL = 90 * 86400
KYIV = timezone(timedelta(hours=2))
MAX_LOG_PER_DAY = 5000


def verify_init_data(init_data: str, bot_token: str, max_age: int = 86400) -> dict | None:
    """Проверка подписи Telegram WebApp initData (core.telegram.org/bots/webapps).
    Подделать нельзя без токена бота. Возвращает user или None."""
    if not init_data or not bot_token:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
        got = pairs.pop("hash", None)
        if not got:
            return None
        check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
        secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        want = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(want, got):
            return None
        if time.time() - int(pairs.get("auth_date", "0")) > max_age:
            return None
        user = json.loads(pairs.get("user", "null"))
        return user if isinstance(user, dict) and isinstance(user.get("id"), int) else None
    except Exception:
        return None


def _day(ts: float | None = None) -> str:
    return datetime.fromtimestamp(ts or time.time(), KYIV).strftime("%Y-%m-%d")


async def record(redis, event: str, collection: str | None, user: dict | None, ip: str | None, ua: str | None):
    now = time.time()
    if user and user.get("id"):
        vid = f"tg:{int(user['id'])}"
    else:
        vid = f"web:{ip or 'unknown'}"
    day = _day(now)

    pipe = redis.pipeline()
    pipe.sadd(f"stats:visitors:{day}", vid)
    pipe.expire(f"stats:visitors:{day}", DAY_TTL)
    if event == "collection" and collection:
        pipe.zincrby(f"stats:cols:{day}", 1, collection[:100])
        pipe.expire(f"stats:cols:{day}", DAY_TTL)
    pipe.rpush(f"stats:log:{day}", json.dumps(
        {"t": int(now), "id": vid, "event": event, "collection": (collection or "")[:100]},
        ensure_ascii=False))
    pipe.ltrim(f"stats:log:{day}", -MAX_LOG_PER_DAY, -1)
    pipe.expire(f"stats:log:{day}", DAY_TTL)

    ukey = f"stats:user:{vid}"
    info = {"last_seen": int(now)}
    if user:
        name = " ".join(x for x in (user.get("first_name"), user.get("last_name")) if x)
        if name:
            info["name"] = name[:100]
        if user.get("username"):
            info["username"] = str(user["username"])[:64]
    if ua:
        info["ua"] = ua[:200]
    pipe.hset(ukey, mapping=info)
    pipe.hsetnx(ukey, "first_seen", int(now))
    pipe.expire(ukey, DAY_TTL)  # К4: не копим записи вечно — 90 дней с последнего захода
    await pipe.execute()


async def report(redis, days: int = 4) -> str:
    out = []
    today = datetime.now(KYIV)
    for i in range(days - 1, -1, -1):
        day = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        visitors = await redis.smembers(f"stats:visitors:{day}")
        out.append(f"\n=== {day}: посетителей {len(visitors)} ===")
        events = [json.loads(x) for x in await redis.lrange(f"stats:log:{day}", 0, -1)]
        for vid in sorted(visitors):
            u = await redis.hgetall(f"stats:user:{vid}")
            who = u.get("name", "")
            if u.get("username"):
                who += f" @{u['username']}"
            mine = [e for e in events if e["id"] == vid]
            cols: dict[str, int] = {}
            for e in mine:
                if e["event"] == "collection" and e["collection"]:
                    cols[e["collection"]] = cols.get(e["collection"], 0) + 1
            times = [datetime.fromtimestamp(e["t"], KYIV).strftime("%H:%M") for e in mine]
            span = f"{times[0]}–{times[-1]}" if times else ""
            col_s = ", ".join(f"{c}×{n}" if n > 1 else c for c, n in cols.items()) or "только главная/поиск"
            out.append(f"  {vid} {who.strip()}  [{span}, заходов {sum(1 for e in mine if e['event'] == 'open')}]")
            out.append(f"      смотрел: {col_s}")
    return "\n".join(out)


if __name__ == "__main__":
    import asyncio
    from redis.asyncio import from_url
    from config.settings import settings

    async def main():
        r = from_url(settings.REDIS_URL, decode_responses=True)
        print(await report(r, int(sys.argv[1]) if len(sys.argv) > 1 else 4))
        await r.aclose()

    asyncio.run(main())
