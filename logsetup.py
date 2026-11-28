"""Единая настройка логов (В8): время, уровень и источник в каждой строке.

Уровень задаётся переменной LOG_LEVEL (по умолчанию INFO). DEBUG показывает и мелочи
(каждую пачку лотов GetGems, каждую страницу Fragment).
"""
import logging
import os


def setup_logging() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)-7s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # httpx (через него ходят pyfragment и бот) пишет КАЖДЫЙ запрос, вместе со служебными
    # параметрами сессии Fragment в адресе — это шум и лишнее в логах
    logging.getLogger("httpx").setLevel(logging.WARNING)
