"""Pricing and Commercial Rate Endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/pricing", tags=["Pricing & Plans"])


@router.get("")
async def get_pricing_tiers():
    """Returns the commercial developer pricing tiers and competitive cost breakdown."""
    return {
        "currency": "USD",
        "base_rate_per_page": 0.001,
        "description": "Ultra-low cost CPU document intelligence (<20MB RAM, zero GPU markups)",
        "tiers": [
            {
                "id": "developer_payg",
                "name": "Developer Pay-As-You-Go",
                "rate": "$0.001 per page",
                "minimum_monthly": "$0.00",
                "included_pages": 1000,
                "rate_limit": "120 req/min",
            },
            {
                "id": "starter",
                "name": "Starter Plan",
                "monthly_fee": "$9.00 / month",
                "rate": "$0.0009 per page",
                "included_pages": 10000,
                "rate_limit": "240 req/min",
            },
            {
                "id": "pro",
                "name": "Pro Scale",
                "monthly_fee": "$49.00 / month",
                "rate": "$0.0008 per page",
                "included_pages": 60000,
                "rate_limit": "600 req/min",
            },
        ],
        "competitor_comparison": {
            "volume_10000_pages": {
                "openocr": "$10.00",
                "aws_textract": "$150.00",
                "google_docai": "$500.00",
                "savings": "93% to 98% cheaper",
            }
        },
    }
