"""Tests for Phase 5 Evaluation Harness and Comparison Tool."""

import json
from pathlib import Path

import pytest

from tests.eval.compare import compare_reports, format_comparison_markdown
from tests.eval.runner import (
    evaluate_single_document,
    run_evaluation,
    values_match,
)


def test_values_match_numeric():
    assert values_match(11275.0, 11275.0)
    assert values_match("$11,275.00", 11275.0)
    assert values_match("11275.00", 11275.0)
    assert values_match(36.09, "36.09")
    assert values_match("$36.09", 36.09)
    assert not values_match(36.09, 40.0)


def test_values_match_string():
    assert values_match("INV-2026-0042", "inv-2026-0042")
    assert values_match("Supermarket Metro", "SUPERMARKET METRO")
    assert values_match("Jane Doe", "Jane Doe")
    assert values_match("Jane Doe", "Jane Doe ")
    assert not values_match("Jane Doe", "John Smith")


@pytest.mark.asyncio
async def test_evaluate_single_document():
    dataset_dir = Path(__file__).resolve().parent / "eval" / "dataset"
    doc_path = dataset_dir / "clean_invoice.pdf"
    exp_path = dataset_dir / "clean_invoice.expected.json"

    assert doc_path.exists(), f"File missing: {doc_path}"
    assert exp_path.exists(), f"File missing: {exp_path}"

    expected_data = json.loads(exp_path.read_text(encoding="utf-8"))
    result = await evaluate_single_document(doc_path, expected_data)

    assert result["file_name"] == "clean_invoice.pdf"
    assert result["doc_type_expected"] == "invoice"
    assert result["doc_type_predicted"] == "invoice"
    assert result["doc_type_correct"] is True
    assert result["field_accuracy"] > 0.0
    assert "latencies_ms" in result
    assert result["latencies_ms"]["total"] > 0
    assert result["estimated_credits"] > 0


@pytest.mark.asyncio
async def test_run_evaluation(tmp_path):
    dataset_dir = Path(__file__).resolve().parent / "eval" / "dataset"
    reports_dir = tmp_path / "reports"

    data, json_path, md_path = await run_evaluation(
        dataset_dir=dataset_dir,
        reports_dir=reports_dir,
        engine_version="test-engine-1.0",
        prompt_version="v1",
        llm_provider_name="mock-llm",
    )

    assert json_path.exists()
    assert md_path.exists()
    assert data["benchmark_metadata"]["dataset_size"] >= 5
    assert data["summary_metrics"]["classification_accuracy"] == 1.0
    assert data["summary_metrics"]["field_extraction_accuracy"] > 0.8
    assert data["summary_metrics"]["average_latency_ms"] > 0

    # Verify JSON content
    saved_json = json.loads(json_path.read_text(encoding="utf-8"))
    assert saved_json["benchmark_metadata"]["engine_version"] == "test-engine-1.0"
    assert len(saved_json["document_results"]) >= 5

    # Verify Markdown content
    saved_md = md_path.read_text(encoding="utf-8")
    assert "# Evaluation Benchmark Report" in saved_md
    assert "Summary Metrics" in saved_md
    assert "Field-Level Validation Details" in saved_md


def test_compare_reports(tmp_path):
    # Create two synthetic reports to test comparison logic
    report_base = {
        "benchmark_metadata": {
            "timestamp": "2026-10-10T10:00:00",
            "engine_version": "engine-v1",
            "prompt_version": "v1",
            "llm_provider": "mock",
            "dataset_size": 2,
        },
        "summary_metrics": {
            "classification_accuracy": 0.80,
            "field_extraction_accuracy": 0.85,
            "average_latency_ms": 200.0,
            "total_credits_consumed": 10,
        },
        "document_results": [
            {
                "file_name": "doc1.pdf",
                "doc_type_correct": True,
                "field_accuracy": 0.9,
                "latencies_ms": {"total": 180.0},
            },
            {
                "file_name": "doc2.pdf",
                "doc_type_correct": False,
                "field_accuracy": 0.8,
                "latencies_ms": {"total": 220.0},
            },
        ],
    }

    report_cand = {
        "benchmark_metadata": {
            "timestamp": "2026-10-10T12:00:00",
            "engine_version": "engine-v2",
            "prompt_version": "v2",
            "llm_provider": "mock",
            "dataset_size": 2,
        },
        "summary_metrics": {
            "classification_accuracy": 1.00,
            "field_extraction_accuracy": 0.95,
            "average_latency_ms": 150.0,
            "total_credits_consumed": 10,
        },
        "document_results": [
            {
                "file_name": "doc1.pdf",
                "doc_type_correct": True,
                "field_accuracy": 1.0,
                "latencies_ms": {"total": 140.0},
            },
            {
                "file_name": "doc2.pdf",
                "doc_type_correct": True,
                "field_accuracy": 0.9,
                "latencies_ms": {"total": 160.0},
            },
        ],
    }

    base_path = tmp_path / "base.json"
    cand_path = tmp_path / "cand.json"
    base_path.write_text(json.dumps(report_base), encoding="utf-8")
    cand_path.write_text(json.dumps(report_cand), encoding="utf-8")

    diff = compare_reports(base_path, cand_path)
    assert diff["summary_delta"]["classification_accuracy"]["delta"] == 0.20
    assert diff["summary_delta"]["field_extraction_accuracy"]["delta"] == 0.10
    assert diff["summary_delta"]["average_latency_ms"]["delta"] == -50.0
    assert diff["summary_delta"]["total_credits_consumed"]["delta"] == 0

    md_output = format_comparison_markdown(diff)
    assert "# Benchmark Comparison Report" in md_output
    assert "+20.0% ⬆️" in md_output
    assert "-50.00 ms ⬇️" in md_output
