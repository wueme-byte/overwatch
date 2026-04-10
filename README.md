# Overwatch — NFT Listing Bot

Telegram бот для мониторинга листингов Telegram-подарков (NFT gifts) с GetGems и Fragment.
Показывает листинги по коллекции и модели, отсортированные по цене в USD.

---

## Что умеет

- `/collection durov's cap` — все листинги коллекции
- `/collection durov's cap --model jade` — листинги конкретной модели
- `/collection durov's cap --min 10 --max 100` — фильтр по цене (TON)
- `/collection durov's cap --attr Background=Red` — фильтр по атрибуту
- `/models durov's cap` — все модели и атрибуты коллекции
- `/track` / `/untrack` / `/mysubs` — подписки на новые листинги

Данные берутся параллельно с GetGems и Fragment, дедуплицируются и сортируются по USD.

---

## Структура проекта

```
overwatch/
├── main.py                  # Точка входа — запускает бота
│
├── bot/
│   ├── main.py              # Инициализация бота, регистрация хендлеров, Redis подключение
│   └── handlers.py          # Команды бота (/collection, /track, /untrack, /mysubs, /models)
│                            # parse_args()   — парсит --model, --min, --max, --attr из сообщения
│                            # apply_filters() — фильтрует список листингов по параметрам
│
├── orchestrator.py          # Главный мозг
│                            # fetch_listings(slug) — запрашивает GetGems + Fragment параллельно
│                            # Дедупликация по nft_address (берёт дешевле если NFT на двух площадках)
│                            # Сортировка по USD (курс TON берёт с CoinGecko в реальном времени)
│                            # Кэш в Redis: TTL 600s, ключ nft:listings:{slug}
│
├── fetchers/
│   ├── getgems.py           # GetGems Public API (Bearer токен)
│   │                        # search_collection() — ищет коллекцию по имени среди gift коллекций
│   │                        # get_listings()      — пагинация по 100, все атрибуты и модели
│   └── fragment.py          # Fragment через pyfragment (обход валидации через SimpleNamespace)
│                            # Возвращает ~60 листингов (лимит Fragment API)
│                            # Пагинация: break если next_offset не меняется
│
├── models/
│   └── nft.py               # NFTListing dataclass — все поля одного листинга:
│                            #   name, model, collection_name, collection_address
│                            #   price_nano, price_ton, price_usd, currency (TON/USDT)
│                            #   marketplace, listing_url, image_url, attributes{}
│                            # Marketplace enum: GETGEMS | FRAGMENT
│
├── config/
│   └── settings.py          # Настройки из .env: BOT_TOKEN, GETGEMS_API_KEY, REDIS_URL,
│                            # CACHE_TTL (600s), Fragment cookies
│
├── tests/
│   └── test_models.py       # Базовые тесты моделей
│
├── .env.example             # Шаблон переменных окружения
└── requirements.txt         # Зависимости
```

---

## Зависимости

| Библиотека | Назначение |
|---|---|
| python-telegram-bot 21.5 | Telegram Bot API |
| aiohttp | Async HTTP запросы к GetGems / CoinGecko |
| redis[asyncio] | Кэш листингов (TTL 600s) |
| apscheduler | Планировщик фоновых задач |
| python-dotenv | Загрузка .env |
| pyfragment | Fragment API клиент |

---

## Запуск

```bash
# 1. Активировать venv
source venv/bin/activate

# 2. Заполнить .env (скопировать из .env.example)
cp .env.example .env

# 3. Убедиться что Redis запущен
redis-cli ping  # → PONG

# 4. Запустить
python main.py
```

Убить процесс:
```bash
kill -9 $(pgrep -f "python main.py")
```

---

## Ключевые технические детали

- **USDT цены**: GetGems возвращает `currency="USDT"`, делитель `10^6` (не `10^9` как у TON)
- **Fragment slug**: из имени коллекции убираем не-alphanum + `rstrip('s')` → `"Durov's Caps"` → `"durovscap"`
- **Fragment пост-фильтр**: проверяем что `nft_id` начинается с `col_slug` + `"-"`
- **Redis десериализация**: `price_ton` → `Decimal`, `marketplace` → `Marketplace` enum (функция `_deserialize_listing`)
- **Fragment таймаут**: `asyncio.wait_for(..., timeout=45.0)` в оркестраторе

---

## Планы (в разработке)

- FastAPI слой поверх оркестратора (REST API для Mini App)
- Telegram Mini App (React фронт)
- Тематические коллекции (`GET /themes/america/listings`)
- Фоновое обновление кэша (без ожидания первого запроса)
