"""Deterministic Bank Statement Reconciliation Validator."""

from __future__ import annotations

from typing import Any

from worker.validators.invoice_math import _to_float

from providers.base import ValidationIssue

DEFAULT_MATH_TOLERANCE = 0.02


def validate_bank_statement_math(
    fields: dict[str, Any],
    tolerance: float = DEFAULT_MATH_TOLERANCE,
) -> list[ValidationIssue]:
    """Validates bank statement invariants: opening + credits - debits ≈ closing."""
    issues: list[ValidationIssue] = []

    opening = _to_float(fields.get("opening_balance") or fields.get("beginning_balance"))
    credits_amt = (
        _to_float(
            fields.get("total_deposits") or fields.get("total_credits") or fields.get("deposits")
        )
        or 0.0
    )
    debits_amt = (
        _to_float(
            fields.get("total_withdrawals")
            or fields.get("total_debits")
            or fields.get("withdrawals")
        )
        or 0.0
    )
    closing = _to_float(fields.get("closing_balance") or fields.get("ending_balance"))

    if opening is not None and closing is not None:
        expected_closing = opening + credits_amt - debits_amt
        diff = abs(expected_closing - closing)
        if diff > tolerance:
            severity = "error" if diff > 5.0 else "warning"
            issues.append(
                ValidationIssue(
                    field="closing_balance",
                    code="BANK_STATEMENT_BALANCE_MISMATCH",
                    severity=severity,
                    message=(
                        f"Bank statement balance mismatch: opening ({opening}) + deposits ({credits_amt}) "
                        f"- withdrawals ({debits_amt}) = {round(expected_closing, 2)}, "
                        f"but stated closing balance is {closing} (diff: {round(diff, 2)})."
                    ),
                )
            )

    return issues
