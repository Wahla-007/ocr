"""Deterministic Store Receipt Arithmetic Validator."""

from __future__ import annotations

from typing import Any

from worker.validators.invoice_math import _to_float

from providers.base import ValidationIssue

DEFAULT_MATH_TOLERANCE = 0.01


def validate_receipt_math(
    fields: dict[str, Any],
    tolerance: float = DEFAULT_MATH_TOLERANCE,
) -> list[ValidationIssue]:
    """Validates receipt arithmetic: subtotal + tax ≈ total."""
    issues: list[ValidationIssue] = []

    subtotal = _to_float(fields.get("subtotal"))
    tax = _to_float(fields.get("tax_amount")) or 0.0
    tip = _to_float(fields.get("tip_amount")) or 0.0
    total = _to_float(fields.get("total_amount"))

    if subtotal is not None and total is not None:
        expected_total = subtotal + tax + tip
        diff = abs(expected_total - total)
        if diff > tolerance:
            severity = "error" if diff > 1.0 else "warning"
            issues.append(
                ValidationIssue(
                    field="total_amount",
                    code="RECEIPT_TOTAL_MISMATCH",
                    severity=severity,
                    message=(
                        f"Receipt total reconciliation failed: subtotal ({subtotal}) + tax ({tax}) "
                        f"+ tip ({tip}) = {round(expected_total, 2)}, but stated total is {total} "
                        f"(difference: {round(diff, 2)})."
                    ),
                )
            )

    return issues
