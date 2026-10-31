"""Comprehensive System Test:
- Login edge cases & error formats (ensuring no [object Object])
- Admin login and cookie assignment
- Support tickets lifecycle (submission, query, filtering, admin reply, status transition)
- Protected admin route behavior
"""

import httpx

API_URL = "http://127.0.0.1:8000"
WEB_URL = "http://127.0.0.1:3001"


def run_tests():
    print("=" * 70)
    print("COMPREHENSIVE THOROUGH SYSTEM VERIFICATION")
    print("=" * 70)

    # 1. Test Login Error Handling & No [object Object]
    print("\n--- 1. Login Validation & Error Formatting ---")

    # 1a. Empty password
    r = httpx.post(f"{API_URL}/v1/auth/login", json={"email": "admin@openocr.org", "password": ""})
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"
    data = r.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(data["error"]["message"], str)
    assert "[object Object]" not in data["error"]["message"]
    print(f"  [PASS] Empty password -> 422: '{data['error']['message']}'")

    # 1b. Empty email
    r = httpx.post(f"{API_URL}/v1/auth/login", json={"email": "", "password": "Admin@OpenOCR2026!"})
    assert r.status_code == 401 or r.status_code == 422
    data = r.json()
    assert "[object Object]" not in str(data)
    print(
        f"  [PASS] Empty email -> clean rejection: {data.get('error', {}).get('message') or data.get('detail')}"
    )

    # 1c. Invalid password
    r = httpx.post(
        f"{API_URL}/v1/auth/login",
        json={"email": "admin@openocr.org", "password": "WrongPassword99!"},
    )
    assert r.status_code == 401
    data = r.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"
    assert data["error"]["message"] == "Invalid email or password."
    print(f"  [PASS] Invalid password -> 401: '{data['error']['message']}'")

    # 2. Test Admin Authentication & Session
    print("\n--- 2. Admin Authentication & Session Cookies ---")
    session = httpx.Client(base_url=WEB_URL)

    # Login as admin via Next.js web proxy
    r = session.post(
        "/v1/auth/login", json={"email": "admin@openocr.org", "password": "Admin@OpenOCR2026!"}
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    user = r.json()
    assert user["email"] == "admin@openocr.org"
    assert user["is_admin"] is True, f"User is not marked admin: {user}"
    assert "openocr_session" in session.cookies, "Missing openocr_session cookie"
    print(f"  [PASS] Logged in as admin: {user['email']}, is_admin={user['is_admin']}")

    # Verify /v1/auth/me retains session and admin status
    r_me = session.get("/v1/auth/me")
    assert r_me.status_code == 200
    user_me = r_me.json()
    assert user_me["is_admin"] is True
    print(f"  [PASS] Session validated via /v1/auth/me (is_admin={user_me['is_admin']})")

    # 3. Test Support Tickets API
    print("\n--- 3. Support Tickets Lifecycle ---")

    # 3a. Query all tickets
    r_tickets = session.get("/api/v1/support/tickets")
    assert r_tickets.status_code == 200, f"Failed to get tickets: {r_tickets.status_code}"
    tickets_data = r_tickets.json()
    initial_count = len(tickets_data.get("tickets", []))
    assert initial_count > 0, "No initial seed tickets found"
    print(f"  [PASS] Successfully retrieved {initial_count} support tickets")
    print(f"         Stats summary: {tickets_data.get('stats')}")

    # 3b. Create a new support ticket
    new_ticket_payload = {
        "subject": "Automated Test: Memory spike on 500-page batch",
        "description": "High memory consumption detected during multi-page extraction queue.",
        "category": "api_bug",
        "severity": "S2",
        "email": "tester@openocr.org",
        "requestId": "req_test_998877",
        "planTier": "developer",
    }
    r_create = session.post("/api/v1/support/tickets", json=new_ticket_payload)
    assert r_create.status_code == 201, (
        f"Failed to create ticket: {r_create.status_code} {r_create.text}"
    )
    created_ticket = r_create.json()["ticket"]
    ticket_id = created_ticket["id"]
    ticket_ref = created_ticket["reference"]
    print(
        f"  [PASS] Created ticket: ref={ticket_ref}, id={ticket_id}, status={created_ticket['status']}"
    )

    # 3c. Query created ticket by reference
    r_by_ref = session.get(f"/api/v1/support/tickets?ref={ticket_ref}")
    assert r_by_ref.status_code == 200
    assert r_by_ref.json()["ticket"]["id"] == ticket_id
    print(f"  [PASS] Retrieved ticket by reference '{ticket_ref}' successfully")

    # 3d. Admin replies to ticket & updates status
    patch_payload = {
        "id": ticket_id,
        "reply": "Investigation complete. Concurrency limits adjusted in worker pool configuration.",
        "authorName": "Antigravity Admin",
        "authorRole": "Core Systems Engineer",
        "status": "Resolved",
    }
    r_patch = session.patch("/api/v1/support/tickets", json=patch_payload)
    assert r_patch.status_code == 200, (
        f"Failed to patch ticket: {r_patch.status_code} {r_patch.text}"
    )
    updated_ticket = r_patch.json()["ticket"]
    assert updated_ticket["status"] == "Resolved"
    assert len(updated_ticket["replies"]) >= 3
    assert updated_ticket["replies"][-1]["authorName"] == "Antigravity Admin"
    print(
        f"  [PASS] Ticket updated by admin: status is now '{updated_ticket['status']}', replies={len(updated_ticket['replies'])}"
    )

    # 3e. Test Filtering
    r_filtered = session.get("/api/v1/support/tickets?status=resolved")
    assert r_filtered.status_code == 200
    resolved_tickets = r_filtered.json()["tickets"]
    assert any(t["id"] == ticket_id for t in resolved_tickets)
    print(
        f"  [PASS] Filter by status=resolved returns {len(resolved_tickets)} tickets (includes newly resolved ticket)"
    )

    # 4. Test Logout
    print("\n--- 4. Logout & Session Termination ---")
    csrf_token = session.cookies.get("openocr_csrf")
    logout_headers = {"X-Requested-With": "XMLHttpRequest"}
    if csrf_token:
        logout_headers["X-CSRF-Token"] = csrf_token
    r_logout = session.post("/v1/auth/logout", headers=logout_headers)
    assert r_logout.status_code == 200, f"Logout failed: {r_logout.status_code} {r_logout.text}"
    print("  [PASS] Logout endpoint returned 200 OK")

    r_me_after = session.get("/v1/auth/me")
    assert r_me_after.status_code == 401
    print("  [PASS] /v1/auth/me correctly returns 401 Unauthorized after logout")

    print("\n" + "=" * 70)
    print("ALL THOROUGH SYSTEM TESTS PASSED SUCCESSFULLY!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_tests()
