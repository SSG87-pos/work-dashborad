from __future__ import annotations

from datetime import date as DateOnly
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AiEvidencePeriod(BaseModel):
    start: DateOnly | None = None
    end: DateOnly | None = None


class AiEvidenceExclusions(BaseModel):
    personal_notes: bool = True
    private_calendar_details: bool = True


class AiSourceRef(BaseModel):
    type: str
    id: UUID | None = None
    date: DateOnly | None = None


class AiRecentUpdateEvidence(BaseModel):
    id: UUID
    date: DateOnly
    type: str
    body: str
    author_id: UUID | None = None


class AiRecentPostEvidence(BaseModel):
    id: UUID
    date: DateOnly
    scope: str
    title: str
    body: str
    url: str | None = None
    attachment_label: str | None = None
    attachment_caption: str | None = None
    attachment_text: str | None = None
    attachment_summary: str | None = None


class AiSignalEvidence(BaseModel):
    type: str
    label: str
    reason: str
    source: AiSourceRef | None = None


class AiTaskEvidenceItem(BaseModel):
    task_id: UUID
    task_title: str
    owner_id: UUID | None = None
    owner_name: str
    status: str
    priority: str
    workstream: str | None = None
    tags: list[str] = Field(default_factory=list)
    due_date: DateOnly
    progress: int
    recent_updates: list[AiRecentUpdateEvidence] = Field(default_factory=list)
    recent_posts: list[AiRecentPostEvidence] = Field(default_factory=list)
    open_subtasks: list[str] = Field(default_factory=list)
    signals: list[AiSignalEvidence] = Field(default_factory=list)


class AiEvidenceResponse(BaseModel):
    generated_at: datetime
    question_type: str
    period: AiEvidencePeriod
    excluded: AiEvidenceExclusions = Field(default_factory=AiEvidenceExclusions)
    report_type: str | None = None
    query: str | None = None
    workstream: str | None = None
    person: dict[str, str | None] | None = None
    filters: dict[str, str | None] = Field(default_factory=dict)
    items: list[AiTaskEvidenceItem] = Field(default_factory=list)


class AiRecentUpdateItem(BaseModel):
    task_id: UUID
    task_title: str
    owner_id: UUID | None = None
    owner_name: str
    status: str
    workstream: str | None = None
    tags: list[str] = Field(default_factory=list)
    update_id: UUID
    date: DateOnly
    type: str
    body: str


class AiRecentUpdatesResponse(BaseModel):
    generated_at: datetime
    question_type: str
    period: AiEvidencePeriod
    excluded: AiEvidenceExclusions = Field(default_factory=AiEvidenceExclusions)
    filters: dict[str, str | None] = Field(default_factory=dict)
    items: list[AiRecentUpdateItem] = Field(default_factory=list)
