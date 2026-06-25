"""create frontend state support tables

Revision ID: 20260625_0008
Revises: 20260625_0007
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0008"
down_revision: str | None = "20260625_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "task_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "tag_id", name="task_tags_task_tag_key"),
    )
    op.create_index("task_tags_tag_idx", "task_tags", ["tag_id"])
    op.create_index("task_tags_task_idx", "task_tags", ["task_id"])

    op.create_table(
        "user_preferences",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("active_page", sa.Text(), server_default="my", nullable=False),
        sa.Column("active_view", sa.Text(), server_default="board", nullable=False),
        sa.Column("selected_tag", sa.Text(), server_default="전체", nullable=False),
        sa.Column("timeline_mode", sa.Text(), server_default="month", nullable=False),
        sa.Column("timeline_month", sa.Text(), server_default="", nullable=False),
        sa.Column("timeline_year", sa.Text(), server_default="", nullable=False),
        sa.Column("selected_task_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["selected_task_id"], ["tasks.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "dashboard_memos",
        sa.Column("page_key", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("page_key"),
    )


def downgrade() -> None:
    op.drop_table("dashboard_memos")
    op.drop_table("user_preferences")
    op.drop_index("task_tags_task_idx", table_name="task_tags")
    op.drop_index("task_tags_tag_idx", table_name="task_tags")
    op.drop_table("task_tags")
