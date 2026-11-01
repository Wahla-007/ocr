"""ICAO Doc 9303 Machine Readable Zone (MRZ) Checksum & VIZ Cross-Check Validator."""

from __future__ import annotations

import re
from typing import Any
from providers.base import ValidationIssue

ICAO_WEIGHTS = [7, 3, 1]


def _char_value(c: str) -> int:
    """Computes ICAO 9303 character numeric value: 0-9 -> 0-9, A-Z -> 10-35, '<' -> 0."""
    c_up = c.upper()
    if "0" <= c_up <= "9":
        return int(c_up)
    elif "A" <= c_up <= "Z":
        return ord(c_up) - ord("A") + 10
    return 0


def calculate_icao_check_digit(data: str) -> int:
    """Computes ICAO 9303 Modulo-10 checksum with weights 7-3-1."""
    total = 0
    for idx, char in enumerate(data):
        weight = ICAO_WEIGHTS[idx % 3]
        total += _char_value(char) * weight
    return total % 10


def _parse_mrz_lines(raw_mrz: str | list[str] | None) -> list[str]:
    """Normalizes raw MRZ input into a list of clean uppercase lines."""
    if not raw_mrz:
        return []
    if isinstance(raw_mrz, list):
        lines = [re.sub(r"\s+", "", line).upper() for line in raw_mrz if line]
    else:
        # Split on newline or common delimiters
        raw_lines = str(raw_mrz).replace("\r", "\n").split("\n")
        lines = [re.sub(r"\s+", "", line).upper() for line in raw_lines if line.strip()]
    return lines


def validate_passport_mrz(
    fields: dict[str, Any],
) -> list[ValidationIssue]:
    """Validates MRZ check digits and cross-checks MRZ values against VIZ fields."""
    issues: list[ValidationIssue] = []

    raw_mrz = fields.get("mrz") or fields.get("mrz_raw") or fields.get("mrz_lines")
    if not raw_mrz:
        # If no MRZ is present, passport document is incomplete
        issues.append(
            ValidationIssue(
                field="mrz",
                code="MISSING_MRZ",
                severity="warning",
                message="Passport document does not contain an extracted Machine Readable Zone (MRZ).",
            )
        )
        return issues

    lines = _parse_mrz_lines(raw_mrz)
    if not lines:
        return issues

    # TD3: Standard Passport (2 lines x 44 characters)
    if len(lines) == 2 and len(lines[0]) >= 42 and len(lines[1]) >= 42:
        line1 = lines[0].ljust(44, "<")[:44]
        line2 = lines[1].ljust(44, "<")[:44]

        # 1. Document Number Check Digit: line2[0:9] vs line2[9]
        doc_num_raw = line2[0:9]
        doc_num_check = line2[9]
        if doc_num_check.isdigit():
            expected_check = calculate_icao_check_digit(doc_num_raw)
            if int(doc_num_check) != expected_check:
                issues.append(
                    ValidationIssue(
                        field="passport_number",
                        code="MRZ_DOC_NUM_CHECKSUM_FAILED",
                        severity="error",
                        message=(
                            f"MRZ document number check digit mismatch: "
                            f"found {doc_num_check}, expected {expected_check}."
                        ),
                    )
                )

        # 2. Date of Birth Check Digit: line2[13:19] vs line2[19]
        dob_raw = line2[13:19]
        dob_check = line2[19]
        if dob_check.isdigit():
            expected_dob_check = calculate_icao_check_digit(dob_raw)
            if int(dob_check) != expected_dob_check:
                issues.append(
                    ValidationIssue(
                        field="date_of_birth",
                        code="MRZ_DOB_CHECKSUM_FAILED",
                        severity="error",
                        message=(
                            f"MRZ date of birth check digit mismatch: "
                            f"found {dob_check}, expected {expected_dob_check}."
                        ),
                    )
                )

        # 3. Expiration Date Check Digit: line2[21:27] vs line2[27]
        exp_raw = line2[21:27]
        exp_check = line2[27]
        if exp_check.isdigit():
            expected_exp_check = calculate_icao_check_digit(exp_raw)
            if int(exp_check) != expected_exp_check:
                issues.append(
                    ValidationIssue(
                        field="expiry_date",
                        code="MRZ_EXPIRY_CHECKSUM_FAILED",
                        severity="error",
                        message=(
                            f"MRZ expiry date check digit mismatch: "
                            f"found {exp_check}, expected {expected_exp_check}."
                        ),
                    )
                )

        # 4. Composite Check Digit: line2[43]
        # In TD3, composite covers line2[0:10], line2[13:20], line2[21:43]
        composite_data = line2[0:10] + line2[13:20] + line2[21:43]
        composite_check = line2[43]
        if composite_check.isdigit():
            expected_comp = calculate_icao_check_digit(composite_data)
            if int(composite_check) != expected_comp:
                issues.append(
                    ValidationIssue(
                        field="mrz",
                        code="MRZ_COMPOSITE_CHECKSUM_FAILED",
                        severity="error",
                        message=(
                            f"MRZ composite check digit mismatch: "
                            f"found {composite_check}, expected {expected_comp}."
                        ),
                    )
                )

        # 5. VIZ Cross-Checks
        # Cross-check Document Number
        clean_mrz_doc_num = doc_num_raw.replace("<", "").strip()
        viz_doc_num = str(fields.get("passport_number") or fields.get("document_number") or "").strip().upper()
        if viz_doc_num and clean_mrz_doc_num:
            # Strip non-alphanumeric for comparison
            clean_viz = re.sub(r"[^A-Z0-9]", "", viz_doc_num)
            clean_mrz = re.sub(r"[^A-Z0-9]", "", clean_mrz_doc_num)
            if clean_viz != clean_mrz:
                issues.append(
                    ValidationIssue(
                        field="passport_number",
                        code="VIZ_MRZ_DOC_NUM_MISMATCH",
                        severity="warning",
                        message=f"VIZ document number '{viz_doc_num}' differs from MRZ '{clean_mrz_doc_num}'.",
                    )
                )

        # Cross-check Nationality
        mrz_nat = line2[10:13].replace("<", "").strip()
        viz_nat = str(fields.get("nationality") or fields.get("country_code") or "").strip().upper()
        if viz_nat and mrz_nat and len(viz_nat) == 3 and viz_nat != mrz_nat:
            issues.append(
                ValidationIssue(
                    field="nationality",
                    code="VIZ_MRZ_NATIONALITY_MISMATCH",
                    severity="warning",
                    message=f"VIZ nationality '{viz_nat}' differs from MRZ '{mrz_nat}'.",
                )
            )

    return issues
