"""create tasks

Revision ID: 20260625_0002
Revises: 20260625_0001
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0002"
down_revision: str | None = "20260625_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


task_status = postgresql.ENUM("검토/대기", "계획", "진행중", "완료", "보류", name="task_status", create_type=False)
task_priority = postgresql.ENUM("높음", "보통", "낮음", name="task_priority", create_type=False)
task_work_kind = postgresql.ENUM("standard", "spot", name="task_work_kind", create_type=False)
assigner_type = postgresql.ENUM("원장님", "소장님", "그룹장님", "팀장님", "개인", "기타", name="assigner_type", create_type=False)


def upgrade() -> None:
    task_status.create(op.get_bind(), checkfirst=True)
    task_priority.create(op.get_bind(), checkfirst=True)
    task_work_kind.create(op.get_bind(), checkfirst=True)
    assigner_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("workstream", sa.Text(), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("owner_roster_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("assigner_type", assigner_type, server_default="개인", nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", task_status, server_default="계획", nullable=False),
        sa.Column("priority", task_priority, server_default="보통", nullable=False),
        sa.Column("work_kind", task_work_kind, server_default="standard", nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("progress", sa.Integer(), server_default="0", nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("owner_id is not null or owner_roster_id is not null", name="tasks_owner_required"),
        sa.CheckConstraint("progress between 0 and 100", name="tasks_progress_range"),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_roster_id"], ["team_roster.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("tasks_creator_idx", "tasks", ["creator_id"])
    op.create_index("tasks_due_idx", "tasks", ["due_date"])
    op.create_index("tasks_owner_idx", "tasks", ["owner_id"])
    op.create_index("tasks_owner_roster_idx", "tasks", ["owner_roster_id"])
    op.create_index("tasks_status_idx", "tasks", ["status"])
    op.create_index("tasks_workstream_idx", "tasks", ["workstream"])


def downgrade() -> None:
    op.drop_index("tasks_workstream_idx", table_name="tasks")
    op.drop_index("tasks_status_idx", table_name="tasks")
    op.drop_index("tasks_owner_roster_idx", table_name="tasks")
    op.drop_index("tasks_owner_idx", table_name="tasks")
    op.drop_index("tasks_due_idx", table_name="tasks")
    op.drop_index("tasks_creator_idx", table_name="tasks")
    op.drop_table("tasks")
    assigner_type.drop(op.get_bind(), checkfirst=True)
    task_work_kind.drop(op.get_bind(), checkfirst=True)
    task_priority.drop(op.get_bind(), checkfirst=True)
    task_status.drop(op.get_bind(), checkfirst=True)
