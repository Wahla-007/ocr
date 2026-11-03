"""Deterministic Driving Licence and ID Validity Validator."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from providers.base import ValidationIssue


def validate_driving_licence(
    fields: dict[str, Any],
) -> list[ValidationIssue]:
    """Validates chronological consistency and holder age sanity for driving licences and ID cards."""
    issues: list[ValidationIssue] = []

    issue_date_str = fields.get("issue_date")
    expiry_date_str = fields.get("expiry_date")
    dob_str = fields.get("date_of_birth")

    issue_dt = None
    expiry_dt = None
    dob_dt = None

    if issue_date_str:
        try:
            issue_dt = datetime.strptime(str(issue_date_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            pass

    if expiry_date_str:
        try:
            expiry_dt = datetime.strptime(str(expiry_date_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            pass

    if dob_str:
        try:
            dob_dt = datetime.strptime(str(dob_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            pass

    # 1. Expiry date after issue date
    if issue_dt and expiry_dt and expiry_dt <= issue_dt:
        issues.append(
            ValidationIssue(
                field="expiry_date",
                code="EXPIRY_BEFORE_OR_EQUAL_ISSUE_DATE",
                severity="error",
                message=f"Licence expiry date ({expiry_date_str}) is not after issue date ({issue_date_str}).",
            )
        )

    # 2. Age sanity checks
    if dob_dt:
        today = datetime.now().date()
        age_years = (today - dob_dt).days / 365.25

        if age_years < 14:
            issues.append(
                ValidationIssue(
                    field="date_of_birth",
                    code="HOLDER_TOO_YOUNG",
                    severity="error",
                    message=f"Holder birth date ({dob_str}) implies age {round(age_years, 1)}, which is under minimum age limit.",
                )
            )
        elif age_years > 120:
            issues.append(
                ValidationIssue(
                    field="date_of_birth",
                    code="HOLDER_IMPLAUSIBLY_OLD",
                    severity="warning",
                    message=f"Holder birth date ({dob_str}) implies age {round(age_years, 1)}, exceeding 120 years.",
                )
            )

        if issue_dt and dob_dt:
            age_at_issue = (issue_dt - dob_dt).days / 365.25
            if age_at_issue < 14:
                issues.append(
                    ValidationIssue(
                        field="issue_date",
                        code="LICENCE_ISSUED_BEFORE_MINIMUM_AGE",
                        severity="error",
                        message=f"Licence issued at age {round(age_at_issue, 1)} (under 14).",
                    )
                )

    return issues
