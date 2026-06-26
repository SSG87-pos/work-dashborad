from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DashboardInsightTask(BaseModel):
    id: UUID
    title: str
    owner_id: UUID | None = None
    owner_roster_id: UUID | None = None
    status: str
    priority: str
    due_date: date
    workstream: str | None = None
    latest_update_at: datetime | None = None
    reason: str


class DashboardInsight(BaseModel):
    key: str
    label: str
    count: int
    severity: str = "info"
    caption: str
    tasks: list[DashboardInsightTask] = Field(default_factory=list)


class DashboardInsightsRead(BaseModel):
    scope: str
    owner_id: UUID | None = None
    today: date
    generated_at: datetime
    items: list[DashboardInsight] = Field(default_factory=list)
