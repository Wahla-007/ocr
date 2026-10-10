"""Tests for worker job processing pipeline flow."""

from pathlib import Path

import pytest
from app.db.models import Base, Job, Result, UsageLedger
from app.storage import storage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from worker.tasks import process_document_job


@pytest.mark.asyncio
async def test_worker_pipeline_execution():
    # Setup test in-memory SQLite DB for worker
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

    worker.tasks.WorkerSessionLocal = session_factory

    # Mock storage to return valid clean_invoice.pdf bytes
    sample_path = Path("tests/samples/clean_invoice.pdf")
    with open(sample_path, "rb") as f:
        pdf_data = f.read()
    storage.upload_bytes = lambda k, d, m: None
    storage.download_bytes = lambda k: pdf_data

    # 1. Create a job in queued state
    job_id = "job_worker_test_1"
    async with session_factory() as session:
        job = Job(
            id=job_id,
            user_id="user_test_99",
            status="queued",
            file_key="uploads/test.pdf",
            file_hash="testhash123",
            mime="application/pdf",
            size_bytes=len(pdf_data),
            pages=1,
            cached=False,
        )
        session.add(job)
        await session.commit()

    # 2. Run worker task
    task_res = await process_document_job({}, job_id)
    assert task_res["status"] == "done"

    # 3. Verify database state
    async with session_factory() as session:
        # Check Job transitioned to done
        job_stmt = select(Job).where(Job.id == job_id)
        job_db = (await session.execute(job_stmt)).scalars().first()
        assert job_db.status == "done"
        assert job_db.credits_charged >= 1
        assert job_db.completed_at is not None

        # Check Result created with structured JSON fields
        res_stmt = select(Result).where(Result.job_id == job_id)
        result_db = (await session.execute(res_stmt)).scalars().first()
        assert result_db is not None
        assert len(result_db.blocks_json) >= 1
        assert len(result_db.tables_json) >= 1
        assert result_db.confidence > 0.8
        assert "INVOICE" in result_db.markdown

        # Check append-only usage_ledger entry recorded
        ledger_stmt = select(UsageLedger).where(UsageLedger.job_id == job_id)
        ledger_db = (await session.execute(ledger_stmt)).scalars().first()
        assert ledger_db is not None
        assert ledger_db.credits >= 1
        assert ledger_db.user_id == "user_test_99"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
