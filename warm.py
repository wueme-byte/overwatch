"""Подогрев коллекций из категории NEW.

Чтобы первый открывший не ждал загрузку с нуля (~27 с у Myth Masks), сервер сам
обновляет эти коллекции раз в WARM_EVERY секунд. Запасная копия (stale, 6 ч) всегда есть,
поэтому список открывается сразу, а свежие данные догружаются в фоне.

Это ЕДИНСТВЕННОЕ место, где задаётся категория NEW (В7): /collections отдаёт по этому
списку поля is_new и new_rank, приложение берёт плашку NEW и порядок оттуда.
Порядок в списке = порядок на экране.
"""
import asyncio
import logging
log = logging.getLogger("Warm")

NEW_COLLECTIONS = ["Hoarse Horses", "Resistance Dogs", "Myth Masks"]
WARM_COLLECTIONS = NEW_COLLECTIONS
WARM_EVERY = 20 * 60


async def warm_loop(orchestrator):
    await asyncio.sleep(15)  # дать API подняться
    while True:
        for name in WARM_COLLECTIONS:
            try:
                listings = await orchestrator.fetch_listings(name, force_refresh=True)
                log.info(f"{name}: {len(listings)} лотов")
            except Exception as e:
                log.warning(f"{name}: {type(e).__name__}: {e!r}")
        await asyncio.sleep(WARM_EVERY)
