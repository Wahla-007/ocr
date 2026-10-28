"""Server-side Catalog for Plans and Credit Packs (NIST / OWASP Tamper-Proof)."""

from typing import Optional
from pydantic import BaseModel


class CatalogItem(BaseModel):
    code: str
    name: str
    type: str  # 'subscription' | 'pack'
    price_minor: int  # integer cents/paisas (e.g. 2900 = $29.00 USD, 800000 = 8000.00 PKR)
    currency: str  # 'USD' | 'PKR'
    credits: int
    interval: Optional[str] = None  # 'month' | 'year' | None
    description: str
    active: bool = True


# Canonical Server-Side Product & Credit Pack Catalog
CATALOG: dict[str, CatalogItem] = {
    # --- SUBSCRIPTION TIERS (USD) ---
    "dev_monthly_usd": CatalogItem(
        code="dev_monthly_usd",
        name="Developer Platform (Monthly)",
        type="subscription",
        price_minor=2900,  # $29.00
        currency="USD",
        credits=10000,
        interval="month",
        description="Full REST API access with 10,000 monthly extraction pages included.",
    ),
    "dev_annual_usd": CatalogItem(
        code="dev_annual_usd",
        name="Developer Platform (Annual)",
        type="subscription",
        price_minor=27600,  # $276.00 ($23/mo billed annually)
        currency="USD",
        credits=120000,
        interval="year",
        description="Annual Developer plan with 20% savings. 120,000 extraction pages per year.",
    ),
    # --- SUBSCRIPTION TIERS (PKR) ---
    "dev_monthly_pkr": CatalogItem(
        code="dev_monthly_pkr",
        name="Developer Platform (Monthly PKR)",
        type="subscription",
        price_minor=800000,  # Rs 8,000.00
        currency="PKR",
        credits=10000,
        interval="month",
        description="Pakistani local card/bank settlement. 10,000 pages per month.",
    ),
    "dev_annual_pkr": CatalogItem(
        code="dev_annual_pkr",
        name="Developer Platform (Annual PKR)",
        type="subscription",
        price_minor=7680000,  # Rs 76,800.00
        currency="PKR",
        credits=120000,
        interval="year",
        description="Annual local PKR subscription with 20% savings.",
    ),
    # --- ONE-TIME CREDIT PACKS (USD) ---
    "pack_starter_usd": CatalogItem(
        code="pack_starter_usd",
        name="Starter Credit Pack (3,000 Credits)",
        type="pack",
        price_minor=1000,  # $10.00
        currency="USD",
        credits=3000,
        description="Instant top-up of 3,000 extraction credits. Never expires.",
    ),
    "pack_growth_usd": CatalogItem(
        code="pack_growth_usd",
        name="Growth Credit Pack (10,000 Credits)",
        type="pack",
        price_minor=2500,  # $25.00
        currency="USD",
        credits=10000,
        description="10,000 extraction credits at $0.0025/page.",
    ),
    "pack_scale_usd": CatalogItem(
        code="pack_scale_usd",
        name="Scale Credit Pack (50,000 Credits)",
        type="pack",
        price_minor=10000,  # $100.00
        currency="USD",
        credits=50000,
        description="High-volume 50,000 extraction credits at $0.0020/page.",
    ),
    # --- ONE-TIME CREDIT PACKS (PKR) ---
    "pack_starter_pkr": CatalogItem(
        code="pack_starter_pkr",
        name="Starter Credit Pack (3,000 Credits PKR)",
        type="pack",
        price_minor=280000,  # Rs 2,800.00
        currency="PKR",
        credits=3000,
        description="Instant local PKR top-up of 3,000 extraction credits.",
    ),
    "pack_growth_pkr": CatalogItem(
        code="pack_growth_pkr",
        name="Growth Credit Pack (10,000 Credits PKR)",
        type="pack",
        price_minor=700000,  # Rs 7,000.00
        currency="PKR",
        credits=10000,
        description="10,000 extraction credits via local bank/card checkout.",
    ),
    "pack_scale_pkr": CatalogItem(
        code="pack_scale_pkr",
        name="Scale Credit Pack (50,000 Credits PKR)",
        type="pack",
        price_minor=2800000,  # Rs 28,000.00
        currency="PKR",
        credits=50000,
        description="50,000 extraction credits for Pakistani businesses.",
    ),
    # Aliases for plan codes
    "sub_developer_monthly_usd": CatalogItem(
        code="sub_developer_monthly_usd",
        name="Developer Platform (Monthly)",
        type="subscription",
        price_minor=2900,  # $29.00
        currency="USD",
        credits=10000,
        interval="month",
        description="Full REST API access with 10,000 monthly extraction pages included.",
    ),
    "sub_developer_annual_usd": CatalogItem(
        code="sub_developer_annual_usd",
        name="Developer Platform (Annual)",
        type="subscription",
        price_minor=27600,  # $276.00 ($23/mo billed annually)
        currency="USD",
        credits=120000,
        interval="year",
        description="Annual Developer plan with 20% savings. 120,000 extraction pages per year.",
    ),
    "sub_developer_monthly_pkr": CatalogItem(
        code="sub_developer_monthly_pkr",
        name="Developer Platform (Monthly PKR)",
        type="subscription",
        price_minor=800000,  # Rs 8,000.00
        currency="PKR",
        credits=10000,
        interval="month",
        description="Pakistani local card/bank settlement. 10,000 pages per month.",
    ),
    "sub_developer_annual_pkr": CatalogItem(
        code="sub_developer_annual_pkr",
        name="Developer Platform (Annual PKR)",
        type="subscription",
        price_minor=7680000,  # Rs 76,800.00
        currency="PKR",
        credits=120000,
        interval="year",
        description="Annual local PKR subscription with 20% savings.",
    ),
}


def get_catalog_item(code: str) -> Optional[CatalogItem]:
    """Retrieves authoritative plan or pack details by plan code."""
    item = CATALOG.get(code)
    if item and item.active:
        return item
    return None


def list_active_catalog(currency: Optional[str] = None) -> list[CatalogItem]:
    """Returns all active catalog items, optionally filtered by currency."""
    items = [item for item in CATALOG.values() if item.active]
    if currency:
        items = [i for i in items if i.currency.upper() == currency.upper()]
    return items


def get_all_catalog_items(currency: Optional[str] = None) -> list[CatalogItem]:
    """Alias for list_active_catalog."""
    return list_active_catalog(currency)

