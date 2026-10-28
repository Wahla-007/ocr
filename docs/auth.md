# OpenOCR Production Authentication Architecture & Security Guide

This document details the production-grade authentication and session management architecture implemented in OpenOCR, conforming strictly to **OWASP ASVS (Level 2)**, the **OWASP Authentication, Session Management, Forgot Password, and CSRF Cheat Sheets**, and **NIST SP 800-63B**.

---

## 1. Architectural Overview

```
                                  +-----------------------------+
                                  |     Client Web App (Next.js) |
                                  +-----------------------------+
                                                 |
                   SameSite=Lax, HttpOnly Cookie | (CSPRNG 256-bit Token)
                   X-Requested-With / X-CSRF-Token |
                                                 v
                     +---------------------------------------+
                     |    Security Headers & CSRF Middleware |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |    FastAPI Authentication Router      |
                     +---------------------------------------+
                               /         |         \
                              /          |          \
                             v           v           v
           +--------------------+  +-----------+  +--------------------+
           | NIST Password Engine |  | Email Svc |  | DB Session Store   |
           | Argon2id (RFC 9106)  |  | (Fail-Safe|  | (SHA-256 Hashed    |
           | HIBP k-Anonymity     |  | Queuing)  |  |  Session & Tokens) |
           +--------------------+  +-----------+  +--------------------+
```

---

## 2. Threat Model & Mitigations

| Threat | ASVS / NIST Control | OpenOCR Implementation |
| :--- | :--- | :--- |
| **Credential Stuffing & Leaked Passwords** | NIST SP 800-63B §5.1.1.2 | Passwords checked against HaveIBeenPwned k-anonymity API (first 5 SHA-1 chars). Fails open with logging if external API unreachable. |
| **Trivial Passwords** | NIST SP 800-63B §5.1.1.1 | Minimum 12 characters, max 128 (never truncated), all Unicode/spaces allowed, `zxcvbn` dictionary scoring. Contextual check rejects email local-part containment. |
| **Account Enumeration** | ASVS V2.1.8 | Identical response bodies, status codes, and execution timing on `/signup`, `/login`, and `/forgot-password`. Dummy Argon2id hash computation on non-existent emails eliminates timing oracles. |
| **Brute Force & DoS Lockouts** | ASVS V2.2.1 | Rate limited per IP and account email. 5 consecutive failures triggers a 15-minute temporary lockout. User warned via email upon lockout. |
| **Session Fixation** | ASVS V3.3.1 | Session ID rotated upon login and password reset. Old session revoked server-side immediately. |
| **Session Hijacking / XSS Theft** | ASVS V3.4.1 | 256-bit CSPRNG token stored only as SHA-256 hash in DB. Cookie configured with `HttpOnly`, `SameSite=Lax`, `Secure`, explicit `Path=/`, and `__Host-` prefix over HTTPS. |
| **Cross-Site Request Forgery (CSRF)** | ASVS V4.2.2 | `SameSite=Lax` cookies + custom `X-Requested-With` header requirement on state-changing session requests. Origin allowlist verified. |
| **Clickjacking** | ASVS V14.4.1 | Strict `X-Frame-Options: DENY` and `frame-ancestors 'none'` in CSP. |
| **Open Redirects** | ASVS V5.1.5 | Redirect validation against internal relative allowlist (must begin with `/`, reject `//`, `/\`, or external schemes). |

---

## 3. Cryptography & Password Hashing

### Argon2id Parameters (OWASP Recommended)
- **Algorithm**: `Argon2id` (RFC 9106)
- **Time Cost (Iterations)**: 3
- **Memory Cost**: 64 MiB (`65536 KiB`)
- **Parallelism**: 4 threads
- **Salt**: 16 bytes cryptographically random, unique per password
- **Hash Length**: 32 bytes
- **Transparent Rehash**: Password hashes are re-evaluated on successful login with `ph.check_needs_rehash()`. If system parameters upgrade, hashes are automatically re-hashed with zero user disruption.
- **Constant Timing Parity**: A pre-computed dummy Argon2id hash is verified whenever an email does not exist in the database, preventing timing-based user enumeration.

---

## 4. Endpoints Specification (`/v1/auth/*`)

| Endpoint | Method | Description | Security Controls |
| :--- | :--- | :--- | :--- |
| `/v1/auth/signup` | `POST` | User registration | NIST length & complexity, HIBP check, NFKC email normalization, honeypot trap, anti-enumeration identical response, race condition protection. |
| `/v1/auth/verify-email` | `POST` | Email address confirmation | Single-use 256-bit token hash verification, 24-hour expiry, constant-time comparison. |
| `/v1/auth/resend-verification` | `POST` | Resend verification email | Enumeration-resistant generic response, old tokens revoked. |
| `/v1/auth/login` | `POST` | User authentication | Generic error ("Invalid email or password"), dummy verify timing parity, 5-failure lockout, session rotation, HttpOnly cookie set. |
| `/v1/auth/logout` | `POST` | Invalidate session | Server-side DB revocation (`revoked_at`), cookie cleared. |
| `/v1/auth/me` | `GET` | Current user profile | Requires active, unexpired, unrevoked session. Updates `last_seen_at`. |
| `/v1/auth/sessions` | `GET` | List active sessions | Displays device IP, user agent, created time, last seen time, and `is_current` flag. |
| `/v1/auth/sessions/revoke-all` | `POST` | Revoke other devices | Terminates all other active sessions for user. |
| `/v1/auth/forgot-password` | `POST` | Password reset dispatch | Anti-enumeration identical response, 15-minute single-use token hash stored. |
| `/v1/auth/reset-password` | `POST` | Set new password | NIST validation, HIBP check, immediate revocation of ALL active sessions, notification email dispatched. |

---

## 5. Environment Variables & Secret Rotation

### Required & Optional Variables
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `API_SECRET_KEY` | **Yes** | (Random 32+ chars) | Base application secret key for signing. |
| `AUTH_PASSWORD_PEPPER` | Optional | `""` | Optional server-side pepper combined with passwords before Argon2id hashing. |
| `CORS_ORIGINS` | **Yes** | `["http://localhost:3000"]` | Explicit CORS origin allowlist (no wildcards). |
| `ENV` | **Yes** | `development` | When set to `production`, enforces HTTPS HSTS, `Secure` cookies, and `__Host-` prefix. |

### How to Rotate Secrets

1. **Rotating `API_SECRET_KEY`**:
   - Update `API_SECRET_KEY` in environment config or secret manager (e.g. AWS Secrets Manager, HashiCorp Vault).
   - Redeploy the API container.
2. **Rotating Pepper (`AUTH_PASSWORD_PEPPER`)**:
   - To perform a zero-downtime pepper rotation, configure dual-pepper verification in `app/security/password.py`:
     1. Attempt verify with the new pepper.
     2. If mismatch, attempt verify with the legacy pepper.
     3. On success with legacy pepper, rehash with the new pepper and update the database row.
3. **Session Invalidation**:
   - If an operational breach is suspected, run `UPDATE sessions SET revoked_at = NOW() WHERE revoked_at IS NULL;` in the database to instantly terminate all active sessions worldwide.

---

## 6. Pre-Launch Security Checklist

- [x] **Database Constraints**: `users.email` and `sessions.session_hash` have unique database indexes.
- [x] **No Secrets in Repo**: `.env` and `.env.local` are in `.gitignore`. `.env.example` contains only placeholders.
- [x] **Cryptographic Standards**: Argon2id (RFC 9106) with OWASP parameters and CSPRNG 256-bit tokens.
- [x] **Anti-Enumeration**: Consistent timing, generic status/body parity on signup, login, and forgot-password.
- [x] **NIST SP 800-63B Compliance**: 12–128 character passwords, no composition rules, all Unicode & spaces preserved, HIBP k-anonymity breach verification.
- [x] **Session Hardening**: Server-side hashed sessions, `HttpOnly`, `SameSite=Lax`, `Path=/`, and `__Host-` cookie prefix over HTTPS.
- [x] **Security Headers**: CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- [ ] **Production Email Domain Configuration**: Configure SPF (`v=spf1 ...`), DKIM, and DMARC (`p=reject`) on the transactional email domain to prevent spoofing of verification and reset emails.
- [ ] **HTTPS / TLS 1.3**: Terminate TLS at the load balancer / reverse proxy with automatic HTTP-to-HTTPS redirect.
- [ ] **Audit Logs**: Forward auth security audit logs to SIEM/Datadog for automated alerting on consecutive lockout events.
