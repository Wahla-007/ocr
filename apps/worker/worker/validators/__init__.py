"""Validators registry and runner for deterministic document validation."""

from __future__ import annotations

from typing import Any

from worker.validators.bank_statement_math import validate_bank_statement_math
from worker.validators.driving_licence import validate_driving_licence
from worker.validators.generic import (
    validate_country_code,
    validate_currency_code,
    validate_date_format,
)
from worker.validators.invoice_math import validate_invoice_math
from worker.validators.passport_mrz import validate_passport_mrz
from worker.validators.receipt_math import validate_receipt_math

from providers.base import ValidationIssue


def validate_document_fields(
    doc_type: str,
    fields: dict[str, Any],
) -> list[ValidationIssue]:
    """Runs all relevant deterministic business validators for a given document type."""
    issues: list[ValidationIssue] = []
    norm_type = doc_type.lower().strip()

    # 1. Generic checks on common keys
    for key, val in fields.items():
        if "date" in key and val:
            issues.extend(validate_date_format(val, key))
        elif key in ("currency", "curr") and val:
            issues.extend(validate_currency_code(val, key))
        elif key in ("country", "country_code", "nationality") and val:
            issues.extend(validate_country_code(val, key))

    # 2. Document-specific validators
    if norm_type == "invoice":
        issues.extend(validate_invoice_math(fields))
    elif norm_type == "receipt":
        issues.extend(validate_receipt_math(fields))
    elif norm_type == "passport":
        issues.extend(validate_passport_mrz(fields))
    elif norm_type in ("driving_licence", "driver_license"):
        issues.extend(validate_driving_licence(fields))
    elif norm_type in ("national_id", "national_id_card", "id_card"):
        issues.extend(validate_driving_licence(fields))
        if "mrz" in fields or "mrz_raw" in fields:
            issues.extend(validate_passport_mrz(fields))
    elif norm_type in ("bank_statement", "statement"):
        issues.extend(validate_bank_statement_math(fields))

    return issues
