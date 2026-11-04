"""004_vision_models_and_settings

Revision ID: 004_vision_models_and_settings
Revises: 003_billing_system
Create Date: 2026-11-01 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_vision_models_and_settings"
down_revision: str | None = "003_billing_system"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JsonType = sa.JSON().with_variant(postgresql.JSONB, "postgresql")


def upgrade() -> None:
    # 1. Add token metrics and attempt metadata to usage_ledger
    op.add_column(
        "usage_ledger", sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "usage_ledger",
        sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("usage_ledger", sa.Column("model", sa.String(length=128), nullable=True))
    op.add_column(
        "usage_ledger", sa.Column("attempts", sa.Integer(), nullable=False, server_default="1")
    )
    op.add_column(
        "usage_ledger", sa.Column("pages", sa.Integer(), nullable=False, server_default="1")
    )

    # 2. Add tenant setting for third-party AI processing control
    op.add_column(
        "users",
        sa.Column(
            "third_party_processing_allowed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    # 3. Add vision quality score and validation issue metadata to results
    op.add_column("results", sa.Column("quality_score", sa.Float(), nullable=True))
    op.add_column("results", sa.Column("validation_issues_json", JsonType, nullable=True))
    op.add_column("results", sa.Column("model_used", sa.String(length=128), nullable=True))
    op.add_column("results", sa.Column("pages_json", JsonType, nullable=True))


def downgrade() -> None:
    # Drop from results
    op.drop_column("results", "pages_json")
    op.drop_column("results", "model_used")
    op.drop_column("results", "validation_issues_json")
    op.drop_column("results", "quality_score")

    # Drop from users
    op.drop_column("users", "third_party_processing_allowed")

    # Drop from usage_ledger
    op.drop_column("usage_ledger", "pages")
    op.drop_column("usage_ledger", "attempts")
    op.drop_column("usage_ledger", "model")
    op.drop_column("usage_ledger", "completion_tokens")
    op.drop_column("usage_ledger", "prompt_tokens")
