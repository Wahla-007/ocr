"""Security hardening tests: headers, CSRF defense, open redirect protection, injection payloads."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.security import validate_internal_redirect


def test_open_redirect_validation():
    # Valid relative internal paths
    assert validate_internal_redirect("/dashboard") == "/dashboard"
    assert validate_internal_redirect("/api/v1/jobs") == "/api/v1/jobs"
    assert validate_internal_redirect(None) == "/"
    assert validate_internal_redirect("") == "/"

    # Malicious external & bypass schemes
    assert validate_internal_redirect("https://attacker.com") == "/"
    assert validate_internal_redirect("http://attacker.com/steal") == "/"
    assert validate_internal_redirect("//attacker.com") == "/"
    assert validate_internal_redirect("/\\attacker.com") == "/"
    assert validate_internal_redirect("javascript:alert(1)") == "/"
    assert validate_internal_redirect("/dashboard\r\nSet-Cookie: evil=1") == "/"


@pytest.mark.asyncio
async def test_security_headers_present():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/")

        assert resp.status_code == 200
        headers = resp.headers

        # 1. Nosniff
        assert headers.get("X-Content-Type-Options") == "nosniff"

        # 2. Clickjacking defense
        assert headers.get("X-Frame-Options") == "DENY"

        # 3. Referrer Policy
        assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

        # 4. Permissions Policy
        assert "camera=()" in headers.get("Permissions-Policy", "")

        # 5. CSP
        csp = headers.get("Content-Security-Policy", "")
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp


@pytest.mark.asyncio
async def test_csrf_protection_on_session_mutations():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Simulate request coming with a session cookie but NO CSRF header and NO trusted origin
        cookies = {"openocr_session": "sample_session_token_123"}
        resp = await client.post(
            "/v1/auth/logout",
            cookies=cookies,
            # Omitting X-Requested-With and X-CSRF-Token
        )
        assert resp.status_code == 403
        data = resp.json()
        assert data["error"]["code"] == "CSRF_TOKEN_MISSING"

        # Now include trusted client header
        valid_resp = await client.post(
            "/v1/auth/logout",
            cookies=cookies,
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert valid_resp.status_code == 200


@pytest.mark.asyncio
async def test_injection_payloads_in_auth_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        malicious_inputs = [
            "' OR '1'='1",
            "admin' --",
            "<script>alert('xss')</script>",
            "'; DROP TABLE users; --",
            "\" or 1=1--",
            "\x00nullbyte",
        ]

        for payload in malicious_inputs:
            # Signup with injection in email
            resp = await client.post(
                "/v1/auth/signup",
                json={"email": f"{payload}@example.com", "password": "ValidPassword2026!#"},
                headers={"X-Requested-With": "XMLHttpRequest"},
            )
            # Must safely reject as invalid email or process without DB error
            assert resp.status_code in {200, 422}

            # Login with injection
            login_resp = await client.post(
                "/v1/auth/login",
                json={"email": payload, "password": payload},
                headers={"X-Requested-With": "XMLHttpRequest"},
            )
            # Must safely return 401 Unauthorized without 500 error
            assert login_resp.status_code == 401
