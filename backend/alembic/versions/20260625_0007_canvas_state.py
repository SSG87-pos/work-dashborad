"""create canvas state tables

Revision ID: 20260625_0007
Revises: 20260625_0006
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0007"
down_revision: str | None = "20260625_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "canvas_tabs",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint("length(btrim(id)) > 0", name="canvas_tabs_id_not_blank"),
        sa.CheckConstraint("length(btrim(label)) > 0", name="canvas_tabs_label_not_blank"),
        sa.CheckConstraint("length(btrim(title)) > 0", name="canvas_tabs_title_not_blank"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("canvas_tabs_sort_idx", "canvas_tabs", ["sort_order"])
    op.create_index("canvas_tabs_updated_by_idx", "canvas_tabs", ["updated_by"])

    op.create_table(
        "canvas_nodes",
        sa.Column("tab_id", sa.Text(), nullable=False),
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("template", sa.Text(), server_default="memo", nullable=False),
        sa.Column("parent_id", sa.Text(), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("x", sa.Integer(), server_default="0", nullable=False),
        sa.Column("y", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint("length(btrim(id)) > 0", name="canvas_nodes_id_not_blank"),
        sa.CheckConstraint("length(btrim(title)) > 0", name="canvas_nodes_title_not_blank"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tab_id"], ["canvas_tabs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("tab_id", "id"),
    )
    op.create_index("canvas_nodes_parent_idx", "canvas_nodes", ["tab_id", "parent_id"])
    op.create_index("canvas_nodes_tab_sort_idx", "canvas_nodes", ["tab_id", "sort_order"])
    op.create_index("canvas_nodes_updated_by_idx", "canvas_nodes", ["updated_by"])

    op.create_table(
        "canvas_links",
        sa.Column("tab_id", sa.Text(), nullable=False),
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("source_id", sa.Text(), nullable=False),
        sa.Column("target_id", sa.Text(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint("length(btrim(id)) > 0", name="canvas_links_id_not_blank"),
        sa.CheckConstraint("source_id <> target_id", name="canvas_links_distinct_nodes"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tab_id"], ["canvas_tabs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("tab_id", "id"),
    )
    op.create_index("canvas_links_tab_source_idx", "canvas_links", ["tab_id", "source_id"])
    op.create_index("canvas_links_updated_by_idx", "canvas_links", ["updated_by"])


def downgrade() -> None:
    op.drop_index("canvas_links_updated_by_idx", table_name="canvas_links")
    op.drop_index("canvas_links_tab_source_idx", table_name="canvas_links")
    op.drop_table("canvas_links")
    op.drop_index("canvas_nodes_updated_by_idx", table_name="canvas_nodes")
    op.drop_index("canvas_nodes_tab_sort_idx", table_name="canvas_nodes")
    op.drop_index("canvas_nodes_parent_idx", table_name="canvas_nodes")
    op.drop_table("canvas_nodes")
    op.drop_index("canvas_tabs_updated_by_idx", table_name="canvas_tabs")
    op.drop_index("canvas_tabs_sort_idx", table_name="canvas_tabs")
    op.drop_table("canvas_tabs")
