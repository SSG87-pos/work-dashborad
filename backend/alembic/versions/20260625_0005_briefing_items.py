"""create briefing items

Revision ID: 20260625_0005
Revises: 20260625_0004
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0005"
down_revision: str | None = "20260625_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "briefing_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("item_type", sa.Text(), server_default="note", nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default="new", nullable=False),
        sa.Column("done", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("owner_roster_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_on", sa.Date(), server_default=sa.text("current_date"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("scope in ('my', 'team')", name="briefing_items_scope_check"),
        sa.CheckConstraint("kind in ('inbox', 'todo')", name="briefing_items_kind_check"),
        sa.CheckConstraint("scope = 'team' or owner_id is not null or owner_roster_id is not null", name="my_inbox_owner_required"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_roster_id"], ["team_roster.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("briefing_items_scope_created_idx", "briefing_items", ["scope", "created_at"])
    op.create_index("briefing_items_owner_created_idx", "briefing_items", ["owner_id", "created_at"])
    op.create_index("briefing_items_owner_roster_created_idx", "briefing_items", ["owner_roster_id", "created_at"])


def downgrade() -> None:
    op.drop_index("briefing_items_owner_roster_created_idx", table_name="briefing_items")
    op.drop_index("briefing_items_owner_created_idx", table_name="briefing_items")
    op.drop_index("briefing_items_scope_created_idx", table_name="briefing_items")
    op.drop_table("briefing_items")
