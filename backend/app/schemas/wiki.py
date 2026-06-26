from __future__ import annotations

from datetime import date as DateOnly
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WikiSourceLinkInput(BaseModel):
    source_type: str
    source_id: UUID
    source_title: str = ""
    source_date: DateOnly | None = None
    excerpt: str = ""
    content_hash: str | None = None


class WikiLinkInput(BaseModel):
    to_page_id: UUID
    relation_type: str = "related_to"


class WikiDraftCreate(BaseModel):
    draft_type: str = "create_page"
    target_page_id: UUID | None = None
    proposed_title: str
    proposed_slug: str | None = None
    proposed_page_type: str = "topic"
    proposed_summary: str = ""
    proposed_body_markdown: str = ""
    proposed_links: list[WikiLinkInput] = Field(default_factory=list)
    proposed_source_links: list[WikiSourceLinkInput] = Field(default_factory=list)
    source_evidence_json: dict = Field(default_factory=dict)
    created_by_ai_model: str = "manual"


class WikiDraftFromDashboardCreate(BaseModel):
    source_type: str = "task"
    source_id: UUID
    proposed_title: str | None = None
    proposed_page_type: str = "workstream"
    created_by_ai_model: str = "deterministic-dashboard-draft"


class WikiDraftRead(BaseModel):
    id: UUID
    draft_type: str
    target_page_id: UUID | None
    proposed_title: str
    proposed_slug: str | None
    proposed_page_type: str
    proposed_summary: str
    proposed_body_markdown: str
    proposed_links: list = Field(default_factory=list)
    proposed_source_links: list = Field(default_factory=list)
    source_evidence_json: dict = Field(default_factory=dict)
    status: str
    created_by_ai_model: str
    requested_by_user_id: UUID | None
    reviewed_by_user_id: UUID | None
    created_at: datetime
    reviewed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class WikiDraftApprove(BaseModel):
    change_reason: str | None = None
    visibility: str = "team"
    status: str = "published"


class WikiDraftReject(BaseModel):
    reason: str | None = None


class WikiSourceLinkRead(BaseModel):
    id: UUID
    page_id: UUID
    source_type: str
    source_id: UUID
    source_title: str
    source_date: DateOnly | None
    excerpt: str
    content_hash: str | None
    created_at: datetime
    stale: bool = False

    model_config = ConfigDict(from_attributes=True)


class WikiLinkRead(BaseModel):
    id: UUID
    from_page_id: UUID
    to_page_id: UUID
    to_page_title: str
    relation_type: str
    created_at: datetime


class WikiPageSummary(BaseModel):
    id: UUID
    slug: str
    title: str
    page_type: str
    summary: str
    status: str
    visibility: str
    updated_at: datetime
    source_count: int = 0
    link_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class WikiPageRead(WikiPageSummary):
    body_markdown: str
    latest_revision_number: int = 0
    sources: list[WikiSourceLinkRead] = Field(default_factory=list)
    links: list[WikiLinkRead] = Field(default_factory=list)


class WikiSearchResponse(BaseModel):
    generated_at: datetime
    query: str
    items: list[WikiPageSummary] = Field(default_factory=list)


class WikiErrorBookCreate(BaseModel):
    question: str
    wrong_or_incomplete_answer: str = ""
    correction: str
    missing_source_type: str | None = None
    missing_source_id: UUID | None = None
    target_page_id: UUID | None = None


class WikiErrorBookRead(BaseModel):
    id: UUID
    question: str
    wrong_or_incomplete_answer: str
    correction: str
    missing_source_type: str | None
    missing_source_id: UUID | None
    target_page_id: UUID | None
    resolution_status: str
    created_by_user_id: UUID | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
