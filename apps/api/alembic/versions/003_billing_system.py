"""003_billing_system

Revision ID: 003_billing_system
Revises: 002_auth_system
Create Date: 2026-10-29 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003_billing_system"
down_revision: str | None = "002_auth_system"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JsonType = sa.JSON().with_variant(postgresql.JSONB, "postgresql")


def upgrade() -> None:
    # 1. products_catalog
    op.create_table(
        "products_catalog",
        sa.Column("code", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("price_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("credits", sa.Integer(), nullable=False),
        sa.Column("interval", sa.String(length=16), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    # 2. billing_customers
    op.create_table(
        "billing_customers",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="safepay"),
        sa.Column("provider_customer_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_billing_customers_user_id", "billing_customers", ["user_id"], unique=True)

    # 3. orders
    op.create_table(
        "orders",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("plan_code", sa.String(length=64), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="safepay"),
        sa.Column("provider_ref", sa.String(length=128), nullable=True),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", JsonType, nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_code"], ["products_catalog.code"]),
    )
    op.create_index("ix_orders_idempotency_key", "orders", ["idempotency_key"], unique=True)
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_user_id", "orders", ["user_id"])
    op.create_index("ix_orders_provider_ref", "orders", ["provider_ref"])
    op.create_index("idx_orders_user_created", "orders", ["user_id", "created_at"])

    # 4. subscriptions
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("plan_code", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="safepay"),
        sa.Column("provider_sub_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_code"], ["products_catalog.code"]),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])
    op.create_index("ix_subscriptions_current_period_end", "subscriptions", ["current_period_end"])

    # 5. payment_events
    op.create_table(
        "payment_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="safepay"),
        sa.Column("provider_event_id", sa.String(length=128), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("raw_payload_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("payload_json", JsonType, nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_payment_events_provider_event_id", "payment_events", ["provider_event_id"], unique=True)
    op.create_index("ix_payment_events_event_type", "payment_events", ["event_type"])

    # 6. invoices
    op.create_table(
        "invoices",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("invoice_number", sa.String(length=64), nullable=False),
        sa.Column("order_id", sa.String(length=36), nullable=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("tax_minor", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="paid"),
        sa.Column("line_items_json", JsonType, nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"], unique=True)
    op.create_index("ix_invoices_user_id", "invoices", ["user_id"])
    op.create_index("ix_invoices_order_id", "invoices", ["order_id"])

    # 7. Update usage_ledger with order_id and entry_type
    op.add_column("usage_ledger", sa.Column("order_id", sa.String(length=36), nullable=True))
    op.add_column("usage_ledger", sa.Column("entry_type", sa.String(length=32), nullable=False, server_default="usage"))
    op.create_foreign_key("fk_usage_ledger_order_id", "usage_ledger", "orders", ["order_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_usage_ledger_order_id", "usage_ledger", ["order_id"])
    op.create_index("ix_usage_ledger_entry_type", "usage_ledger", ["entry_type"])
    op.create_unique_constraint("uq_usage_ledger_order_entry", "usage_ledger", ["order_id", "entry_type"])


def downgrade() -> None:
    # 7. Revert usage_ledger additions
    op.drop_constraint("uq_usage_ledger_order_entry", "usage_ledger", type_="unique")
    op.drop_index("ix_usage_ledger_entry_type", table_name="usage_ledger")
    op.drop_index("ix_usage_ledger_order_id", table_name="usage_ledger")
    op.drop_constraint("fk_usage_ledger_order_id", "usage_ledger", type_="foreignkey")
    op.drop_column("usage_ledger", "entry_type")
    op.drop_column("usage_ledger", "order_id")

    # 6. invoices
    op.drop_index("ix_invoices_order_id", table_name="invoices")
    op.drop_index("ix_invoices_user_id", table_name="invoices")
    op.drop_index("ix_invoices_invoice_number", table_name="invoices")
    op.drop_table("invoices")

    # 5. payment_events
    op.drop_index("ix_payment_events_event_type", table_name="payment_events")
    op.drop_index("ix_payment_events_provider_event_id", table_name="payment_events")
    op.drop_table("payment_events")

    # 4. subscriptions
    op.drop_index("ix_subscriptions_current_period_end", table_name="subscriptions")
    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")

    # 3. orders
    op.drop_index("idx_orders_user_created", table_name="orders")
    op.drop_index("ix_orders_provider_ref", table_name="orders")
    op.drop_index("ix_orders_user_id", table_name="orders")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_idempotency_key", table_name="orders")
    op.drop_table("orders")

    # 2. billing_customers
    op.drop_index("ix_billing_customers_user_id", table_name="billing_customers")
    op.drop_table("billing_customers")

    # 1. products_catalog
    op.drop_table("products_catalog")
