"""Tests for signed upload URL endpoint."""

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_sign_upload_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "filename": "sample_invoice.pdf",
            "mime": "application/pdf",
            "size_bytes": 1024 * 500,  # 500 KB
        }
        resp = await client.post("/v1/uploads/sign", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "upload_url" in data
        assert "file_key" in data
        assert data["file_key"].startswith("uploads/")
        assert "sample_invoice.pdf" in data["file_key"]
        assert data["expires_in"] == 900
        assert "X-Request-ID" in resp.headers


@pytest.mark.asyncio
async def test_sign_upload_unsupported_mime():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "filename": "malware.exe",
            "mime": "application/x-msdownload",
            "size_bytes": 1024,
        }
        resp = await client.post("/v1/uploads/sign", json=payload)
        assert resp.status_code == 415
        data = resp.json()
        assert "error" in data
        assert data["error"]["code"] == "UNSUPPORTED_TYPE"
        assert "request_id" in data["error"]


@pytest.mark.asyncio
async def test_sign_upload_file_too_large():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "filename": "huge_scan.pdf",
            "mime": "application/pdf",
            "size_bytes": 50 * 1024 * 1024,  # 50MB (Anonymous limit is 10MB)
        }
        resp = await client.post("/v1/uploads/sign", json=payload)
        assert resp.status_code == 413
        data = resp.json()
        assert "error" in data
        assert data["error"]["code"] == "FILE_TOO_LARGE"
