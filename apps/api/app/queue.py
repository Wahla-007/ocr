"""Queue producer service for enqueuing jobs to Redis/ARQ."""

from app.config import settings
from app.logging import logger
from arq.connections import ArqRedis, RedisSettings, create_pool

_redis_pool: ArqRedis | None = None


async def get_queue_pool() -> ArqRedis | None:
    """Retrieves or creates ARQ Redis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        try:
            redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
            _redis_pool = await create_pool(redis_settings, retry=0)
        except Exception as e:
            logger.warning(f"Could not connect to Redis queue: {e}")
            return None
    return _redis_pool


async def enqueue_job(job_id: str) -> bool:
    """Enqueues document processing job into ARQ."""
    pool = await get_queue_pool()
    if pool is not None:
        try:
            await pool.enqueue_job("process_document_job", job_id)
            logger.info(f"Enqueued job {job_id} to worker pool")
            return True
        except Exception as e:
            logger.error(f"Failed to enqueue job {job_id}: {e}")
            return False
    return False
