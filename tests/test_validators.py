"""Unit tests for Stage 4 deterministic validators."""

from worker.pipeline.quality import calculate_quality_score
from worker.validators.bank_statement_math import validate_bank_statement_math
from worker.validators.driving_licence import validate_driving_licence
from worker.validators.invoice_math import validate_invoice_math
from worker.validators.passport_mrz import calculate_icao_check_digit, validate_passport_mrz
from worker.validators.receipt_math import validate_receipt_math

# --- Passport MRZ Tests ---

def test_icao_check_digit_calculation():
    """Verify ICAO 9303 7-3-1 mod-10 check digit calculation using official test vectors."""
    # Test vector 1: "L898902C<" -> 3
    assert calculate_icao_check_digit("L898902C<") == 3
    # Test vector 2: "690806" -> 1
    assert calculate_icao_check_digit("690806") == 1
    # Test vector 3: "940623" -> 6
    assert calculate_icao_check_digit("940623") == 6


def test_passport_mrz_passing_icao_specimen():
    """Verify valid ICAO Doc 9303 specimen passes validation with 0 errors."""
    fields = {
        "passport_number": "L898902C<",
        "nationality": "UTO",
        "date_of_birth": "1969-08-06",
        "expiry_date": "1994-06-23",
        "mrz": [
            "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
            "L898902C<3UTO6908061F9406236ZE184226B<<<<<14",
        ],
    }
    issues = validate_passport_mrz(fields)
    errors = [i for i in issues if i.severity == "error"]
    assert len(errors) == 0


def test_passport_mrz_tampered_check_digit():
    """Verify tampered MRZ check digit triggers severity='error'."""
    fields = {
        "passport_number": "L898902C<",
        "nationality": "UTO",
        "mrz": [
            "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
            "L898902C<9UTO6908061F9406236ZE184226B<<<<<10",  # 9 instead of 3
        ],
    }
    issues = validate_passport_mrz(fields)
    errors = [i for i in issues if i.severity == "error"]
    assert any(e.code == "MRZ_DOC_NUM_CHECKSUM_FAILED" for e in errors)


# --- Invoice Math Tests ---

def test_invoice_math_passing():
    """Verify balanced invoice math passes without error."""
    fields = {
        "subtotal": 300.0,
        "tax_amount": 30.0,
        "discount_amount": 10.0,
        "total_amount": 320.0,
        "issue_date": "2026-10-01",
        "due_date": "2026-10-31",
        "line_items": [
            {"amount": 100.0},
            {"amount": 200.0},
        ],
    }
    issues = validate_invoice_math(fields)
    assert len([i for i in issues if i.severity == "error"]) == 0


def test_invoice_math_failing_total():
    """Verify total mismatch triggers severity='error'."""
    fields = {
        "subtotal": 300.0,
        "tax_amount": 30.0,
        "total_amount": 500.0,  # Expected 330.0
    }
    issues = validate_invoice_math(fields)
    errors = [i for i in issues if i.severity == "error"]
    assert any(e.code == "INVOICE_TOTAL_ARITHMETIC_MISMATCH" for e in errors)


def test_invoice_due_date_before_issue_date():
    """Verify due date earlier than issue date triggers error."""
    fields = {
        "subtotal": 100.0,
        "total_amount": 100.0,
        "issue_date": "2026-11-15",
        "due_date": "2026-11-01",  # Invalid
    }
    issues = validate_invoice_math(fields)
    errors = [i for i in issues if i.severity == "error"]
    assert any(e.code == "INVOICE_DUE_DATE_BEFORE_ISSUE_DATE" for e in errors)


# --- Receipt Math Tests ---

def test_receipt_math_passing_and_failing():
    """Verify receipt subtotal + tax = total validation."""
    # Passing
    assert len([i for i in validate_receipt_math({"subtotal": 50.0, "tax_amount": 5.0, "total_amount": 55.0}) if i.severity == "error"]) == 0

    # Failing
    failing = validate_receipt_math({"subtotal": 50.0, "tax_amount": 5.0, "total_amount": 80.0})
    assert any(i.code == "RECEIPT_TOTAL_MISMATCH" for i in failing)


# --- Bank Statement Tests ---

def test_bank_statement_math():
    """Verify opening + deposits - withdrawals = closing."""
    # Passing
    passing = validate_bank_statement_math({
        "opening_balance": 1000.0,
        "total_deposits": 500.0,
        "total_withdrawals": 200.0,
        "closing_balance": 1300.0,
    })
    assert len([i for i in passing if i.severity == "error"]) == 0

    # Failing
    failing = validate_bank_statement_math({
        "opening_balance": 1000.0,
        "total_deposits": 500.0,
        "total_withdrawals": 200.0,
        "closing_balance": 2000.0,
    })
    assert any(i.code == "BANK_STATEMENT_BALANCE_MISMATCH" for i in failing)


# --- Driving Licence Tests ---

def test_driving_licence_validations():
    """Verify licence dates and minimum age."""
    # Passing
    passing = validate_driving_licence({
        "issue_date": "2020-01-01",
        "expiry_date": "2030-01-01",
        "date_of_birth": "1995-05-20",
    })
    assert len([i for i in passing if i.severity == "error"]) == 0

    # Failing: expiry before issue
    failing_expiry = validate_driving_licence({
        "issue_date": "2025-01-01",
        "expiry_date": "2020-01-01",
    })
    assert any(i.code == "EXPIRY_BEFORE_OR_EQUAL_ISSUE_DATE" for i in failing_expiry)

    # Failing: under minimum age
    failing_age = validate_driving_licence({
        "date_of_birth": "2024-01-01",  # 2 years old
    })
    assert any(i.code == "HOLDER_TOO_YOUNG" for i in failing_age)


# --- Quality Score Tests ---

def test_quality_score_calculation():
    """Verify quality score calculation based on completeness and issue severity."""
    # Complete, no issues -> 1.0
    perfect_fields = {"a": 1, "b": 2, "c": 3}
    assert calculate_quality_score(perfect_fields, []) == 1.0

    # With warning -> slight reduction
    from providers.base import ValidationIssue
    warn_issue = ValidationIssue(field="a", code="WARN", severity="warning")
    score_warn = calculate_quality_score(perfect_fields, [warn_issue])
    assert 0.90 <= score_warn < 1.0

    # With error -> capped below 0.70
    err_issue = ValidationIssue(field="a", code="ERR", severity="error")
    score_err = calculate_quality_score(perfect_fields, [err_issue])
    assert score_err <= 0.70
