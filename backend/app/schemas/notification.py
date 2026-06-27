from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationSeverity, NotificationSourceType, NotificationType


class NotificationRead(BaseModel):
    id: UUID
    recipient_user_id: UUID
    actor_user_id: UUID | None
    actor_email: str | None
    actor_name: str | None
    task_id: UUID | None
    task_title: str | None
    source_type: NotificationSourceType
    source_id: UUID | None
    type: NotificationType
    severity: NotificationSeverity
    title: str
    body: str
    action_url: str | None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    read_at: datetime | None
    dismissed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class NotificationListRead(BaseModel):
    items: list[NotificationRead]
    unread_count: int
    urgent_count: int


class NotificationReadUpdate(BaseModel):
    id: UUID
    read_at: datetime | None


class NotificationBulkReadUpdate(BaseModel):
    updated_count: int
