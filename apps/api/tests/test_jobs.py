"""Tests for extraction job lifecycle, caching, and querying."""

import io
from pathlib import Path

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient
from worker.tasks import process_document_job

SAMPLE_PDF_PATH = Path("tests/samples/clean_invoice.pdf")
if SAMPLE_PDF_PATH.exists():
    with open(SAMPLE_PDF_PATH, "rb") as _f:
        SAMPLE_PDF_BYTES = _f.read()
else:
    SAMPLE_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Title (Invoice) >>\nendobj\ntrailer\n<<>>\n%%EOF"


@pytest.mark.asyncio
async def test_extract_multipart_async_and_query():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Submit document via multipart
        files = {"file": ("test_invoice.pdf", io.BytesIO(SAMPLE_PDF_BYTES), "application/pdf")}
        resp = await client.post("/v1/extract", files=files)

        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["status"] == "queued"
        job_id = data["id"]

        # Verify rate limit and quota headers exist
        assert "X-RateLimit-Limit" in resp.headers
        assert "X-Quota-Limit" in resp.headers
        assert "X-Quota-Remaining" in resp.headers

        # 2. Simulate worker completing the job
        worker_res = await process_document_job({}, job_id)
        assert worker_res["status"] == "done"

        # 3. Query completed job
        get_resp = await client.get(f"/v1/jobs/{job_id}")
        assert get_resp.status_code == 200
        job_data = get_resp.json()

        assert job_data["id"] == job_id
        assert job_data["status"] == "done"
        assert job_data["doc_type"] == "invoice"
        assert job_data["confidence"] > 0.9
        assert len(job_data["fields"]) >= 2
        assert len(job_data["blocks"]) >= 2
        assert len(job_data["tables"]) >= 1
        assert "Invoice" in job_data["markdown"]
        assert job_data["versions"]["engine"] == "docling-1.0.0"
        assert job_data["cached"] is False
        assert job_data["credits_charged"] == 1


@pytest.mark.asyncio
async def test_sha256_idempotency_and_caching():
    """Rule 8: Hash every file (SHA-256).

    If identical file was already processed, return cached result and charge 0 credits.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. First upload
        files = {"file": ("doc_first.pdf", io.BytesIO(SAMPLE_PDF_BYTES), "application/pdf")}
        resp1 = await client.post("/v1/extract", files=files)
        job_id_1 = resp1.json()["id"]

        # Complete first job
        await process_document_job({}, job_id_1)

        # 2. Second upload of exact same bytes with wait=true
        files_cached = {"file": ("doc_second.pdf", io.BytesIO(SAMPLE_PDF_BYTES), "application/pdf")}
        resp2 = await client.post("/v1/extract?wait=true", files=files_cached)
        assert resp2.status_code == 200
        cached_data = resp2.json()

        assert cached_data["status"] == "done"
        assert cached_data["cached"] is True
        assert cached_data["credits_charged"] == 0  # Zero credits charged for cache hit
        assert cached_data["doc_type"] == "invoice"
        assert len(cached_data["fields"]) >= 2


@pytest.mark.asyncio
async def test_extract_invalid_magic_bytes_rejected():
    """Rule 1: Validate real MIME type (magic bytes, not extension)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        fake_pdf = b"NOT_A_REAL_PDF_JUST_RANDOM_TEXT"
        files = {"file": ("fake.pdf", io.BytesIO(fake_pdf), "application/pdf")}
        resp = await client.post("/v1/extract", files=files)

        assert resp.status_code == 415
        data = resp.json()
        assert data["error"]["code"] == "UNSUPPORTED_TYPE"


@pytest.mark.asyncio
async def test_job_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/jobs/job_nonexistent_xyz")
        assert resp.status_code == 404
        data = resp.json()
        assert data["error"]["code"] == "JOB_NOT_FOUND"
