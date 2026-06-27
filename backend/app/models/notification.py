import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class NotificationSourceType(str, enum.Enum):
    task = "task"
    task_update = "task_update"
    task_post = "task_post"
    task_change_history = "task_change_history"
    system = "system"


class NotificationType(str, enum.Enum):
    task_assigned = "task_assigned"
    task_overdue = "task_overdue"
    task_update_added = "task_update_added"
    task_post_added = "task_post_added"
    risk_added = "risk_added"
    mention_added = "mention_added"


class NotificationSeverity(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint(
            "recipient_user_id",
            "type",
            "source_type",
            "source_id",
            name="notifications_dedupe_source_key",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    source_type: Mapped[NotificationSourceType] = mapped_column(
        Enum(NotificationSourceType, name="notification_source_type"),
        nullable=False,
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type"), nullable=False)
    severity: Mapped[NotificationSeverity] = mapped_column(
        Enum(NotificationSeverity, name="notification_severity"),
        nullable=False,
        default=NotificationSeverity.normal,
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False, default="")
    action_url: Mapped[str | None] = mapped_column(String, nullable=True)
    data: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    recipient = relationship("User", foreign_keys=[recipient_user_id])
    actor = relationship("User", foreign_keys=[actor_user_id])
    task = relationship("Task", foreign_keys=[task_id])
