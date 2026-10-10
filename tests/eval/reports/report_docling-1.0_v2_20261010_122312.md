# Evaluation Benchmark Report: docling-1.0 (v2)

- **Timestamp**: `2026-10-10T12:23:12.580879+00:00`
- **LLM Provider**: `gemini`
- **Documents Evaluated**: `5`

## Summary Metrics

| Metric | Value |
|---|---|
| Classification Accuracy | **100.0%** |
| Field Extraction Accuracy | **100.0%** |
| Average Latency | **55.82 ms** |
| Total Credits Charged | **14** |

## Per-Document Breakdown

| Document | Expected Type | Predicted Type | Match | Field Acc | Latency (ms) | Credits |
|---|---|---|---|---|---|---|
| `clean_invoice.pdf` | `invoice` | `invoice` | ✅ | 100.0% | 84.99 ms | 2 |
| `multipage_report.pdf` | `unknown` | `unknown` | ✅ | 100.0% | 114.9 ms | 6 |
| `phone_receipt.jpg` | `receipt` | `receipt` | ✅ | 100.0% | 18.23 ms | 2 |
| `rotated_id.png` | `id_card` | `id_card` | ✅ | 100.0% | 13.63 ms | 2 |
| `scanned_contract.pdf` | `contract` | `contract` | ✅ | 100.0% | 47.35 ms | 2 |

## Field-Level Validation Details

### `clean_invoice.pdf` (invoice)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `invoice_number` | `INV-2026-0042` | `INV-2026-0042` | ✅ Match |
| `issue_date` | `2026-10-06` | `2026-10-06` | ✅ Match |
| `due_date` | `2026-11-06` | `2026-11-06` | ✅ Match |
| `total_amount` | `11275.0` | `11275.0` | ✅ Match |
| `currency` | `USD` | `USD` | ✅ Match |

### `multipage_report.pdf` (unknown)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `document_title` | `Document` | `Document` | ✅ Match |
| `summary_detail` | `General content extracted` | `General content extracted` | ✅ Match |

### `phone_receipt.jpg` (receipt)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `merchant_name` | `Supermarket Metro` | `Supermarket Metro` | ✅ Match |
| `receipt_date` | `2026-10-06 14:32:01` | `2026-10-06 14:32:01` | ✅ Match |
| `total_amount` | `36.09` | `36.09` | ✅ Match |
| `tax_amount` | `2.83` | `2.83` | ✅ Match |

### `rotated_id.png` (id_card)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `full_name` | `Jane Doe` | `Jane Doe` | ✅ Match |
| `id_number` | `ID-98472918` | `ID-98472918` | ✅ Match |
| `date_of_birth` | `1990-05-14` | `1990-05-14` | ✅ Match |
| `nationality` | `USA` | `USA` | ✅ Match |

### `scanned_contract.pdf` (contract)
| Field Key | Expected Value | Predicted Value | Status |
|---|---|---|---|
| `document_title` | `Document` | `Document` | ✅ Match |
| `summary_detail` | `General content extracted` | `General content extracted` | ✅ Match |
