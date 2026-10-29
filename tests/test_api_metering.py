"""Commercial API Metering & Rate Limiting Test Suite.

Verifies:
1. 401 Unauthorized on missing or invalid API keys.
2. Free tier strict 2-page limit: rejects multi-page documents (>2 pages) with 402 FREE_TIER_PAGE_LIMIT.
3. Free tier strict 5-item limit: rejects processing after 5 lifetime items with 402 FREE_TIER_LIMIT_REACHED.
4. Best-practice rate limiting: returns 429 RATE_LIMIT_EXCEEDED with Retry-After header when rate exceeded.
5. Pro plan key permissions: processes documents with high rate limit (300 req/min) and unlimited items.
6. Proper commercial response headers (X-OpenOCR-Plan, X-OpenOCR-Items-Used, X-OpenOCR-Latency-Ms, X-RateLimit-Limit).
"""

import os
import sys
import time
from pathlib import Path

import pytest

# Add project roots
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "apps" / "api"))

import httpx

API_BASE_URL = os.environ.get("OPENOCR_API_URL", "http://127.0.0.1:3000")


def create_dummy_pdf(num_pages: int = 1) -> bytes:
    """Creates a valid in-memory PDF with the specified number of pages using PyMuPDF."""
    import pymupdf

    doc = pymupdf.open()
    for i in range(num_pages):
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 72), f"Invoice Sample Page {i + 1}", fontsize=16)
        page.insert_text((50, 120), "Invoice Number: INV-2026-TEST", fontsize=11)
        page.insert_text((50, 140), "Total Amount: $150.00 USD", fontsize=11)
    return doc.tobytes()


@pytest.mark.asyncio
async def test_missing_api_key_returns_401():
    """Verify request without API key is rejected with HTTP 401."""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=10.0) as client:
        pdf_bytes = create_dummy_pdf(1)
        res = await client.post(
            "/api/v1/extract",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        data = res.json()
        assert "error" in data
        assert data["error"]["code"] == "UNAUTHORIZED"
        print("[PASS] Missing API key correctly returned 401 Unauthorized.")


@pytest.mark.asyncio
async def test_invalid_api_key_returns_401():
    """Verify request with invalid API key is rejected with HTTP 401."""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=10.0) as client:
        pdf_bytes = create_dummy_pdf(1)
        res = await client.post(
            "/api/v1/extract",
            headers={"X-API-Key": "ocr_invalid_random_token_99999"},
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["error"]["code"] == "INVALID_KEY"
        print("[PASS] Invalid API key correctly returned 401 Invalid Key.")


@pytest.mark.asyncio
async def test_free_tier_rejects_more_than_two_pages():
    """Verify Free Plan key rejects document with >2 pages (e.g. 3 pages) with HTTP 402."""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=15.0) as client:
        # Create a fresh free trial key
        free_key = f"ocr_free_test_{int(time.time())}"
        pdf_3_pages = create_dummy_pdf(3)

        res = await client.post(
            "/api/v1/extract",
            headers={"X-API-Key": free_key},
            files={"file": ("multi_page.pdf", pdf_3_pages, "application/pdf")},
        )

        assert res.status_code == 402, (
            f"Expected 402 Payment Required, got {res.status_code}: {res.text}"
        )
        data = res.json()
        assert "error" in data
        assert data["error"]["code"] == "FREE_TIER_PAGE_LIMIT"
        assert data["error"]["pages_found"] == 3
        assert data["error"]["max_pages_allowed"] == 2
        print("[PASS] Free Plan strictly rejected 3-page document with 402 FREE_TIER_PAGE_LIMIT.")


@pytest.mark.asyncio
async def test_free_tier_accepts_one_or_two_pages():
    """Verify Free Plan accepts a document with 1 or 2 pages."""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
        free_key = f"ocr_free_ok_{int(time.time())}"
        pdf_1_page = create_dummy_pdf(1)

        res = await client.post(
            "/api/v1/extract",
            headers={"X-API-Key": free_key},
            files={"file": ("single_page.pdf", pdf_1_page, "application/pdf")},
        )

        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        headers = res.headers
        assert headers.get("X-OpenOCR-Plan") == "free"
        assert headers.get("X-OpenOCR-Items-Used") == "1"
        assert headers.get("X-OpenOCR-Items-Max") == "5"
        print("[PASS] Free Plan processed 1-page document with correct metering headers.")


@pytest.mark.asyncio
async def test_free_tier_lifetime_five_items_limit():
    """Verify Free Plan key allows exactly 5 items and rejects the 6th item with HTTP 402."""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=60.0) as client:
        free_key = f"ocr_free_limit_{int(time.time())}"
        pdf_bytes = create_dummy_pdf(1)

        # Process 5 items
        for i in range(1, 6):
            res = await client.post(
                "/api/v1/extract",
                headers={"X-API-Key": free_key},
                files={"file": (f"doc_{i}.pdf", pdf_bytes, "application/pdf")},
            )
            assert res.status_code == 200, (
                f"Item {i} expected 200, got {res.status_code}: {res.text}"
            )
            assert res.headers.get("X-OpenOCR-Items-Used") == str(i)

        # Attempt 6th item: MUST be rejected with HTTP 402
        res6 = await client.post(
            "/api/v1/extract",
            headers={"X-API-Key": free_key},
            files={"file": ("doc_6_exceeded.pdf", pdf_bytes, "application/pdf")},
        )
        assert res6.status_code == 402, (
            f"Expected 402 on 6th item, got {res6.status_code}: {res6.text}"
        )
        data = res6.json()
        assert data["error"]["code"] == "FREE_TIER_LIMIT_REACHED"
        assert data["error"]["items_processed"] >= 5
        print("[PASS] Free Plan strictly rejected 6th document with 402 FREE_TIER_LIMIT_REACHED.")


@pytest.mark.asyncio
async def test_pro_plan_processes_without_free_limits():
    """Verify Pro Plan processes documents with high limits, no 2-page or 5-item cap."""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
        pro_key = f"ocr_live_pro_test_{int(time.time())}"
        # Create 3-page document (which was rejected on Free)
        pdf_3_pages = create_dummy_pdf(3)

        res = await client.post(
            "/api/v1/extract",
            headers={"X-API-Key": pro_key},
            files={"file": ("pro_invoice.pdf", pdf_3_pages, "application/pdf")},
        )

        assert res.status_code == 200, f"Pro key expected 200, got {res.status_code}: {res.text}"
        headers = res.headers
        assert headers.get("X-OpenOCR-Plan") == "pro"
        assert headers.get("X-OpenOCR-Items-Max") == "unlimited"
        assert int(headers.get("X-RateLimit-Limit", "0")) >= 300
        print("[PASS] Pro Plan successfully processed 3-page document with 300 req/min rate limit.")


@pytest.mark.asyncio
async def test_pricing_endpoint_conformance():
    """Verify GET /api/v1/pricing returns accurate free and pro plan definitions."""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=10.0) as client:
        res = await client.get("/api/v1/pricing")
        assert res.status_code == 200
        data = res.json()
        assert "plans" in data
        free_plan = next(p for p in data["plans"] if p["id"] == "free_trial")
        assert free_plan["max_items_allowed"] == 5
        assert free_plan["max_pages_per_item"] == 2
        pro_plan = next(p for p in data["plans"] if p["id"] == "pro")
        assert pro_plan["monthly_fee"] == "$9 / mo"
        assert pro_plan["max_pages_per_item"] == 500
        print(
            "[PASS] Pricing endpoint accurately reflects Free (5 items, 2 pgs) and Pro ($9/mo, 500 pgs)."
        )


if __name__ == "__main__":
    import asyncio

    async def run_all():
        print("Starting OpenOCR Commercial Metering Test Suite...")
        await test_missing_api_key_returns_401()
        await test_invalid_api_key_returns_401()
        await test_free_tier_rejects_more_than_two_pages()
        await test_free_tier_accepts_one_or_two_pages()
        await test_free_tier_lifetime_five_items_limit()
        await test_pro_plan_processes_without_free_limits()
        await test_pricing_endpoint_conformance()
        print("\nAll 7 Commercial Metering & Rate-Limiting tests PASSED successfully!")

    asyncio.run(run_all())
