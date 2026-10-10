# Evaluation Benchmark Report: docling-rapidocr-1.0 (v1)

- **Timestamp**: `2026-10-10T13:09:04.140026+00:00`
- **LLM Provider**: `gemini`
- **Documents Evaluated**: `5`

## Summary Metrics

| Metric | Value |
|---|---|
| Classification Accuracy | **100.0%** |
| Field Extraction Accuracy | **82.0%** |
| Average Latency | **2083.22 ms** |
| Total Credits Charged | **14** |

## Per-Document Breakdown

| Document | Expected Type | Predicted Type | Match | Field Acc | Latency (ms) | Credits |
|---|---|---|---|---|---|---|
| `clean_invoice.pdf` | `invoice` | `invoice` | ✅ | 60.0% | 80.2 ms | 2 |
| `multipage_report.pdf` | `unknown` | `unknown` | ✅ | 100.0% | 109.35 ms | 6 |
| `phone_receipt.jpg` | `receipt` | `receipt` | ✅ | 50.0% | 4722.13 ms | 2 |
| `rotated_id.png` | `id_card` | `id_card` | ✅ | 100.0% | 1960.52 ms | 2 |
| `scanned_contract.pdf` | `contract` | `contract` | ✅ | 100.0% | 3543.88 ms | 2 |

## Field-Level Validation Details

### `clean_invoice.pdf` (invoice)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `invoice_number` | `INV-2026-0042` | `Invoice` | ❌ Mismatch |
| `issue_date` | `2026-10-06` | `2026-10-06` | ✅ Match |
| `due_date` | `2026-11-06` | `2026-11-06` | ✅ Match |
| `total_amount` | `11275.0` | `10250.0` | ❌ Mismatch |
| `currency` | `USD` | `USD` | ✅ Match |

### `multipage_report.pdf` (unknown)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `document_title` | `Document` | `Document` | ✅ Match |
| `summary_detail` | `General content extracted` | `General content extracted` | ✅ Match |

### `phone_receipt.jpg` (receipt)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `merchant_name` | `Supermarket Metro` | `SUPERMARKETMETRO` | ❌ Mismatch |
| `receipt_date` | `2026-10-06 14:32:01` | `2026-10-06 14:32:01` | ✅ Match |
| `total_amount` | `36.09` | `33.26` | ❌ Mismatch |
| `tax_amount` | `2.83` | `2.83` | ✅ Match |

### `rotated_id.png` (id_card)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `full_name` | `Jane Doe` | `JANE DOE

NATIONAL IDENTITYCARD` | ✅ Match |
| `id_number` | `ID-98472918` | `ID-98472918` | ✅ Match |
| `date_of_birth` | `1990-05-14` | `1990-05-14` | ✅ Match |
| `nationality` | `USA` | `USA` | ✅ Match |

### `scanned_contract.pdf` (contract)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `document_title` | `Document` | `Document` | ✅ Match |
| `summary_detail` | `General content extracted` | `General content extracted` | ✅ Match |
