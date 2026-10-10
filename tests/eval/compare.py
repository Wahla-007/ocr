"""Evaluation Benchmark Comparison Tool.

Compares two benchmark report JSON files and generates a comparative delta table:
- Classification accuracy delta
- Field extraction accuracy delta
- Latency deltas (total and per-stage)
- Cost variance (credits / tokens)
- Document-level regressions and improvements

Can be used via CLI:
    python tests/eval/compare.py <baseline_report.json> <candidate_report.json>
or programmatically:
    diff = compare_reports(base_path, candidate_path)
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def load_report(path: Path | str) -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Report file not found: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def compare_reports(
    baseline_path: Path | str,
    candidate_path: Path | str,
) -> dict[str, Any]:
    """Compares baseline and candidate reports, returning structured delta metrics."""
    base = load_report(baseline_path)
    cand = load_report(candidate_path)

    base_summary = base.get("summary_metrics", {})
    cand_summary = cand.get("summary_metrics", {})

    base_meta = base.get("benchmark_metadata", {})
    cand_meta = cand.get("benchmark_metadata", {})

    class_acc_base = base_summary.get("classification_accuracy", 0.0)
    class_acc_cand = cand_summary.get("classification_accuracy", 0.0)
    class_acc_delta = round(class_acc_cand - class_acc_base, 4)

    field_acc_base = base_summary.get("field_extraction_accuracy", 0.0)
    field_acc_cand = cand_summary.get("field_extraction_accuracy", 0.0)
    field_acc_delta = round(field_acc_cand - field_acc_base, 4)

    lat_base = base_summary.get("average_latency_ms", 0.0)
    lat_cand = cand_summary.get("average_latency_ms", 0.0)
    lat_delta = round(lat_cand - lat_base, 2)
    lat_pct_change = round(((lat_cand - lat_base) / lat_base * 100) if lat_base > 0 else 0.0, 2)

    cred_base = base_summary.get("total_credits_consumed", 0)
    cred_cand = cand_summary.get("total_credits_consumed", 0)
    cred_delta = cred_cand - cred_base

    # Per-document comparison
    base_docs = {d["file_name"]: d for d in base.get("document_results", [])}
    cand_docs = {d["file_name"]: d for d in cand.get("document_results", [])}

    doc_comparisons = []
    all_files = sorted(set(base_docs.keys()).union(cand_docs.keys()))

    for fname in all_files:
        b_d = base_docs.get(fname)
        c_d = cand_docs.get(fname)

        b_class = b_d["doc_type_correct"] if b_d else None
        c_class = c_d["doc_type_correct"] if c_d else None

        b_field_acc = b_d["field_accuracy"] if b_d else 0.0
        c_field_acc = c_d["field_accuracy"] if c_d else 0.0
        field_delta = round(c_field_acc - b_field_acc, 4)

        b_lat = b_d["latencies_ms"]["total"] if b_d else 0.0
        c_lat = c_d["latencies_ms"]["total"] if c_d else 0.0
        doc_lat_delta = round(c_lat - b_lat, 2)

        doc_comparisons.append({
            "file_name": fname,
            "base_class_correct": b_class,
            "candidate_class_correct": c_class,
            "base_field_acc": b_field_acc,
            "candidate_field_acc": c_field_acc,
            "field_acc_delta": field_delta,
            "base_latency_ms": b_lat,
            "candidate_latency_ms": c_lat,
            "latency_delta_ms": doc_lat_delta,
        })

    return {
        "metadata": {
            "baseline": {
                "engine_version": base_meta.get("engine_version", "unknown"),
                "prompt_version": base_meta.get("prompt_version", "unknown"),
                "timestamp": base_meta.get("timestamp", ""),
            },
            "candidate": {
                "engine_version": cand_meta.get("engine_version", "unknown"),
                "prompt_version": cand_meta.get("prompt_version", "unknown"),
                "timestamp": cand_meta.get("timestamp", ""),
            },
        },
        "summary_delta": {
            "classification_accuracy": {
                "baseline": class_acc_base,
                "candidate": class_acc_cand,
                "delta": class_acc_delta,
            },
            "field_extraction_accuracy": {
                "baseline": field_acc_base,
                "candidate": field_acc_cand,
                "delta": field_acc_delta,
            },
            "average_latency_ms": {
                "baseline": lat_base,
                "candidate": lat_cand,
                "delta": lat_delta,
                "pct_change": lat_pct_change,
            },
            "total_credits_consumed": {
                "baseline": cred_base,
                "candidate": cred_cand,
                "delta": cred_delta,
            },
        },
        "document_comparisons": doc_comparisons,
    }


def format_comparison_markdown(diff: dict[str, Any]) -> str:
    """Formats comparison output as GitHub-flavored markdown."""
    base_m = diff["metadata"]["baseline"]
    cand_m = diff["metadata"]["candidate"]
    s = diff["summary_delta"]

    def format_delta_pct(val: float) -> str:
        pct = val * 100
        if val > 0:
            return f"+{pct:.1f}% ⬆️"
        elif val < 0:
            return f"{pct:.1f}% ⬇️"
        return "0.0% (same)"

    def format_delta_num(val: float, unit: str = "") -> str:
        if val > 0:
            return f"+{val:.2f}{unit} ⬆️"
        elif val < 0:
            return f"{val:.2f}{unit} ⬇️"
        return f"0.00{unit} (same)"

    lines = [
        "# Benchmark Comparison Report",
        "",
        f"- **Baseline Run:** `{base_m['engine_version']}` ({base_m['prompt_version']}) at `{base_m['timestamp']}`",
        f"- **Candidate Run:** `{cand_m['engine_version']}` ({cand_m['prompt_version']}) at `{cand_m['timestamp']}`",
        "",
        "## Summary Metrics Comparison",
        "",
        "| Metric | Baseline | Candidate | Delta |",
        "|---|---|---|---|",
        f"| Classification Accuracy | {s['classification_accuracy']['baseline'] * 100:.1f}% | {s['classification_accuracy']['candidate'] * 100:.1f}% | **{format_delta_pct(s['classification_accuracy']['delta'])}** |",
        f"| Field Accuracy | {s['field_extraction_accuracy']['baseline'] * 100:.1f}% | {s['field_extraction_accuracy']['candidate'] * 100:.1f}% | **{format_delta_pct(s['field_extraction_accuracy']['delta'])}** |",
        f"| Average Latency | {s['average_latency_ms']['baseline']:.2f} ms | {s['average_latency_ms']['candidate']:.2f} ms | **{format_delta_num(s['average_latency_ms']['delta'], ' ms')}** ({s['average_latency_ms']['pct_change']}%) |",
        f"| Total Credits | {s['total_credits_consumed']['baseline']} | {s['total_credits_consumed']['candidate']} | **{s['total_credits_consumed']['delta']:+d}** |",
        "",
        "## Document-by-Document Variance",
        "",
        "| Document | Base Field Acc | Cand Field Acc | Field Delta | Base Latency | Cand Latency | Latency Delta |",
        "|---|---|---|---|---|---|---|",
    ]

    for d in diff["document_comparisons"]:
        delta_str = format_delta_pct(d["field_acc_delta"])
        lat_diff = format_delta_num(d["latency_delta_ms"], " ms")
        lines.append(
            f"| `{d['file_name']}` | {d['base_field_acc'] * 100:.1f}% | {d['candidate_field_acc'] * 100:.1f}% | {delta_str} | {d['base_latency_ms']:.1f} ms | {d['candidate_latency_ms']:.1f} ms | {lat_diff} |"
        )

    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compare two evaluation reports")
    parser.add_argument("baseline", help="Path to baseline report JSON")
    parser.add_argument("candidate", help="Path to candidate report JSON")
    parser.add_argument("--json", action="store_true", help="Output raw JSON comparison")
    args = parser.parse_args()

    diff_data = compare_reports(args.baseline, args.candidate)
    if args.json:
        print(json.dumps(diff_data, indent=2))
    else:
        print(format_comparison_markdown(diff_data))
