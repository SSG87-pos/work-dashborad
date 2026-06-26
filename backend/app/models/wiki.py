import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WikiPage(Base):
    __tablename__ = "wiki_pages"
    __table_args__ = (UniqueConstraint("workspace_id", "slug", name="wiki_pages_workspace_slug_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[str] = mapped_column(String, nullable=False, default="research-strategy")
    slug: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    page_type: Mapped[str] = mapped_column(String, nullable=False, default="topic")
    summary: Mapped[str] = mapped_column(String, nullable=False, default="")
    body_markdown: Mapped[str] = mapped_column(String, nullable=False, default="")
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    visibility: Mapped[str] = mapped_column(String, nullable=False, default="team")
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    revisions = relationship("WikiRevision", back_populates="page", cascade="all, delete-orphan")
    source_links = relationship("WikiSourceLink", back_populates="page", cascade="all, delete-orphan")
    outgoing_links = relationship("WikiLink", foreign_keys="WikiLink.from_page_id", cascade="all, delete-orphan")
    incoming_links = relationship("WikiLink", foreign_keys="WikiLink.to_page_id", cascade="all, delete-orphan")


class WikiRevision(Base):
    __tablename__ = "wiki_revisions"
    __table_args__ = (UniqueConstraint("page_id", "revision_number", name="wiki_revisions_page_number_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wiki_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[str] = mapped_column(String, nullable=False, default="")
    body_markdown: Mapped[str] = mapped_column(String, nullable=False, default="")
    change_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    page = relationship("WikiPage", back_populates="revisions")


class WikiSourceLink(Base):
    __tablename__ = "wiki_source_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wiki_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(String, nullable=False)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    source_title: Mapped[str] = mapped_column(String, nullable=False, default="")
    source_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    excerpt: Mapped[str] = mapped_column(String, nullable=False, default="")
    content_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    page = relationship("WikiPage", back_populates="source_links")


class WikiLink(Base):
    __tablename__ = "wiki_links"
    __table_args__ = (UniqueConstraint("from_page_id", "to_page_id", "relation_type", name="wiki_links_unique_relation"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wiki_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wiki_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relation_type: Mapped[str] = mapped_column(String, nullable=False, default="related_to")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AiWikiDraft(Base):
    __tablename__ = "ai_wiki_drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    draft_type: Mapped[str] = mapped_column(String, nullable=False, default="create_page")
    target_page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wiki_pages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    proposed_title: Mapped[str] = mapped_column(String, nullable=False)
    proposed_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    proposed_page_type: Mapped[str] = mapped_column(String, nullable=False, default="topic")
    proposed_summary: Mapped[str] = mapped_column(String, nullable=False, default="")
    proposed_body_markdown: Mapped[str] = mapped_column(String, nullable=False, default="")
    proposed_links: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    proposed_source_links: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    source_evidence_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    created_by_ai_model: Mapped[str] = mapped_column(String, nullable=False, default="manual")
    requested_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class WikiErrorBookEntry(Base):
    __tablename__ = "wiki_error_book"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question: Mapped[str] = mapped_column(String, nullable=False)
    wrong_or_incomplete_answer: Mapped[str] = mapped_column(String, nullable=False, default="")
    correction: Mapped[str] = mapped_column(String, nullable=False)
    missing_source_type: Mapped[str | None] = mapped_column(String, nullable=True)
    missing_source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    target_page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wiki_pages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    resolution_status: Mapped[str] = mapped_column(String, nullable=False, default="open")
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
