"""Бот Overwatch: только /start с кнопкой в мини-апп.

В7 (28.11.2026): старые текстовые команды (/collection, /models, /theme, /track,
/untrack, /mysubs) убраны. Ими никто не пользовался (подписок в Redis 0), /track
вообще ничего не присылал — рассылка (worker/) не была запущена. А /collection
ходила в GetGems и Fragment в обход белого списка коллекций API (К3).
Код остался в истории git (до коммита с В7), если понадобится для уведомлений (И1).
"""
from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import ContextTypes
from telegram.constants import ParseMode


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = InlineKeyboardMarkup([
        [
            # Ссылка на Main App, а не web_app: так приложение открывается в режиме
            # из BotFather (Fullscreen), как по синей кнопке меню
            InlineKeyboardButton(
                "Scan Whole Market",
                url="https://t.me/Overwatch_Gifts_bot?startapp&mode=fullscreen",
                style="success"
            )
        ],
    ])
    await update.message.reply_photo(
        photo="https://i.ibb.co/zH57cCsp/Bazaart-D52440-DF-12-C1-46-BC-A420-3-B8-C194-CC627.jpg",
        caption=(
            "<b>Welcome to Overwatch</b>\n\n"
            "We track Telegram Gift listings across <b>Fragment</b> and <b>GetGems</b> — "
            "so you always see the best available price in one place.\n\n"
            "Open the app below to browse all collections and find the gift you're looking for."
        ),
        parse_mode=ParseMode.HTML,
        reply_markup=keyboard,
    )
