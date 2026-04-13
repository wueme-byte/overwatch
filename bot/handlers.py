import json
import asyncio
from pathlib import Path
from html import escape
from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from telegram.ext import ContextTypes
from telegram.constants import ParseMode
from redis.asyncio import Redis
from orchestrator import NFTOrchestrator
from models import NFTListing
from filters import apply_filters

THEMES: dict = json.loads((Path(__file__).parent.parent / "themes.json").read_text())

MAX_RESULTS = 20


def parse_args(args: list[str]) -> dict:
    """
    Парсит аргументы команды:
      EQD9... 2 --model "Pinkie Cap" --min 500 --max 1000 --attr "Background=Red"
    Возвращает словарь с ключами: address, page, model, min_ton, max_ton, attrs
    """
    result = {
        "address": "",
        "page": 1,
        "model": None,
        "min_ton": None,
        "max_ton": None,
        "attrs": {},        # {"Background": "Red", ...}
    }

    if not args:
        return result

    result["address"] = args[0].strip()

    # нормализуем тире: —model → --model (Telegram иногда заменяет -- на —)
    normalized = []
    for a in args[1:]:
        if a.startswith("—"):
            normalized.append("--" + a[1:])
        else:
            normalized.append(a)

    i = 0
    while i < len(normalized):
        token = normalized[i]

        if token == "--model" and i + 1 < len(normalized):
            result["model"] = normalized[i + 1]
            i += 2
        elif token == "--min" and i + 1 < len(normalized):
            try:
                result["min_ton"] = float(normalized[i + 1])
            except ValueError:
                pass
            i += 2
        elif token == "--max" and i + 1 < len(normalized):
            try:
                result["max_ton"] = float(normalized[i + 1])
            except ValueError:
                pass
            i += 2
        elif token == "--attr" and i + 1 < len(normalized):
            if "=" in normalized[i + 1]:
                key, val = normalized[i + 1].split("=", 1)
                result["attrs"][key.strip()] = val.strip()
            i += 2
        else:
            try:
                result["page"] = max(1, int(token))
            except ValueError:
                pass
            i += 1

    return result



def make_handlers(redis: Redis):
    orchestrator = NFTOrchestrator(redis)

    async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton(
                "Открыть Mini App",
                web_app=WebAppInfo(url="https://wueme-byte.github.io/overwatch/")
            )
        ]])
        await update.message.reply_text(
            "<b>Welcome to Overwatch 👁</b>\n\n"
            "We track Telegram Gift listings across <b>Fragment</b> and <b>GetGems</b> — "
            "so you always see the best available price in one place.\n\n"
            "Open the app below to browse all collections and find the gift you're looking for.",
            parse_mode=ParseMode.HTML,
            reply_markup=keyboard,
        )
        # Старые команды (оставлены для справки):
        # "<b>Поиск по коллекции:</b>\n"
        # "/collection &lt;название&gt; — все листинги коллекции\n"
        # "/collection &lt;название&gt; --model &lt;модель&gt; — фильтр по модели\n"
        # "/collection &lt;название&gt; --min &lt;TON&gt; --max &lt;TON&gt; — фильтр по цене\n\n"
        # "<b>Тематические коллекции:</b>\n"
        # "/theme &lt;название&gt; — обзор темы (лучшая цена по каждому типу)\n"
        # "/theme — список всех доступных тем\n\n"
        # "<i>Примеры:</i>\n"
        # "/collection durov's cap\n"
        # "/collection loot bags --model Liberty\n"
        # "/theme btc\n"
        # "/theme america"

    async def cmd_collection(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not context.args:
            await update.message.reply_text(
                "Usage: /collection &lt;address&gt; [page] [--model name] [--min N] [--max N] [--attr Key=Value]",
                parse_mode=ParseMode.HTML,
            )
            return

        parsed = parse_args(context.args)
        slug = parsed["address"]
        page = parsed["page"]
        model = parsed["model"]
        min_ton = parsed["min_ton"]
        max_ton = parsed["max_ton"]
        attrs = parsed["attrs"]

        msg = await update.message.reply_text(
            "Загружаю листинги... ⏳\n<i>Первый запрос может занять до минуты — данные закешируются.</i>",
            parse_mode=ParseMode.HTML,
        )

        try:
            listings = await orchestrator.fetch_listings(slug)
        except Exception as e:
            await msg.edit_text(f"Error: {e}")
            return

        # применяем фильтры
        filtered = apply_filters(listings, model, min_ton, max_ton, attrs)

        if not filtered:
            hint = ""
            if len(listings) > 0:
                hint = f"\n<i>Всего в коллекции {len(listings)} листингов — попробуй изменить фильтры.</i>"
            await msg.edit_text(
                f"Ничего не найдено по заданным фильтрам.{hint}",
                parse_mode=ParseMode.HTML,
            )
            return

        total = len(filtered)
        total_pages = max(1, (total + MAX_RESULTS - 1) // MAX_RESULTS)
        page = min(page, total_pages)
        start = (page - 1) * MAX_RESULTS
        page_listings = filtered[start:start + MAX_RESULTS]

        # строим заголовок с активными фильтрами
        filter_parts = []
        if model:
            filter_parts.append(f"model: <b>{escape(model)}</b>")
        if min_ton is not None:
            filter_parts.append(f"min: <b>{min_ton} TON</b>")
        if max_ton is not None:
            filter_parts.append(f"max: <b>{max_ton} TON</b>")
        for k, v in attrs.items():
            filter_parts.append(f"{escape(k)}: <b>{escape(v)}</b>")

        header = f"<b>{total} listings</b> <i>(page {page}/{total_pages})</i>"
        if filter_parts:
            header += "\n🔍 " + " · ".join(filter_parts)

        lines = [header + "\n"]
        for i, nft in enumerate(page_listings, start + 1):
            model_tag = f" <i>[{escape(nft.model)}]</i>" if nft.model else ""
            lines.append(
                f'{i}. <a href="{nft.listing_url}">{escape(nft.name)}</a>{model_tag}\n'
                f"   💰 {escape(nft.price_display)} · {nft.marketplace.value}"
            )

        # строим команду для следующей страницы с теми же фильтрами
        if page < total_pages:
            next_cmd = f"/collection {slug} {page + 1}"
            if model:
                next_cmd += f" --model {model}"
            if min_ton is not None:
                next_cmd += f" --min {min_ton}"
            if max_ton is not None:
                next_cmd += f" --max {max_ton}"
            for k, v in attrs.items():
                next_cmd += f" --attr {k}={v}"
            lines.append(f"\nСледующая страница: {next_cmd}")

        await msg.edit_text(
            "\n".join(lines),
            parse_mode=ParseMode.HTML,
            disable_web_page_preview=True,
        )

    async def cmd_models(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Показывает все уникальные модели и атрибуты в коллекции."""
        if not context.args:
            await update.message.reply_text("Usage: /models <address>")
            return

        slug = context.args[0].strip()
        msg = await update.message.reply_text("Загружаю атрибуты...")

        try:
            listings = await orchestrator.fetch_listings(slug)
        except Exception as e:
            await msg.edit_text(f"Error: {e}")
            return

        if not listings:
            await msg.edit_text("Листингов не найдено.")
            return

        # собираем все уникальные модели
        models = sorted(set(l.model for l in listings if l.model))

        # собираем все уникальные ключи атрибутов и их значения
        attr_map: dict[str, set] = {}
        for l in listings:
            for k, v in l.attributes.items():
                attr_map.setdefault(k, set()).add(v)

        lines = [f"<b>Найдено {len(listings)} листингов</b>\n"]

        if models:
            lines.append(f"<b>Модели ({len(models)}):</b>")
            lines.append(", ".join(escape(m) for m in models))
        else:
            lines.append("<i>Поле Model не найдено в атрибутах.</i>")

        if attr_map:
            lines.append(f"\n<b>Все атрибуты:</b>")
            for key, vals in sorted(attr_map.items()):
                vals_str = ", ".join(escape(str(v)) for v in sorted(vals)[:10])
                if len(vals) > 10:
                    vals_str += f" <i>...и ещё {len(vals) - 10}</i>"
                lines.append(f"• <b>{escape(key)}</b>: {vals_str}")
        else:
            lines.append("\n<i>Атрибуты не найдены — возможно TonAPI не вернул metadata.</i>")

        # показываем первый листинг для диагностики
        first = listings[0]
        lines.append(f"\n<b>Пример (первый листинг):</b>")
        lines.append(f"name: {escape(first.name)}")
        lines.append(f"model: {escape(str(first.model))}")
        lines.append(f"attributes: {escape(str(first.attributes))}")

        await msg.edit_text("\n".join(lines), parse_mode=ParseMode.HTML)

    async def cmd_track(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not context.args:
            await update.message.reply_text("Usage: /track <address>")
            return
        address = context.args[0].strip()
        user_id = update.effective_user.id
        await redis.sadd(f"subscriptions:{address}", user_id)
        await redis.sadd(f"user_subs:{user_id}", address)
        await update.message.reply_text(
            f"Подписка оформлена. Уведомлю о новых листингах.",
            parse_mode=ParseMode.HTML,
        )

    async def cmd_untrack(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not context.args:
            await update.message.reply_text("Usage: /untrack <address>")
            return
        address = context.args[0].strip()
        user_id = update.effective_user.id
        await redis.srem(f"subscriptions:{address}", user_id)
        await redis.srem(f"user_subs:{user_id}", address)
        await update.message.reply_text("Подписка отменена.")

    async def cmd_mysubs(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        subs = await redis.smembers(f"user_subs:{user_id}")
        if not subs:
            await update.message.reply_text("У тебя нет активных подписок.")
            return
        lines = ["<b>Твои подписки:</b>"] + [f"• <code>{escape(s)}</code>" for s in sorted(subs)]
        await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.HTML)

    async def cmd_theme(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not context.args:
            names = ", ".join(t["name"] for t in THEMES.values())
            await update.message.reply_text(
                f"Usage: /theme <name>\n\nДоступные темы: {names}",
                parse_mode=ParseMode.HTML,
            )
            return

        query = " ".join(context.args).lower().strip()
        theme = THEMES.get(query)
        if not theme:
            # ищем по частичному совпадению имени
            for key, t in THEMES.items():
                if query in t["name"].lower():
                    theme = t
                    break

        if not theme:
            await update.message.reply_text(f"Тема «{query}» не найдена.")
            return

        msg = await update.message.reply_text(
            f"Загружаю листинги темы <b>{escape(theme['name'])}</b>... ⏳",
            parse_mode=ParseMode.HTML,
        )

        async def fetch_item(item: dict):
            try:
                listings = await orchestrator.fetch_listings(item["collection"])
                return apply_filters(listings, item["model"], None, None, attrs={})
            except Exception as e:
                print(f"[Theme] Error fetching {item['collection']}: {e}")
                return []

        results = await asyncio.gather(*[fetch_item(item) for item in theme["items"]])

        # группируем по коллекции+модели: лучшая цена + количество
        groups: dict[str, dict] = {}
        for batch, item in zip(results, theme["items"]):
            if not batch:
                continue
            key = f"{item['collection']}|{item['model']}"
            best = min(batch, key=lambda l: l.price_ton)
            groups[key] = {
                "collection": item["collection"],
                "model": item["model"],
                "best": best,
                "count": len(batch),
            }

        if not groups:
            await msg.edit_text(f"По теме <b>{escape(theme['name'])}</b> ничего не найдено.", parse_mode=ParseMode.HTML)
            return

        sorted_groups = sorted(groups.values(), key=lambda g: g["best"].price_ton)

        lines = [f"<b>{escape(theme['name'])}</b> — {len(sorted_groups)} типов подарков\n"]
        for i, g in enumerate(sorted_groups, 1):
            nft = g["best"]
            lines.append(
                f'{i}. <a href="{nft.listing_url}">{escape(nft.collection_name)}</a>'
                f' <i>[{escape(g["model"])}]</i>\n'
                f'   💰 от {escape(nft.price_display)} · {nft.marketplace.value} · {g["count"]} в продаже'
            )

        await msg.edit_text(
            "\n".join(lines),
            parse_mode=ParseMode.HTML,
            disable_web_page_preview=True,
        )

    return cmd_start, cmd_collection, cmd_models, cmd_track, cmd_untrack, cmd_mysubs, cmd_theme
