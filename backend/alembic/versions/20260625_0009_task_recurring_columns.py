"""add task recurring rule columns

Revision ID: 20260625_0009
Revises: 20260625_0008
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0009"
down_revision: str | None = "20260625_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("recurring", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("recurring_detail", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("recurring_interval", sa.Integer(), server_default="1", nullable=False))
    op.add_column(
        "tasks",
        sa.Column(
            "recurring_weekdays",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column("tasks", sa.Column("recurring_start_date", sa.Date(), nullable=True))
    op.add_column("tasks", sa.Column("recurring_end_date", sa.Date(), nullable=True))
    op.add_column("tasks", sa.Column("recurring_no_end", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("tasks", sa.Column("recurring_duration_days", sa.Integer(), server_default="1", nullable=False))
    op.add_column("tasks", sa.Column("recurring_template_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "tasks_recurring_template_id_fkey",
        "tasks",
        "tasks",
        ["recurring_template_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("tasks_recurring_template_id_idx", "tasks", ["recurring_template_id"])


def downgrade() -> None:
    op.drop_index("tasks_recurring_template_id_idx", table_name="tasks")
    op.drop_constraint("tasks_recurring_template_id_fkey", "tasks", type_="foreignkey")
    op.drop_column("tasks", "recurring_template_id")
    op.drop_column("tasks", "recurring_duration_days")
    op.drop_column("tasks", "recurring_no_end")
    op.drop_column("tasks", "recurring_end_date")
    op.drop_column("tasks", "recurring_start_date")
    op.drop_column("tasks", "recurring_weekdays")
    op.drop_column("tasks", "recurring_interval")
    op.drop_column("tasks", "recurring_detail")
    op.drop_column("tasks", "recurring")
