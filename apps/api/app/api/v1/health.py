"""Health check endpoint validating core infrastructure dependencies."""

import time
from typing import Any

import redis.asyncio as aioredis
from app.config import settings
from app.db.session import AsyncSessionLocal
from app.logging import logger
from fastapi import APIRouter, Response, status
from sqlalchemy import text

router = APIRouter()


async def check_database() -> dict[str, Any]:
    start = time.time()
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "latency_ms": round((time.time() - start) * 1000, 2),
        }


async def check_redis() -> dict[str, Any]:
    start = time.time()
    try:
        r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
        return {
            "status": "connected",
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "latency_ms": round((time.time() - start) * 1000, 2),
        }


async def check_storage() -> dict[str, Any]:
    start = time.time()
    try:
        # Check storage endpoint connectivity
        import httpx

        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.STORAGE_ENDPOINT}/minio/health/live")
            # 200 or 403 (when S3 path requires auth) indicates the service is alive and listening
            is_up = resp.status_code in [200, 403, 400]
        return {
            "status": "connected" if is_up else "error",
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    except Exception as e:
        logger.warning(f"Storage health check ping failed: {e}")
        return {
            "status": "unreachable",
            "error": str(e),
            "latency_ms": round((time.time() - start) * 1000, 2),
        }


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check(response: Response) -> dict[str, Any]:
    db_result = await check_database()
    redis_result = await check_redis()
    storage_result = await check_storage()

    all_healthy = db_result["status"] == "connected" and redis_result["status"] == "connected"

    if not all_healthy:
        # In dev mode, don't 503 if local services aren't running yet during scaffolding tests.
        # Mark as degraded instead. In production, mark as 503.
        if settings.is_production:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if all_healthy else "degraded",
        "env": settings.ENV,
        "services": {
            "database": db_result,
            "redis": redis_result,
            "storage": storage_result,
        },
    }
