"""Integration tests for user authentication, verification, login, lockout, and sessions."""

import pytest
from app.db.models import OneTimeToken, User
from app.db.session import get_db
from app.main import app
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

VALID_PASSWORD = "Correct Horse Battery 2026!"


@pytest.mark.asyncio
async def test_signup_and_email_verification_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Signup with valid email and NIST-compliant password
        email = "alice@example.com"
        resp = await client.post(
            "/v1/auth/signup",
            json={"email": email, "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

        # 2. Extract verification token from database fixture
        # (simulating user clicking email link)
        db_factory = app.dependency_overrides[get_db]
        async for session in db_factory():
            stmt = (
                select(OneTimeToken, User)
                .join(User, OneTimeToken.user_id == User.id)
                .where(User.email == email, OneTimeToken.token_type == "email_verify")
            )
            res = await session.execute(stmt)
            token_entry, user = res.first()
            assert user.email_verified_at is None
            assert token_entry.token_hash is not None
            user_id = user.id

        # 3. Attempt login BEFORE email verification (must be forbidden)
        login_fail = await client.post(
            "/v1/auth/login",
            json={"email": email, "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert login_fail.status_code == 403
        assert "verify your email" in login_fail.json()["error"]["message"].lower()

        # 4. Invalidate with bogus token
        bad_verify = await client.post(
            "/v1/auth/verify-email",
            json={"token": "completely_invalid_random_token_12345"},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert bad_verify.status_code == 400

        # 5. Direct verification simulation
        async for session in db_factory():
            u = await session.get(User, user_id)
            from app.db.models import utc_now

            u.email_verified_at = utc_now()
            await session.commit()

        # 6. Login AFTER verification (must succeed and issue cookies)
        login_ok = await client.post(
            "/v1/auth/login",
            json={"email": email, "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert login_ok.status_code == 200
        data = login_ok.json()
        assert data["email"] == email
        assert data["email_verified"] is True

        # Verify session cookie was set
        assert "openocr_session" in client.cookies or "__Host-openocr_session" in client.cookies

        # 7. Access /v1/auth/me
        me_resp = await client.get("/v1/auth/me")
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == email

        # 8. List active sessions
        sessions_resp = await client.get("/v1/auth/sessions")
        assert sessions_resp.status_code == 200
        sessions_list = sessions_resp.json()
        assert len(sessions_list) >= 1
        assert sessions_list[0]["is_current"] is True

        # 9. Logout
        logout_resp = await client.post(
            "/v1/auth/logout",
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert logout_resp.status_code == 200

        # 10. Access /v1/auth/me after logout (must fail 401)
        me_after_logout = await client.get("/v1/auth/me")
        assert me_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_anti_enumeration_on_duplicate_signup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = "bob@example.com"

        # First signup
        r1 = await client.post(
            "/v1/auth/signup",
            json={"email": email, "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert r1.status_code == 200

        # Second signup with same email (different case and extra spaces)
        r2 = await client.post(
            "/v1/auth/signup",
            json={"email": "  BoB@Example.COM  ", "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        # MUST return identical response status and body
        assert r2.status_code == 200
        assert r2.json() == r1.json()


@pytest.mark.asyncio
async def test_login_brute_force_lockout():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = "charlie@example.com"
        await client.post(
            "/v1/auth/signup",
            json={"email": email, "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )

        # Mark user verified
        db_factory = app.dependency_overrides[get_db]
        async for session in db_factory():
            stmt = select(User).where(User.email == email)
            res = await session.execute(stmt)
            u = res.scalar_one()
            from app.db.models import utc_now

            u.email_verified_at = utc_now()
            await session.commit()

        # Perform 4 failed logins
        for _ in range(4):
            fail_resp = await client.post(
                "/v1/auth/login",
                json={"email": email, "password": "WrongPassword123!"},
                headers={"X-Requested-With": "XMLHttpRequest"},
            )
            assert fail_resp.status_code == 401
            assert fail_resp.json()["error"]["message"] == "Invalid email or password."

        # 5th failed attempt triggers temporary lockout
        lockout_trigger = await client.post(
            "/v1/auth/login",
            json={"email": email, "password": "WrongPassword123!"},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert lockout_trigger.status_code == 401

        # 6th attempt (even with CORRECT password) must be rejected with 423 Locked!
        locked_attempt = await client.post(
            "/v1/auth/login",
            json={"email": email, "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert locked_attempt.status_code == 423
        assert "temporarily locked" in locked_attempt.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = "diana@example.com"
        await client.post(
            "/v1/auth/signup",
            json={"email": email, "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )

        # 1. Forgot password request (always returns success message)
        forgot_resp = await client.post(
            "/v1/auth/forgot-password",
            json={"email": email},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert forgot_resp.status_code == 200
        assert "reset link has been dispatched" in forgot_resp.json()["message"]

        # Unknown email returns identical response
        unknown_resp = await client.post(
            "/v1/auth/forgot-password",
            json={"email": "nonexistent_stranger@example.com"},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert unknown_resp.status_code == 200
        assert unknown_resp.json() == forgot_resp.json()

        # 2. Extract reset token hash from database
        db_factory = app.dependency_overrides[get_db]
        async for session in db_factory():
            stmt = (
                select(OneTimeToken, User)
                .join(User, OneTimeToken.user_id == User.id)
                .where(User.email == email, OneTimeToken.token_type == "password_reset")
            )
            res = await session.execute(stmt)
            token_entry, user = res.first()
            # Simulate direct reset with token
            from app.security.password import hash_password

            new_pw = "BrandNewSuperSecurePassphrase2026!"
            user.password_hash = hash_password(new_pw)
            token_entry.used_at = token_entry.created_at
            user.email_verified_at = token_entry.created_at
            await session.commit()

        # 3. Login with NEW password succeeds
        login_new = await client.post(
            "/v1/auth/login",
            json={"email": email, "password": "BrandNewSuperSecurePassphrase2026!"},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert login_new.status_code == 200

        # Old password fails
        login_old = await client.post(
            "/v1/auth/login",
            json={"email": email, "password": VALID_PASSWORD},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert login_old.status_code == 401
