# Evaluation Harness & Golden Dataset

This directory contains the production-grade evaluation and benchmarking harness for the OpenOCR document extraction pipeline.

It validates extraction accuracy, classification accuracy, stage latencies, and credit consumption across document types and engine/prompt versions.

---

## 1. Directory Structure

```
tests/eval/
├── README.md                      # This documentation
├── runner.py                      # Core evaluation benchmark runner
├── compare.py                     # Report comparison & delta analysis tool
├── dataset/                       # Golden evaluation dataset
│   ├── clean_invoice.pdf
│   ├── clean_invoice.expected.json
│   ├── phone_receipt.jpg
│   ├── phone_receipt.expected.json
│   ├── rotated_id.png
│   ├── rotated_id.expected.json
│   ├── scanned_contract.pdf
│   ├── scanned_contract.expected.json
│   ├── multipage_report.pdf
│   └── multipage_report.expected.json
└── reports/                       # Versioned benchmark outputs (.json & .md)
    ├── report_docling-1.0_v1_YYYYMMDD_HHMMSS.json
    └── report_docling-1.0_v1_YYYYMMDD_HHMMSS.md
```

---

## 2. Running an Evaluation Benchmark

To run the evaluation harness against the golden dataset:

```powershell
# Using the default virtual environment
.venv\Scripts\python.exe tests/eval/runner.py

# Or specifying engine version and prompt version tags
.venv\Scripts\python.exe tests/eval/runner.py --engine-version docling-1.0 --prompt-version v1

# Or running against a specific LLM provider
.venv\Scripts\python.exe tests/eval/runner.py --provider mock-llm
```

### What the Runner Does:
1. Reads all documents and their corresponding `*.expected.json` files in `dataset/`.
2. Passes each document through the 3-stage pipeline:
   - **Stage 1 (Normalize):** PyMuPDF rendering, EXIF auto-rotation, resolution capping.
   - **Stage 2 (Parse):** Layout analysis, bounding box extraction, table structure.
   - **Stage 3 (Understand):** Classification, schema extraction / discovery, bbox coordinate mapping.
3. Compares predictions with ground-truth expected values.
4. Generates two timestamped, versioned reports in `tests/eval/reports/`:
   - A machine-readable `.json` report with per-stage latencies, exact matches, and field deltas.
   - A clean GitHub-flavored `.md` report containing formatted summary tables.

---

## 3. Comparing Two Benchmark Runs

To compare a candidate run against a baseline (e.g. after changing prompts, models, or OCR engines):

```powershell
.venv\Scripts\python.exe tests/eval/compare.py tests/eval/reports/report_baseline.json tests/eval/reports/report_candidate.json
```

Outputs a comparison report showing:
- Classification accuracy delta (`+5.0% ⬆️` or `-2.0% ⬇️`)
- Field extraction accuracy delta
- Latency change in milliseconds and percentage (`+45.2 ms (+12.4%)`)
- Credit / token cost variance
- Per-document performance diffs

Add `--json` to output machine-readable diffs for CI pipelines:
```powershell
.venv\Scripts\python.exe tests/eval/compare.py report_base.json report_cand.json --json
```

---

## 4. How to Add New Test Documents

Adding custom documents to the golden evaluation set is simple:

### Step 1: Add Document File
Place your document into `tests/eval/dataset/`:
- E.g.: `tests/eval/dataset/my_vendor_bill.pdf` (or `.jpg`, `.png`, `.tiff`).

### Step 2: Create Matching Ground-Truth JSON
Create a file with the exact same stem name and `.expected.json` suffix:
- E.g.: `tests/eval/dataset/my_vendor_bill.expected.json`

```json
{
  "doc_type": "invoice",
  "fields": {
    "invoice_number": "INV-9901",
    "issue_date": "2026-10-10",
    "due_date": "2026-11-10",
    "total_amount": 450.00,
    "currency": "USD"
  }
}
```

### Step 3: Run Benchmark
Re-run `runner.py`:
```powershell
.venv\Scripts\python.exe tests/eval/runner.py
```
The harness will automatically pick up your new document and include it in all summary metrics and reports.
