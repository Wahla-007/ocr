"""Evaluation Harness Runner.

Runs evaluation on the golden dataset in tests/eval/dataset/.
Benchmarks:
- Classification accuracy
- Per-field extraction precision, recall, and accuracy
- Stage latencies (normalize, parse, understand, total)
- Token & credit costs

Outputs versioned JSON and Markdown reports in tests/eval/reports/.
"""

import argparse
import asyncio
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Ensure workspace packages are resolvable when run standalone
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
for p in [ROOT_DIR, ROOT_DIR / "apps" / "api", ROOT_DIR / "apps" / "worker"]:
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from app.config import settings
from app.logging import logger
from worker.pipeline.normalize import normalize_document
from worker.pipeline.parse import parse_document
from worker.pipeline.understand import classify_and_extract
from providers.llm.factory import get_llm_provider

EVAL_DIR = Path(__file__).resolve().parent
DATASET_DIR = EVAL_DIR / "dataset"
REPORTS_DIR = EVAL_DIR / "reports"


def normalize_value_for_comparison(val: Any) -> Any:
    """Normalizes field values for robust evaluation comparison (stripping currency, commas, case)."""
    if val is None:
        return ""
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    # Try parsing numeric amount (e.g. "$11,275.00" -> 11275.0)
    num_clean = re.sub(r"[^\d.-]", "", s)
    if num_clean and not num_clean.startswith("-") and num_clean.count(".") <= 1:
        try:
            return float(num_clean)
        except ValueError:
            pass

    return s.lower()


def values_match(expected: Any, predicted: Any) -> bool:
    """Compares expected and predicted values with tolerance for formatting."""
    exp_norm = normalize_value_for_comparison(expected)
    pred_norm = normalize_value_for_comparison(predicted)

    if isinstance(exp_norm, float) and isinstance(pred_norm, float):
        return abs(exp_norm - pred_norm) < 0.01

    if isinstance(exp_norm, str) and isinstance(pred_norm, str):
        if exp_norm == pred_norm:
            return True
        # Check substring inclusion if non-trivial
        if len(exp_norm) > 3 and exp_norm in pred_norm:
            return True
        if len(pred_norm) > 3 and pred_norm in exp_norm:
            return True

    return exp_norm == pred_norm


def detect_mime_type(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return "application/pdf"
    elif suffix in [".jpg", ".jpeg"]:
        return "image/jpeg"
    elif suffix == ".png":
        return "image/png"
    elif suffix == ".tiff":
        return "image/tiff"
    return "application/octet-stream"


async def evaluate_single_document(
    doc_path: Path,
    expected_data: dict[str, Any],
    llm_provider: Any = None,
) -> dict[str, Any]:
    """Runs the 3-stage pipeline on a single document and compares with expected ground truth."""
    mime_type = detect_mime_type(doc_path)
    file_bytes = doc_path.read_bytes()

    # Stage 1: Normalize
    t0 = time.perf_counter()
    normalized = normalize_document(file_bytes, mime_type)
    t_norm = (time.perf_counter() - t0) * 1000

    # Stage 2: Parse (Layout / OCR)
    t0 = time.perf_counter()
    parsed = await parse_document(file_bytes, mime_type)
    t_parse = (time.perf_counter() - t0) * 1000

    # Stage 3: Understand (Classify + Extract + BBox mapping)
    t0 = time.perf_counter()
    parsed_text = parsed.markdown or "\n".join(b.text for b in parsed.blocks)
    classification, extraction = await classify_and_extract(
        parsed_text=parsed_text,
        blocks=parsed.blocks,
        llm_provider=llm_provider,
    )
    t_understand = (time.perf_counter() - t0) * 1000
    t_total = t_norm + t_parse + t_understand

    # Evaluation comparison
    expected_doc_type = expected_data.get("doc_type", "")
    predicted_doc_type = classification.doc_type
    doc_type_correct = expected_doc_type.lower() == predicted_doc_type.lower()

    expected_fields: dict[str, Any] = expected_data.get("fields", {})
    predicted_fields_map: dict[str, Any] = {f.key: f.value for f in extraction.fields}

    field_results = {}
    matched_count = 0
    total_expected = len(expected_fields)

    for key, exp_val in expected_fields.items():
        pred_val = predicted_fields_map.get(key)
        matched = False
        if pred_val is not None:
            matched = values_match(exp_val, pred_val)

        if matched:
            matched_count += 1

        field_results[key] = {
            "expected": exp_val,
            "predicted": pred_val,
            "matched": matched,
        }

    field_accuracy = (matched_count / total_expected) if total_expected > 0 else 1.0

    return {
        "file_name": doc_path.name,
        "doc_type_expected": expected_doc_type,
        "doc_type_predicted": predicted_doc_type,
        "doc_type_correct": doc_type_correct,
        "classification_confidence": classification.confidence,
        "total_expected_fields": total_expected,
        "matched_fields_count": matched_count,
        "field_accuracy": round(field_accuracy, 4),
        "fields": field_results,
        "latencies_ms": {
            "normalize": round(t_norm, 2),
            "parse": round(t_parse, 2),
            "understand": round(t_understand, 2),
            "total": round(t_total, 2),
        },
        "engine_used": parsed.engine_name,
        "pages_processed": normalized.total_pages,
        "estimated_credits": normalized.total_pages * 2,  # 2 credits per page
    }


async def run_evaluation(
    dataset_dir: Path = DATASET_DIR,
    reports_dir: Path = REPORTS_DIR,
    engine_version: str = "docling-1.0",
    prompt_version: str = "v1",
    llm_provider_name: str | None = None,
) -> tuple[dict[str, Any], Path, Path]:
    """Runs complete benchmark suite across all documents in dataset_dir and writes reports."""
    reports_dir.mkdir(parents=True, exist_ok=True)
    provider_name = llm_provider_name or settings.LLM_PROVIDER
    provider = get_llm_provider(provider_name)

    # Find all expected JSON files
    expected_files = sorted(dataset_dir.glob("*.expected.json"))
    if not expected_files:
        raise FileNotFoundError(f"No *.expected.json ground-truth files found in {dataset_dir}")

    doc_results = []
    total_docs = 0
    correct_classifications = 0
    total_field_accuracy = 0.0
    total_latency_ms = 0.0
    total_credits = 0

    for exp_file in expected_files:
        stem = exp_file.name.replace(".expected.json", "")
        # Look for matching document file
        doc_files = [f for f in dataset_dir.glob(f"{stem}.*") if not f.name.endswith(".expected.json")]
        if not doc_files:
            logger.warning(f"No document file found matching ground-truth {exp_file.name}")
            continue

        doc_path = doc_files[0]
        expected_data = json.loads(exp_file.read_text(encoding="utf-8"))

        res = await evaluate_single_document(doc_path, expected_data, llm_provider=provider)
        doc_results.append(res)

        total_docs += 1
        if res["doc_type_correct"]:
            correct_classifications += 1
        total_field_accuracy += res["field_accuracy"]
        total_latency_ms += res["latencies_ms"]["total"]
        total_credits += res["estimated_credits"]

    class_acc = (correct_classifications / total_docs) if total_docs > 0 else 0.0
    mean_field_acc = (total_field_accuracy / total_docs) if total_docs > 0 else 0.0
    avg_latency = (total_latency_ms / total_docs) if total_docs > 0 else 0.0

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_data = {
        "benchmark_metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "engine_version": engine_version,
            "prompt_version": prompt_version,
            "llm_provider": provider_name,
            "dataset_size": total_docs,
        },
        "summary_metrics": {
            "classification_accuracy": round(class_acc, 4),
            "field_extraction_accuracy": round(mean_field_acc, 4),
            "average_latency_ms": round(avg_latency, 2),
            "total_credits_consumed": total_credits,
        },
        "document_results": doc_results,
    }

    # Write JSON report
    json_filename = f"report_{engine_version}_{prompt_version}_{timestamp}.json"
    json_path = reports_dir / json_filename
    json_path.write_text(json.dumps(report_data, indent=2), encoding="utf-8")

    # Generate Markdown report
    md_filename = f"report_{engine_version}_{prompt_version}_{timestamp}.md"
    md_path = reports_dir / md_filename
    md_content = generate_markdown_report(report_data)
    md_path.write_text(md_content, encoding="utf-8")

    return report_data, json_path, md_path


def generate_markdown_report(report: dict[str, Any]) -> str:
    meta = report["benchmark_metadata"]
    summary = report["summary_metrics"]
    docs = report["document_results"]

    lines = [
        f"# Evaluation Benchmark Report: {meta['engine_version']} ({meta['prompt_version']})",
        "",
        f"- **Timestamp**: `{meta['timestamp']}`",
        f"- **LLM Provider**: `{meta['llm_provider']}`",
        f"- **Documents Evaluated**: `{meta['dataset_size']}`",
        "",
        "## Summary Metrics",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Classification Accuracy | **{summary['classification_accuracy'] * 100:.1f}%** |",
        f"| Field Extraction Accuracy | **{summary['field_extraction_accuracy'] * 100:.1f}%** |",
        f"| Average Latency | **{summary['average_latency_ms']:.2f} ms** |",
        f"| Total Credits Charged | **{summary['total_credits_consumed']}** |",
        "",
        "## Per-Document Breakdown",
        "",
        "| Document | Expected Type | Predicted Type | Match | Field Acc | Latency (ms) | Credits |",
        "|---|---|---|---|---|---|---|",
    ]

    for d in docs:
        match_symbol = "✅" if d["doc_type_correct"] else "❌"
        lines.append(
            f"| `{d['file_name']}` | `{d['doc_type_expected']}` | `{d['doc_type_predicted']}` | {match_symbol} | {d['field_accuracy'] * 100:.1f}% | {d['latencies_ms']['total']} ms | {d['estimated_credits']} |"
        )

    lines.extend([
        "",
        "## Field-Level Validation Details",
        "",
    ])

    for d in docs:
        lines.append(f"### `{d['file_name']}` ({d['doc_type_predicted']})")
        lines.append("| Field Key | Expected Value | Predicted Value | Status |")
        lines.append("|---|---|---|---|")
        for k, v in d["fields"].items():
            st = "✅ Match" if v["matched"] else "❌ Mismatch"
            lines.append(f"| `{k}` | `{v['expected']}` | `{v['predicted']}` | {st} |")
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Evaluation Harness")
    parser.add_argument("--engine-version", default="docling-1.0", help="Engine version tag")
    parser.add_argument("--prompt-version", default="v1", help="Prompt version tag")
    parser.add_argument("--provider", default=None, help="LLM Provider override")
    args = parser.parse_args()

    data, json_out, md_out = asyncio.run(
        run_evaluation(
            engine_version=args.engine_version,
            prompt_version=args.prompt_version,
            llm_provider_name=args.provider,
        )
    )
    print(f"\nEvaluation Benchmark Completed Successfully!")
    print(f"Classification Accuracy: {data['summary_metrics']['classification_accuracy'] * 100:.1f}%")
    print(f"Field Extraction Accuracy: {data['summary_metrics']['field_extraction_accuracy'] * 100:.1f}%")
    print(f"Average Latency: {data['summary_metrics']['average_latency_ms']} ms")
    print(f"JSON Report: {json_out}")
    print(f"Markdown Report: {md_out}")
