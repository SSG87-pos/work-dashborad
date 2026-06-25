"""create users and team roster

Revision ID: 20260625_0001
Revises:
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


permission_role = postgresql.ENUM("admin", "lead", "member", name="permission_role", create_type=False)


def upgrade() -> None:
    op.execute("create extension if not exists pgcrypto")
    permission_role.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), server_default="", nullable=False),
        sa.Column("team", sa.Text(), server_default="연구기획그룹-전략", nullable=False),
        sa.Column("profile_emoji", sa.Text(), server_default="👤", nullable=False),
        sa.Column("permission_role", permission_role, server_default="member", nullable=False),
        sa.Column("is_team_member", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("users_active_idx", "users", ["is_active"])
    op.create_index("users_email_idx", "users", ["email"])
    op.create_index("users_team_member_idx", "users", ["is_team_member", "is_active"])

    op.create_table(
        "team_roster",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("expected_email", sa.Text(), nullable=True),
        sa.Column("auth_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), server_default="", nullable=False),
        sa.Column("profile_emoji", sa.Text(), server_default="👤", nullable=False),
        sa.Column("permission_role", permission_role, server_default="member", nullable=False),
        sa.Column("is_team_member", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["auth_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("expected_email"),
    )
    op.create_index("team_roster_auth_user_idx", "team_roster", ["auth_user_id"])
    op.create_index("team_roster_visible_idx", "team_roster", ["is_team_member", "is_active"])


def downgrade() -> None:
    op.drop_index("team_roster_visible_idx", table_name="team_roster")
    op.drop_index("team_roster_auth_user_idx", table_name="team_roster")
    op.drop_table("team_roster")
    op.drop_index("users_team_member_idx", table_name="users")
    op.drop_index("users_email_idx", table_name="users")
    op.drop_index("users_active_idx", table_name="users")
    op.drop_table("users")
    permission_role.drop(op.get_bind(), checkfirst=True)
