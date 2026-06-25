"""create task lifecycle tables

Revision ID: 20260625_0006
Revises: 20260625_0005
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0006"
down_revision: str | None = "20260625_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


change_type = postgresql.ENUM("status", "due_date", "archive", "delete", "recurring", name="change_type", create_type=False)


def upgrade() -> None:
    change_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "task_change_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("change_type", change_type, nullable=False),
        sa.Column("from_value", sa.Text(), nullable=True),
        sa.Column("to_value", sa.Text(), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("task_change_history_task_idx", "task_change_history", ["task_id"])
    op.create_index("task_change_history_task_created_idx", "task_change_history", ["task_id", "created_at"])

    op.create_table(
        "task_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("link_type", sa.Text(), server_default="링크", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("task_links_task_idx", "task_links", ["task_id"])

    op.create_table(
        "task_post_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("tone", sa.Text(), server_default="slate", nullable=False),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key", name="task_post_categories_key_key"),
        sa.UniqueConstraint("label", name="task_post_categories_label_key"),
    )
    op.create_index("task_post_categories_active_sort_idx", "task_post_categories", ["active", "sort_order"])

    op.create_table(
        "task_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("attachment", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("posted_at", sa.Date(), server_default=sa.text("current_date"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("scope in ('personal', 'team', 'public')", name="task_posts_scope_check"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["category_id"], ["task_post_categories.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("task_posts_author_idx", "task_posts", ["author_id"])
    op.create_index("task_posts_task_created_idx", "task_posts", ["task_id", "created_at"])


def downgrade() -> None:
    op.drop_index("task_posts_task_created_idx", table_name="task_posts")
    op.drop_index("task_posts_author_idx", table_name="task_posts")
    op.drop_table("task_posts")
    op.drop_index("task_post_categories_active_sort_idx", table_name="task_post_categories")
    op.drop_table("task_post_categories")
    op.drop_index("task_links_task_idx", table_name="task_links")
    op.drop_table("task_links")
    op.drop_index("task_change_history_task_created_idx", table_name="task_change_history")
    op.drop_index("task_change_history_task_idx", table_name="task_change_history")
    op.drop_table("task_change_history")
    change_type.drop(op.get_bind(), checkfirst=True)
