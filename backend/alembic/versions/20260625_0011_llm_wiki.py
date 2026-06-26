"""add llm wiki tables

Revision ID: 20260625_0011
Revises: 20260625_0010
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260625_0011"
down_revision: str | None = "20260625_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "wiki_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", sa.Text(), server_default="research-strategy", nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("page_type", sa.Text(), server_default="topic", nullable=False),
        sa.Column("summary", sa.Text(), server_default="", nullable=False),
        sa.Column("body_markdown", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.Text(), server_default="draft", nullable=False),
        sa.Column("visibility", sa.Text(), server_default="team", nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("length(btrim(slug)) > 0", name="wiki_pages_slug_not_blank"),
        sa.CheckConstraint("length(btrim(title)) > 0", name="wiki_pages_title_not_blank"),
        sa.CheckConstraint("status in ('draft', 'published', 'archived')", name="wiki_pages_status_valid"),
        sa.CheckConstraint("visibility in ('team', 'private', 'workspace')", name="wiki_pages_visibility_valid"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "slug", name="wiki_pages_workspace_slug_key"),
    )
    op.create_index("wiki_pages_owner_idx", "wiki_pages", ["owner_user_id"])
    op.create_index("wiki_pages_search_idx", "wiki_pages", ["workspace_id", "status", "page_type"])

    op.create_table(
        "wiki_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("summary", sa.Text(), server_default="", nullable=False),
        sa.Column("body_markdown", sa.Text(), server_default="", nullable=False),
        sa.Column("change_reason", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["page_id"], ["wiki_pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("page_id", "revision_number", name="wiki_revisions_page_number_key"),
    )
    op.create_index("wiki_revisions_page_idx", "wiki_revisions", ["page_id"])

    op.create_table(
        "wiki_source_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_title", sa.Text(), server_default="", nullable=False),
        sa.Column("source_date", sa.Date(), nullable=True),
        sa.Column("excerpt", sa.Text(), server_default="", nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["page_id"], ["wiki_pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("wiki_source_links_page_idx", "wiki_source_links", ["page_id"])
    op.create_index("wiki_source_links_source_idx", "wiki_source_links", ["source_type", "source_id"])

    op.create_table(
        "wiki_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("to_page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relation_type", sa.Text(), server_default="related_to", nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("from_page_id <> to_page_id", name="wiki_links_distinct_pages"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["from_page_id"], ["wiki_pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_page_id"], ["wiki_pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("from_page_id", "to_page_id", "relation_type", name="wiki_links_unique_relation"),
    )
    op.create_index("wiki_links_from_idx", "wiki_links", ["from_page_id"])
    op.create_index("wiki_links_to_idx", "wiki_links", ["to_page_id"])

    op.create_table(
        "ai_wiki_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("draft_type", sa.Text(), server_default="create_page", nullable=False),
        sa.Column("target_page_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("proposed_title", sa.Text(), nullable=False),
        sa.Column("proposed_slug", sa.Text(), nullable=True),
        sa.Column("proposed_page_type", sa.Text(), server_default="topic", nullable=False),
        sa.Column("proposed_summary", sa.Text(), server_default="", nullable=False),
        sa.Column("proposed_body_markdown", sa.Text(), server_default="", nullable=False),
        sa.Column("proposed_links", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("proposed_source_links", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("source_evidence_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("status", sa.Text(), server_default="pending", nullable=False),
        sa.Column("created_by_ai_model", sa.Text(), server_default="manual", nullable=False),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status in ('pending', 'approved', 'rejected', 'superseded')", name="ai_wiki_drafts_status_valid"),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_page_id"], ["wiki_pages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ai_wiki_drafts_requested_by_idx", "ai_wiki_drafts", ["requested_by_user_id"])
    op.create_index("ai_wiki_drafts_status_idx", "ai_wiki_drafts", ["status", "created_at"])
    op.create_index("ai_wiki_drafts_target_idx", "ai_wiki_drafts", ["target_page_id"])

    op.create_table(
        "wiki_error_book",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("wrong_or_incomplete_answer", sa.Text(), server_default="", nullable=False),
        sa.Column("correction", sa.Text(), nullable=False),
        sa.Column("missing_source_type", sa.Text(), nullable=True),
        sa.Column("missing_source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("target_page_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolution_status", sa.Text(), server_default="open", nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("resolution_status in ('open', 'drafted', 'fixed', 'rejected')", name="wiki_error_book_status_valid"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_page_id"], ["wiki_pages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("wiki_error_book_status_idx", "wiki_error_book", ["resolution_status", "created_at"])
    op.create_index("wiki_error_book_target_idx", "wiki_error_book", ["target_page_id"])


def downgrade() -> None:
    op.drop_index("wiki_error_book_target_idx", table_name="wiki_error_book")
    op.drop_index("wiki_error_book_status_idx", table_name="wiki_error_book")
    op.drop_table("wiki_error_book")
    op.drop_index("ai_wiki_drafts_target_idx", table_name="ai_wiki_drafts")
    op.drop_index("ai_wiki_drafts_status_idx", table_name="ai_wiki_drafts")
    op.drop_index("ai_wiki_drafts_requested_by_idx", table_name="ai_wiki_drafts")
    op.drop_table("ai_wiki_drafts")
    op.drop_index("wiki_links_to_idx", table_name="wiki_links")
    op.drop_index("wiki_links_from_idx", table_name="wiki_links")
    op.drop_table("wiki_links")
    op.drop_index("wiki_source_links_source_idx", table_name="wiki_source_links")
    op.drop_index("wiki_source_links_page_idx", table_name="wiki_source_links")
    op.drop_table("wiki_source_links")
    op.drop_index("wiki_revisions_page_idx", table_name="wiki_revisions")
    op.drop_table("wiki_revisions")
    op.drop_index("wiki_pages_search_idx", table_name="wiki_pages")
    op.drop_index("wiki_pages_owner_idx", table_name="wiki_pages")
    op.drop_table("wiki_pages")
