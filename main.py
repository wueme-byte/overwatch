import asyncio
from dotenv import load_dotenv

load_dotenv()

from bot.main import run

if __name__ == "__main__":
    asyncio.run(run())
