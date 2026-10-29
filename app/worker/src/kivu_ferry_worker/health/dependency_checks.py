import asyncio

import psycopg
import redis.asyncio
import redis.exceptions

from kivu_ferry_worker.config import Settings

# A hanging dependency must not hang /readyz: it always answers within a second.
CHECK_TIMEOUT_SECONDS = 0.5


async def failing_dependencies(settings: Settings) -> list[str]:
    postgres_ok, valkey_ok = await asyncio.gather(
        _postgres_answers(str(settings.database_url)),
        _valkey_answers(str(settings.valkey_url)),
    )
    return [name for name, ok in (("postgres", postgres_ok), ("valkey", valkey_ok)) if not ok]


async def _postgres_answers(url: str) -> bool:
    try:
        async with asyncio.timeout(CHECK_TIMEOUT_SECONDS):
            async with await psycopg.AsyncConnection.connect(url) as connection:
                await connection.execute("SELECT 1")
        return True
    except (TimeoutError, psycopg.Error):
        return False


async def _valkey_answers(url: str) -> bool:
    client = redis.asyncio.Redis.from_url(url)
    try:
        async with asyncio.timeout(CHECK_TIMEOUT_SECONDS):
            return bool(await client.ping())
    except (TimeoutError, redis.exceptions.RedisError):
        return False
    finally:
        await client.aclose()
