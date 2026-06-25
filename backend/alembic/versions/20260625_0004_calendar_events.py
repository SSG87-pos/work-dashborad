"""create calendar events

Revision ID: 20260625_0004
Revises: 20260625_0003
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0004"
down_revision: str | None = "20260625_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

calendar_scope = postgresql.ENUM("team", "personal", name="calendar_scope", create_type=False)


def upgrade() -> None:
    calendar_scope.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "calendar_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("scope", calendar_scope, server_default="team", nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("owner_roster_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), server_default="", nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("scope = 'team' or owner_id is not null or owner_roster_id is not null", name="personal_event_owner_required"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_roster_id"], ["team_roster.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("calendar_events_date_idx", "calendar_events", ["event_date"])
    op.create_index("calendar_events_owner_idx", "calendar_events", ["owner_id"])


def downgrade() -> None:
    op.drop_index("calendar_events_owner_idx", table_name="calendar_events")
    op.drop_index("calendar_events_date_idx", table_name="calendar_events")
    op.drop_table("calendar_events")
    calendar_scope.drop(op.get_bind(), checkfirst=True)
