# Contributing to OpenOCR

Thank you for your interest in contributing to OpenOCR! We welcome contributions that maintain our high bar for performance, security, test integrity, and self-hosted reliability.

Please read this guide before opening issues or submitting pull requests.

---

## Code of Conduct & Ground Rules

1. **Measure before changing:** Never claim "this makes it faster" without an accompanying before/after benchmark using reproducible test data.
2. **Tests protect behavior:** Never delete or weaken a test because it is failing. If code behavior changed intentionally, update both the test and documentation with clear rationale.
3. **Self-hosted first:** Self-hosted is a first-class citizen. Any feature that requires an outbound third-party cloud service must provide a pure local CPU/GPU fallback (e.g. RapidOCR, mock providers).
4. **Air-gap compliance:** Features must continue working offline without internet access.

---

## Development Environment Setup

OpenOCR uses `uv` for lightning-fast Python dependency management and `npm` for the Next.js frontend web interface.

### Prerequisites
- Python 3.11+
- Node.js 18+ and `npm`
- `uv` (Fast Python package manager): `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`

### Quickstart Setup

```bash
# 1. Clone repository
git clone https://github.com/openocr-org/openocr.git
cd openocr

# 2. Set up Python virtual environment with all dependencies
uv sync

# 3. Set up Frontend Web Application
cd apps/web
npm install
cd ../..
```

---

## Running Locally

### 1. Standalone Self-Hosted CLI (No services required)
Test document extraction instantly using the local CPU inference engine:
```bash
uv run python extract_cli.py path/to/document.pdf
```

### 2. Full Stack (API + Web UI)
Terminal 1 (Backend API):
```bash
cd apps/api
uv run uvicorn app.main:app --reload --port 8000
```

Terminal 2 (Frontend Web App):
```bash
cd apps/web
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality & Testing Gates

All PRs must pass the standard quality suite before merging:

### 1. Test Suite & Coverage
```bash
# Run complete test suite with coverage
uv run pytest --cov=apps/api/app --cov=apps/worker/worker

# Run commercial metering test suite specifically
uv run pytest tests/test_api_metering.py -v
```

### 2. Linting & Formatting
```bash
# Check Python lint rules
uv run ruff check .

# Check Python formatting
uv run ruff format --check .

# Frontend type checking
cd apps/web && npm run type-check && cd ../..
```

### 3. Security Analysis (SAST & Vulnerability Audits)
```bash
# SAST security scanning (must have 0 High severity issues)
uv run bandit -r apps/api/app apps/worker/worker

# Dependency vulnerability scanning (must have 0 CVEs)
uv run pip-audit

# Frontend audit
cd apps/web && npm audit && cd ../..
```

---

## Pull Request Checklist

Before submitting your PR, ensure:
- [ ] Code is formatted with `uv run ruff format .`
- [ ] Lint checks pass with `uv run ruff check .`
- [ ] All tests pass (`uv run pytest`)
- [ ] No hardcoded secrets, API keys, or private tokens committed
- [ ] Documentation updated in `docs/` or `README.md` if public API or behavior changed
- [ ] `CHANGELOG.md` entry added summarizing changes
