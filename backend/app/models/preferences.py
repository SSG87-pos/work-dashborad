import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    active_page: Mapped[str] = mapped_column(String, nullable=False, default="my")
    active_view: Mapped[str] = mapped_column(String, nullable=False, default="board")
    selected_tag: Mapped[str] = mapped_column(String, nullable=False, default="전체")
    timeline_mode: Mapped[str] = mapped_column(String, nullable=False, default="month")
    timeline_month: Mapped[str] = mapped_column(String, nullable=False, default="")
    timeline_year: Mapped[str] = mapped_column(String, nullable=False, default="")
    selected_task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class DashboardMemo(Base):
    __tablename__ = "dashboard_memos"

    page_key: Mapped[str] = mapped_column(String, primary_key=True)
    body: Mapped[str] = mapped_column(String, nullable=False, default="")
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
