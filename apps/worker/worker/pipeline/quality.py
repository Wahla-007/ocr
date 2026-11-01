"""Deterministic Quality Score Calculator (Stage 4).

Replaces legacy OCR confidence triggers (<0.60) with an objective quality metric
derived from schema completeness and deterministic business validator issues.
"""

from __future__ import annotations

from typing import Any, Sequence
from providers.base import ValidationIssue


CORE_DOC_KEYS = {
    "invoice": ["invoice_number", "total_amount"],
    "receipt": ["merchant_name", "total_amount"],
    "passport": ["passport_number", "surname"],
    "driving_licence": ["licence_number", "name"],
    "bank_statement": ["bank_name", "closing_balance"],
    "id_card": ["id_number", "name"],
}


def calculate_quality_score(
    fields: dict[str, Any],
    issues: Sequence[ValidationIssue],
    expected_field_keys: Sequence[str] | None = None,
    doc_type: str | None = None,
) -> float:
    """Calculates an objective document quality score between 0.0 and 1.0.

    Components:
    - Schema Completeness (40% weight): Ratio of populated core required fields.
    - Validator Integrity (60% weight):
      - Each 'error' issue reduces score by 0.25.
      - Each 'warning' issue reduces score by 0.05.
    """
    if not fields:
        return 0.0

    # 1. Completeness score
    target_keys = expected_field_keys or CORE_DOC_KEYS.get(doc_type.lower() if doc_type else "")
    if target_keys:
        populated_count = sum(1 for k in target_keys if fields.get(k) is not None and fields.get(k) != "")
        completeness = populated_count / max(1, len(target_keys))
    else:
        # If no core keys defined, infer completeness from populated fields capped at standard 4-field threshold
        non_null_count = sum(1 for v in fields.values() if v is not None and v != "" and v != [])
        completeness = min(1.0, non_null_count / max(1, min(4, len(fields))))

    # 2. Issues deductions
    error_count = sum(1 for issue in issues if issue.severity == "error")
    warning_count = sum(1 for issue in issues if issue.severity == "warning")

    validator_integrity = 1.0 - (error_count * 0.25) - (warning_count * 0.05)
    validator_integrity = max(0.0, validator_integrity)

    # Weighted composite: 40% completeness, 60% validator integrity
    score = (completeness * 0.40) + (validator_integrity * 0.60)

    # If any hard business errors occurred, cap quality score at 0.70
    if error_count > 0:
        score = min(score, 0.70)

    return max(0.0, min(1.0, round(score, 3)))
