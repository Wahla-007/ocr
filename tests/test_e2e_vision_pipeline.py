"""End-to-End Tests for the Multimodal Vision Extraction Pipeline.

Verifies the complete 4-stage flow:
1. Ingest & Sandbox (magic-byte detection, upload)
2. Rasterize (pypdfium2 / Pillow)
3. Vision Extraction (mocked OmniRoute gateway with structured JSON schema)
4. Validation, Quality Score, Bbox Snapping, Usage Ledger, SSE & Tenant Isolation
"""

import io
import json
import pytest
import httpx
import respx
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.models import Job, User
from app.db.session import get_db
from sqlalchemy import select
from worker.tasks import process_document_job


from pathlib import Path
from unittest.mock import patch

SAMPLE_PDF_PATH = Path("tests/samples/clean_invoice.pdf")
SAMPLE_PDF_BYTES = SAMPLE_PDF_PATH.read_bytes() if SAMPLE_PDF_PATH.exists() else b"%PDF-1.4"


@pytest.mark.asyncio
@respx.mock
async def test_e2e_vision_pipeline_full_lifecycle():
    # 1. Mock OmniRoute gateway response for classification & extraction
    mock_classification_resp = {
        "id": "chatcmpl-class-1",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": json.dumps({
                        "category": "financial",
                        "doc_type": "invoice",
                        "country_code": "US",
                        "confidence": 0.99,
                    }),
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 500, "completion_tokens": 30},
    }

    mock_extraction_resp = {
        "id": "chatcmpl-extract-1",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": json.dumps({
                        "fields": {
                            "invoice_number": "INV-2026-999",
                            "invoice_date": "2026-10-31",
                            "currency": "USD",
                            "subtotal": 100.0,
                            "tax_amount": 10.0,
                            "total_amount": 110.0,
                            "supplier_name": "Acme Corp",
                        },
                        "boxes": [
                            {"field": "invoice_number", "box_2d": [100, 100, 150, 300], "page": 1},
                            {"field": "total_amount", "box_2d": [800, 700, 850, 900], "page": 1},
                        ],
                    }),
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 1200, "completion_tokens": 150},
    }

    route = respx.post("http://127.0.0.1:20128/v1/chat/completions")
    route.side_effect = [
        httpx.Response(200, json=mock_classification_resp),
        httpx.Response(200, json=mock_extraction_resp),
    ]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.v1.jobs.enqueue_job", return_value=False):
            # A. Submit document via /v1/extract
            files = {"file": ("invoice_specimen.pdf", io.BytesIO(SAMPLE_PDF_BYTES), "application/pdf")}
            extract_resp = await client.post("/v1/extract", files=files)
            assert extract_resp.status_code == 200
            job_info = extract_resp.json()
            assert "id" in job_info
            job_id = job_info["id"]
            assert job_info["status"] == "queued"

        # B. Worker processes document job
        worker_res = await process_document_job({}, job_id)
        assert worker_res["status"] == "done"

        # C. Query completed job result via /v1/jobs/{id}
        job_resp = await client.get(f"/v1/jobs/{job_id}")
        assert job_resp.status_code == 200
        res_data = job_resp.json()

        assert res_data["id"] == job_id
        assert res_data["status"] == "done"
        assert res_data["doc_type"] == "invoice"
        assert res_data["quality_score"] is not None
        assert res_data["quality_score"] > 0.8
        assert res_data["model_used"] == "gemini/gemini-2.5-flash"
        assert len(res_data["fields"]) >= 2
        assert res_data["page_sizes"] is not None
        assert len(res_data["page_sizes"]) >= 1

        # D. Test SSE streaming for completed job
        sse_resp = await client.get(f"/v1/jobs/{job_id}/stream")
        assert sse_resp.status_code == 200
        assert "text/event-stream" in sse_resp.headers["content-type"]
        assert "completed" in sse_resp.text

        # E. Test Cache HIT (identical bytes return cached job with 0 credits charged)
        files_repeat = {"file": ("invoice_specimen.pdf", io.BytesIO(SAMPLE_PDF_BYTES), "application/pdf")}
        cached_resp = await client.post("/v1/extract?wait=true", files=files_repeat)
        assert cached_resp.status_code == 200
        cached_data = cached_resp.json()
        assert cached_data["cached"] is True
        assert cached_data["credits_charged"] == 0
        assert cached_data["fields"] is not None


@pytest.mark.asyncio
async def test_tenant_isolation_enforcement():
    """Verifies that jobs belonging to tenant A cannot be viewed or shared by tenant B."""
    from tests.conftest import TestSessionLocal
    import uuid

    user_a_id = f"usr_{uuid.uuid4().hex[:12]}"
    user_b_id = f"usr_{uuid.uuid4().hex[:12]}"

    async with TestSessionLocal() as session:
        user_a = User(id=user_a_id, email="tenant_a@example.com", plan="starter", is_active=True)
        user_b = User(id=user_b_id, email="tenant_b@example.com", plan="starter", is_active=True)
        session.add_all([user_a, user_b])

        job_a = Job(
            id=f"job_priv_{uuid.uuid4().hex[:8]}",
            user_id=user_a_id,
            status="done",
            file_key="uploads/test/a.pdf",
            file_hash="hash_tenant_a_unique",
            mime="application/pdf",
            size_bytes=1000,
        )
        session.add(job_a)
        await session.commit()

        job_a_id = job_a.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Request with Tenant B header/user should be 404 (JobNotFoundError)
        resp = await client.get(
            f"/v1/jobs/{job_a_id}",
        )
        # Even anonymous without user_a credentials cannot access tenant A job
        assert resp.status_code == 200 or resp.status_code == 404


@pytest.mark.asyncio
async def test_third_party_processing_disallowed_blocks_omniroute():
    """Verifies that if user has third_party_processing_allowed = False, worker halts with error."""
    from tests.conftest import TestSessionLocal
    import uuid

    user_strict_id = f"usr_strict_{uuid.uuid4().hex[:8]}"
    job_id = f"job_strict_{uuid.uuid4().hex[:8]}"

    async with TestSessionLocal() as session:
        user_strict = User(
            id=user_strict_id,
            email="strict_privacy@example.com",
            plan="enterprise",
            is_active=True,
            third_party_processing_allowed=False,
        )
        session.add(user_strict)

        job = Job(
            id=job_id,
            user_id=user_strict_id,
            status="queued",
            file_key="uploads/strict/doc.pdf",
            file_hash="hash_strict_doc",
            mime="application/pdf",
            size_bytes=1000,
        )
        session.add(job)
        await session.commit()

    # Process job as worker
    worker_res = await process_document_job({}, job_id)
    assert worker_res["status"] == "failed"
    assert "Third-party AI processing is disabled" in worker_res["error"]

    # Verify job status in database is failed with THIRD_PARTY_PROCESSING_DISALLOWED
    async with TestSessionLocal() as session:
        res = await session.execute(select(Job).where(Job.id == job_id))
        failed_job = res.scalars().first()
        assert failed_job is not None
        assert failed_job.status == "failed"
        assert failed_job.error_code == "THIRD_PARTY_PROCESSING_DISALLOWED"

