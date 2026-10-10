"""Pytest configuration and test database fixtures."""

import pytest_asyncio
from app.db.models import Base
from app.db.session import get_db
from app.main import app
from app.storage import storage
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

TEST_DATABASE_URL = "sqlite+aiosqlite://"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    """Initializes in-memory database schema before each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # In-memory storage mock
    storage_mem = {}

    def mock_upload(key: str, data: bytes, mime: str):
        storage_mem[key] = (data, mime)

    def mock_download(key: str) -> bytes:
        if key in storage_mem:
            return storage_mem[key][0]
        try:
            with open("tests/samples/clean_invoice.pdf", "rb") as f:
                return f.read()
        except Exception:
            return b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"

    storage.upload_bytes = mock_upload
    storage.download_bytes = mock_download

    # Override get_db dependency in FastAPI
    async def override_get_db():
        async with TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    # Point worker sessions to test session during test run
    import worker.tasks

    worker.tasks.WorkerSessionLocal = TestSessionLocal

    yield

    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
