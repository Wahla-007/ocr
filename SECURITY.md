# Security Policy

OpenOCR is committed to ensuring the security, integrity, and privacy of all user data and document intelligence pipelines. We adhere strictly to the principle of zero-trust architecture, constant-time cryptography, and zero-outbound-telemetry for air-gapped self-hosted deployments.

---

## Supported Versions

We actively provide security patches, CVE remediations, and dependency updates for the following releases:

| Version | Supported | Maintenance Status |
| :--- | :--- | :--- |
| `0.1.x` (Latest main) | :white_check_mark: Yes | Active Development & Nightly Scans |
| `< 0.1.0` | :x: No | Deprecated |

---

## Reporting a Vulnerability

If you discover a security vulnerability or potential exposure in OpenOCR, please report it immediately through our private vulnerability disclosure process rather than opening a public GitHub issue.

### Reporting Channels

1. **Email:** Send a detailed report to [security@openocr.io](mailto:security@openocr.io) or [support@openocr.io](mailto:support@openocr.io).
2. **Encrypted Submission:** For sensitive PoC payloads, contact the team for PGP public key exchange before transmission.

### Service Level Agreements (SLAs)

| Severity | First Response SLA | Triage & Remediation Plan | Public Advisory / Release |
| :--- | :--- | :--- | :--- |
| **Critical** (e.g. Remote Code Execution, Auth Bypass) | ≤ 12 hours | ≤ 24 hours | ≤ 72 hours |
| **High** (e.g. Privilege Escalation, Severe Denial of Service) | ≤ 24 hours | ≤ 48 hours | ≤ 7 calendar days |
| **Medium / Low** (e.g. Info Disclosure, CSRF bypass) | ≤ 48 hours | ≤ 5 business days | Next release cycle |

---

## Security Architecture & Guarantees

### 1. Air-Gapped / Self-Hosted Privacy Guarantee
- The default standalone mode (`extract_cli.py` and `docker-compose.selfhosted.yml`) operates **100% offline with zero outbound network calls**.
- No phone-home telemetry, analytics, or model downloading during runtime. All ONNX weights (RapidOCR) are locally verified and embedded.

### 2. Password & Credential Security
- NIST SP 800-63B compliant password verification (minimum 10 characters, upper/lower/digits/symbols).
- Proactive breach checking via HaveIBeenPwned k-anonymity SHA-1 range queries with explicit `usedforsecurity=False` tagging.
- Cryptographic hashing using Argon2id with work factors meeting modern OWASP guidelines.

### 3. Payment & Webhook Security
- PCI DSS SAQ-A compliance (no credit card or PAN data is ever ingested, processed, or stored on OpenOCR infrastructure).
- Constant-time HMAC-SHA512 verification (`hmac.compare_digest`) on all incoming webhook payloads before parsing.

### 4. Automated Scanning & Secret Detection
- Nightly automated static analysis with `bandit` and `pip-audit`.
- `npm audit` gates on frontend dependency trees.
- Zero committed credentials or private API keys policy (`gitleaks` compliant).
