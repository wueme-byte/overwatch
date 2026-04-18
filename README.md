# Overwatch

Агрегатор листингов Telegram Gifts. Собирает данные с **GetGems** и **Fragment** параллельно, дедуплицирует по лучшей цене и отображает через Telegram Bot и Telegram Mini App.

**Live:** https://overwatchgifts.help  
**Bot:** @Overwatch_Gifts_bot  
**Channel:** @overwatch_gifts

---

## Возможности

- Поиск листингов по любой коллекции подарков
- Фильтрация по модели, цене, атрибутам
- Лучшая цена из двух маркетплейсов (GetGems + Fragment)
- Пометка аукционных листингов Fragment
- Кэширование в Redis (10 минут)
- Подписки на новые листинги с уведомлениями в Telegram
- Тематические подборки (BTC, America, Pokemon, Ladybug)

---

## Структура проекта

```
overwatch/
├── api.py                  # FastAPI REST API для фронтенда
├── orchestrator.py         # Бизнес-логика: fetch, дедупликация, кэш
├── filters.py              # Фильтрация листингов
├── themes.json             # Конфиг тематических коллекций
│
├── fetchers/
│   ├── getgems.py          # Клиент GetGems API
│   └── fragment.py         # Клиент Fragment.com (через pyfragment)
│
├── models/
│   └── nft.py              # NFTListing dataclass, Marketplace enum
│
├── config/
│   └── settings.py         # Переменные окружения
│
├── bot/
│   ├── main.py             # Инициализация и запуск бота
│   └── handlers.py         # Обработчики команд
│
├── worker/
│   └── poller.py           # Фоновый мониторинг подписок
│
├── frontend/               # Telegram Mini App (React + Vite)
│   └── src/
│       ├── api/            # Обращения к бэкенду
│       └── pages/          # Home, Search, Themes
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example

frontend/src/pages/
├── home/           # главная (карусель карточек)
├── search/         # поиск коллекций + листинги
├── themes/         # заглушка "Coming soon"
└── desktop/        # экран для десктоп-браузеров
```

---

## Переменные окружения

Скопируй `.env.example` → `.env` и заполни:

| Переменная | Обязательно | Описание |
|---|---|---|
| `BOT_TOKEN` | ✅ | Токен от @BotFather |
| `REDIS_URL` | ✅ | `redis://localhost:6379` |
| `FRAGMENT_STEL_SSID` | ✅ | Cookie с fragment.com |
| `FRAGMENT_STEL_DT` | ✅ | Cookie с fragment.com |
| `FRAGMENT_STEL_TOKEN` | ✅ | Cookie с fragment.com |
| `HTTPS_PROXY` | — | Residential прокси для Fragment (только api контейнер) |
| `GETGEMS_API_KEY` | — | Bearer токен GetGems |
| `TONAPI_KEY` | — | TON API ключ |
| `CACHE_TTL` | — | TTL кэша листингов в сек (default: 600) |
| `POLL_INTERVAL_SECONDS` | — | Интервал проверки подписок (default: 30) |
| `FRAGMENT_STEL_TON_TOKEN` | — | Cookie Fragment (только для покупок) |

**Как получить Fragment cookies:**
1. Открой `fragment.com`, залогинься через Telegram
2. DevTools → Application → Cookies → fragment.com
3. Скопируй `stel_ssid`, `stel_dt`, `stel_token`

> ⚠️ Cookies периодически протухают. При ошибке 403 — повтори процедуру.

---

## API Endpoints

### `GET /listings`
Листинги коллекции с фильтрацией и пагинацией.

| Параметр | Тип | Описание |
|---|---|---|
| `collection` | string | Название или адрес коллекции |
| `model` | string | Фильтр по модели |
| `min_ton` | float | Минимальная цена TON |
| `max_ton` | float | Максимальная цена TON |
| `page` | int | Номер страницы (default: 1) |
| `page_size` | int | Размер страницы (default: 20, max: 500) |

**Ответ:**
```json
{
  "total": 150,
  "page": 1,
  "page_size": 15,
  "models": ["Classic", "Jade", "Golden"],
  "items": [{ "name": "...", "price_ton": "45.50", "marketplace": "Fragment", ... }]
}
```

### `GET /collections`
Список всех коллекций (кэш 1 час).

### `GET /themes`
Список тематических подборок.

### `GET /themes/{theme_id}/listings`
Листинги по теме, отсортированные по цене.

---

## Команды бота

| Команда | Описание |
|---|---|
| `/start` | Приветствие + кнопка открыть Mini App |
| `/collection <название>` | Все листинги коллекции |
| `/collection <название> --model <модель>` | Фильтр по модели |
| `/collection <название> --min <N> --max <N>` | Фильтр по цене TON |
| `/collection <название> --attr Key=Value` | Фильтр по атрибуту |
| `/models <название>` | Все модели и атрибуты коллекции |
| `/theme <название>` | Лучшие цены по теме |
| `/theme` | Список всех тем |
| `/track <адрес>` | Подписка на новые листинги |
| `/untrack <адрес>` | Отписка |
| `/mysubs` | Активные подписки |

**Примеры:**
```
/collection durov's cap
/collection durov's cap --model Jade --min 50 --max 500
/theme btc
/track EQD9Pc-lIKJBpS...
```

---

## Локальная разработка

### Требования
- Python 3.12+
- Node.js 18+
- Redis или Docker

### Бэкенд

```bash
# 1. Создать venv и установить зависимости
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Настроить переменные
cp .env.example .env
# Заполнить .env

# 3. Запустить Redis
redis-server
# или через Docker:
docker run -d -p 6379:6379 redis:7-alpine

# 4. Запустить API (терминал 1)
uvicorn api:app --reload --port 8001

# 5. Запустить бота (терминал 2)
python -m bot.main
```

### Фронтенд

```bash
cd frontend

# Установить зависимости
npm install

# Запустить dev сервер
npm run dev
# → http://localhost:5173/
# на десктопе добавь ?dev: http://localhost:5173/?dev
```

> По умолчанию фронт ходит на `http://localhost:8001`. Можно переопределить через `VITE_API_URL` в `frontend/.env`.

---

## Продакшен

### Запуск через Docker Compose

```bash
# Запустить всё (redis + api + bot)
docker compose up -d

# Пересобрать после изменений в коде
docker compose up -d --build api

# Логи
docker logs overwatch-api-1 -f
docker logs overwatch-bot-1 -f

# Сбросить кэш Redis
docker exec overwatch-redis-1 redis-cli FLUSHALL

# Перезапустить сервис
docker compose restart api
docker compose restart bot
```

### Фронтенд (GitHub Pages + custom domain)

```bash
cd frontend
npm run build
# dist/ автоматически деплоится через GitHub Actions на gh-pages ветку
# Домен: overwatchgifts.help (CNAME файл в frontend/public/CNAME)
```

---

## Как работает дедупликация

Если один и тот же NFT выставлен на обоих маркетплейсах — показывается только один листинг. Приоритет: **Fragment** побеждает GetGems. Если NFT только на GetGems — показывается GetGems версия.

## Fragment на VPS

Fragment блокирует запросы с IP датацентров (Cloudflare Bot Management). Решение — residential proxy (IPRoyal).

Добавить в `.env` на сервере:
```env
HTTPS_PROXY=http://user:pass@geo.iproyal.com:12321
```

> ⚠️ `HTTPS_PROXY` должен быть **только** в `.env`, **не** в `docker-compose.yml`.  
> В `docker-compose.yml` для `bot` сервиса прокси явно сбрасывается (`HTTPS_PROXY=`), иначе запросы к Telegram API пойдут через прокси и упадут.

## pyfragment

Версия закреплена в `requirements.txt` на `2026.1.0`. **Не менять** — новые версии изменили API и ломают наш Fragment клиент.

## Desktop блокировка

На десктопе Mini App показывает заглушку `pages/desktop/`. Детектится по `hover: hover` + ширина > 768px.  
Для локальной разработки на десктопе: `http://localhost:5173/?dev`

## Бот

**@Overwatch_Gifts_bot** — основной бот.  
`/start` открывает Mini App через WebApp кнопку.  
Канал: @overwatch_gifts (кнопка скрыта пока канал маленький).
