"""Database session setup for worker."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from worker.config import worker_settings

worker_engine = create_async_engine(
    worker_settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

WorkerSessionLocal = async_sessionmaker(
    bind=worker_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
