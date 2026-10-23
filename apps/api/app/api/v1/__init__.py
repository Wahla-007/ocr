"""API v1 router aggregator."""

from app.api.v1.health import router as health_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.pricing import router as pricing_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.usage import router as usage_router
from fastapi import APIRouter

api_v1_router = APIRouter()
api_v1_router.include_router(health_router, tags=["Health"])
api_v1_router.include_router(uploads_router)
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(pricing_router)
api_v1_router.include_router(usage_router)

__all__ = ["api_v1_router"]
