"""Подогрев коллекций из категории NEW.

Чтобы первый открывший не ждал загрузку с нуля (~27 с у Myth Masks), сервер сам
обновляет эти коллекции раз в WARM_EVERY секунд. Запасная копия (stale, 6 ч) всегда есть,
поэтому список открывается сразу, а свежие данные догружаются в фоне.

Список должен совпадать с NEW_COLLECTIONS во frontend/src/pages/search/index.jsx
(там подстроки, здесь точные имена коллекций, как их шлёт фронт).
"""
import asyncio

WARM_COLLECTIONS = ["Hoarse Horses", "Resistance Dogs", "Myth Masks"]
WARM_EVERY = 20 * 60


async def warm_loop(orchestrator):
    await asyncio.sleep(15)  # дать API подняться
    while True:
        for name in WARM_COLLECTIONS:
            try:
                listings = await orchestrator.fetch_listings(name, force_refresh=True)
                print(f"[Warm] {name}: {len(listings)} лотов", flush=True)
            except Exception as e:
                print(f"[Warm] {name}: {type(e).__name__}: {e!r}", flush=True)
        await asyncio.sleep(WARM_EVERY)
