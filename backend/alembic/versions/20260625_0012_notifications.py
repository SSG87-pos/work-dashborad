"""add personal notifications

Revision ID: 20260625_0012
Revises: 20260625_0011
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0012"
down_revision: str | None = "20260625_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


notification_source_type = postgresql.ENUM(
    "task",
    "task_update",
    "task_post",
    "task_change_history",
    "system",
    name="notification_source_type",
    create_type=False,
)
notification_type = postgresql.ENUM(
    "task_assigned",
    "task_overdue",
    "task_update_added",
    "task_post_added",
    "risk_added",
    "mention_added",
    name="notification_type",
    create_type=False,
)
notification_severity = postgresql.ENUM("low", "normal", "high", "urgent", name="notification_severity", create_type=False)


def upgrade() -> None:
    notification_source_type.create(op.get_bind(), checkfirst=True)
    notification_type.create(op.get_bind(), checkfirst=True)
    notification_severity.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("recipient_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source_type", notification_source_type, nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", notification_type, nullable=False),
        sa.Column("severity", notification_severity, server_default="normal", nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("action_url", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("recipient_user_id", "type", "source_type", "source_id", name="notifications_dedupe_source_key"),
    )
    op.create_index("notifications_recipient_created_idx", "notifications", ["recipient_user_id", "created_at"])
    op.create_index(
        "notifications_recipient_unread_created_idx",
        "notifications",
        ["recipient_user_id", "read_at", "created_at"],
    )
    op.create_index("notifications_task_created_idx", "notifications", ["task_id", "created_at"])


def downgrade() -> None:
    op.drop_index("notifications_task_created_idx", table_name="notifications")
    op.drop_index("notifications_recipient_unread_created_idx", table_name="notifications")
    op.drop_index("notifications_recipient_created_idx", table_name="notifications")
    op.drop_table("notifications")
    notification_severity.drop(op.get_bind(), checkfirst=True)
    notification_type.drop(op.get_bind(), checkfirst=True)
    notification_source_type.drop(op.get_bind(), checkfirst=True)
