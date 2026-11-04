"""Deterministic Invoice Arithmetic and Date Consistency Validator."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from providers.base import ValidationIssue

DEFAULT_MATH_TOLERANCE = 0.01


def _to_float(val: Any) -> float | None:
    """Safely converts numeric or string amount to float."""
    if val is None:
        return None
    try:
        if isinstance(val, (int, float)):
            return float(val)
        # Strip currency symbols and whitespace
        clean_str = (
            str(val).replace(",", "").replace("$", "").replace("€", "").replace("£", "").strip()
        )
        return float(clean_str)
    except (ValueError, TypeError):
        return None


def validate_invoice_math(
    fields: dict[str, Any],
    tolerance: float = DEFAULT_MATH_TOLERANCE,
) -> list[ValidationIssue]:
    """Validates invoice arithmetic invariants and due date chronological sanity."""
    issues: list[ValidationIssue] = []

    subtotal = _to_float(fields.get("subtotal"))
    tax = _to_float(fields.get("tax_amount")) or 0.0
    shipping = _to_float(fields.get("shipping_amount")) or 0.0
    discount = _to_float(fields.get("discount_amount")) or 0.0
    total = _to_float(fields.get("total_amount"))

    # 1. Line items sum vs Subtotal
    line_items = fields.get("line_items")
    if isinstance(line_items, list) and len(line_items) > 0:
        line_sums = 0.0
        has_valid_items = False
        for item in line_items:
            if isinstance(item, dict):
                item_amt = _to_float(
                    item.get("amount") or item.get("total") or item.get("total_amount")
                )
                if item_amt is not None:
                    line_sums += item_amt
                    has_valid_items = True

        if has_valid_items and subtotal is not None:
            diff = abs(line_sums - subtotal)
            if diff > tolerance:
                issues.append(
                    ValidationIssue(
                        field="subtotal",
                        code="INVOICE_LINE_ITEMS_SUBTOTAL_MISMATCH",
                        severity="warning",
                        message=(
                            f"Sum of line items ({round(line_sums, 2)}) differs from "
                            f"stated subtotal ({round(subtotal, 2)}) by {round(diff, 2)}."
                        ),
                    )
                )

    # 2. Grand total reconciliation: subtotal + tax + shipping - discount ≈ total
    if subtotal is not None and total is not None:
        expected_total = subtotal + tax + shipping - discount
        diff = abs(expected_total - total)
        if diff > tolerance:
            # Significant math discrepancy triggers error to escalate model
            severity = "error" if diff > 1.0 else "warning"
            issues.append(
                ValidationIssue(
                    field="total_amount",
                    code="INVOICE_TOTAL_ARITHMETIC_MISMATCH",
                    severity=severity,
                    message=(
                        f"Grand total reconciliation failed: subtotal ({subtotal}) + tax ({tax}) "
                        f"+ shipping ({shipping}) - discount ({discount}) = {round(expected_total, 2)}, "
                        f"but stated total is {total} (difference: {round(diff, 2)})."
                    ),
                )
            )

    # 3. Due Date >= Issue Date
    issue_date_str = fields.get("issue_date")
    due_date_str = fields.get("due_date")
    if issue_date_str and due_date_str:
        try:
            issue_dt = datetime.strptime(str(issue_date_str).strip(), "%Y-%m-%d").date()
            due_dt = datetime.strptime(str(due_date_str).strip(), "%Y-%m-%d").date()
            if due_dt < issue_dt:
                issues.append(
                    ValidationIssue(
                        field="due_date",
                        code="INVOICE_DUE_DATE_BEFORE_ISSUE_DATE",
                        severity="error",
                        message=(
                            f"Due date ({due_date_str}) is earlier than "
                            f"issue date ({issue_date_str})."
                        ),
                    )
                )
        except ValueError:
            # Date formatting issue handled by generic date validator
            pass

    return issues
