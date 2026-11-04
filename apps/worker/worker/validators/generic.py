"""Generic Deterministic Validators (Dates, Currencies, Country Codes)."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from providers.base import ValidationIssue

ISO_4217_CURRENCIES = {
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CAD",
    "AUD",
    "CHF",
    "CNY",
    "INR",
    "PKR",
    "AED",
    "SAR",
    "SGD",
    "HKD",
    "NZD",
    "KRW",
    "BRL",
    "MXN",
    "ZAR",
    "SEK",
    "NOK",
    "TRY",
    "RUB",
    "PLN",
    "THB",
    "IDR",
    "MYR",
    "PHP",
    "CZK",
    "HUF",
}

# Common ISO 3166 alpha-2 and alpha-3 codes
ISO_3166_COUNTRIES = {
    "US",
    "USA",
    "GB",
    "GBR",
    "CA",
    "CAN",
    "AU",
    "AUS",
    "DE",
    "DEU",
    "FR",
    "FRA",
    "IT",
    "ITA",
    "ES",
    "ESP",
    "PK",
    "PAK",
    "IN",
    "IND",
    "CN",
    "CHN",
    "JP",
    "JPN",
    "AE",
    "ARE",
    "SA",
    "SAU",
    "BR",
    "BRA",
    "MX",
    "MEX",
    "ZA",
    "ZAF",
    "SG",
    "SGP",
    "NL",
    "NLD",
    "CH",
    "CHE",
    "SE",
    "SWE",
    "NO",
    "NOR",
    "DK",
    "DNK",
    "FI",
    "FIN",
    "IE",
    "IRL",
    "NZ",
    "NZL",
    "KR",
    "KOR",
    "ID",
    "IDN",
    "MY",
    "MYS",
    "TR",
    "TUR",
}

DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_date_format(val: Any, field_name: str) -> list[ValidationIssue]:
    """Validates that a date field is a plausible, valid ISO 8601 YYYY-MM-DD calendar date."""
    issues: list[ValidationIssue] = []
    if not val:
        return issues

    str_val = str(val).strip()
    if not DATE_REGEX.match(str_val):
        issues.append(
            ValidationIssue(
                field=field_name,
                code="INVALID_DATE_FORMAT",
                severity="warning",
                message=f"Date '{str_val}' does not conform to ISO YYYY-MM-DD format.",
            )
        )
        return issues

    try:
        parsed = datetime.strptime(str_val, "%Y-%m-%d").date()
        if parsed.year < 1900 or parsed.year > 2100:
            issues.append(
                ValidationIssue(
                    field=field_name,
                    code="DATE_OUT_OF_RANGE",
                    severity="warning",
                    message=f"Year {parsed.year} in '{str_val}' is outside plausible range 1900-2100.",
                )
            )
    except ValueError as err:
        issues.append(
            ValidationIssue(
                field=field_name,
                code="INVALID_CALENDAR_DATE",
                severity="error",
                message=f"Invalid calendar date '{str_val}': {err}",
            )
        )

    return issues


def validate_currency_code(val: Any, field_name: str = "currency") -> list[ValidationIssue]:
    """Validates standard ISO 4217 3-letter currency code."""
    issues: list[ValidationIssue] = []
    if not val:
        return issues

    code = str(val).strip().upper()
    if len(code) != 3 or not code.isalpha():
        issues.append(
            ValidationIssue(
                field=field_name,
                code="INVALID_CURRENCY_FORMAT",
                severity="warning",
                message=f"Currency '{code}' is not a 3-letter code.",
            )
        )
    elif code not in ISO_4217_CURRENCIES:
        issues.append(
            ValidationIssue(
                field=field_name,
                code="UNRECOGNIZED_CURRENCY_CODE",
                severity="warning",
                message=f"Currency '{code}' is not in recognized ISO 4217 list.",
            )
        )

    return issues


def validate_country_code(val: Any, field_name: str = "country_code") -> list[ValidationIssue]:
    """Validates ISO 3166 alpha-2 or alpha-3 country code."""
    issues: list[ValidationIssue] = []
    if not val:
        return issues

    code = str(val).strip().upper()
    if code not in ISO_3166_COUNTRIES:
        issues.append(
            ValidationIssue(
                field=field_name,
                code="UNRECOGNIZED_COUNTRY_CODE",
                severity="warning",
                message=f"Country code '{code}' is not a recognized ISO 3166 country code.",
            )
        )

    return issues
