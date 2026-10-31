"""Verification tests for admin login, role assignment, and clean error formatting."""

import httpx

API_BASE = "http://127.0.0.1:8000"
WEB_BASE = "http://127.0.0.1:3001"

def test_admin_auth():
    print("\n--- Verifying Admin Authentication & Error Responses ---")
    
    # 1. Validation error on empty password
    res = httpx.post(f"{API_BASE}/v1/auth/login", json={"email": "admin@openocr.org", "password": ""})
    assert res.status_code == 422, f"Expected 422, got {res.status_code}"
    body = res.json()
    assert "error" in body, f"Expected 'error' in body: {body}"
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(body["error"]["message"], str)
    assert "[object Object]" not in body["error"]["message"]
    print(f"  [PASS] Empty password returns 422 with string error: '{body['error']['message']}'")

    # 2. Validation error on missing fields
    res = httpx.post(f"{API_BASE}/v1/auth/login", json={})
    assert res.status_code == 422
    body = res.json()
    assert "error" in body
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(body["error"]["message"], str)
    assert "[object Object]" not in body["error"]["message"]
    print(f"  [PASS] Empty payload returns 422 with string error: '{body['error']['message']}'")

    # 3. Invalid credentials
    res = httpx.post(f"{API_BASE}/v1/auth/login", json={"email": "admin@openocr.org", "password": "WrongPassword123!"})
    assert res.status_code == 401
    body = res.json()
    assert "error" in body
    assert body["error"]["code"] == "INVALID_CREDENTIALS"
    assert body["error"]["message"] == "Invalid email or password."
    print(f"  [PASS] Invalid password returns 401: '{body['error']['message']}'")

    # 4. Valid admin login
    client = httpx.Client(base_url=API_BASE)
    res = client.post("/v1/auth/login", json={"email": "admin@openocr.org", "password": "Admin@OpenOCR2026!"})
    assert res.status_code == 200, f"Admin login failed: {res.status_code} {res.text}"
    user_data = res.json()
    assert user_data.get("email") == "admin@openocr.org"
    assert user_data.get("is_admin") is True, f"Expected is_admin=True, got: {user_data}"
    assert "openocr_session" in client.cookies, "Expected session cookie to be set"
    print(f"  [PASS] Admin login succeeded: email={user_data['email']}, is_admin={user_data['is_admin']}")

    # 5. Check /v1/auth/me retains is_admin=True
    res_me = client.get("/v1/auth/me")
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data.get("is_admin") is True
    print(f"  [PASS] /v1/auth/me verified: is_admin={me_data['is_admin']}")

    # 6. Test through Next.js proxy
    web_client = httpx.Client(base_url=WEB_BASE)
    res_web = web_client.post("/v1/auth/login", json={"email": "admin@openocr.org", "password": "Admin@OpenOCR2026!"})
    assert res_web.status_code == 200, f"Next.js login proxy failed: {res_web.status_code}"
    web_user = res_web.json()
    assert web_user.get("is_admin") is True
    print(f"  [PASS] Next.js proxy auth login succeeded: is_admin={web_user['is_admin']}")

    print("\nALL ADMIN AUTH & ERROR CHECKS PASSED!\n")

if __name__ == "__main__":
    test_admin_auth()
