"""Worker smoke tests."""

import pytest
from app.db.models import Base, Job
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from worker.config import worker_settings
from worker.tasks import process_document_job


@pytest.mark.asyncio
async def test_worker_task_smoke():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    import worker.tasks
    from app.storage import storage

    worker.tasks.WorkerSessionLocal = session_factory
    with open("tests/samples/clean_invoice.pdf", "rb") as f:
        pdf_data = f.read()
    storage.upload_bytes = lambda k, d, m: None
    storage.download_bytes = lambda k: pdf_data

    job_id = "job_smoke_123"
    async with session_factory() as session:
        job = Job(
            id=job_id,
            status="queued",
            file_key="uploads/smoke.pdf",
            file_hash="smokehask123",
            mime="application/pdf",
            size_bytes=1024,
            pages=1,
            cached=False,
        )
        session.add(job)
        await session.commit()

    ctx = {}
    result = await process_document_job(ctx, job_id)
    assert result["job_id"] == job_id
    assert result["status"] == "done"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


def test_worker_settings():
    assert worker_settings.REDIS_URL is not None
    assert worker_settings.PARSE_ENGINE_PRIMARY == "docling"
