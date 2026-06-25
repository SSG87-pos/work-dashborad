import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PermissionRole(str, enum.Enum):
    admin = "admin"
    lead = "lead"
    member = "member"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False, default="")
    team: Mapped[str] = mapped_column(String, nullable=False, default="연구기획그룹-전략")
    profile_emoji: Mapped[str] = mapped_column(String, nullable=False, default="👤")
    permission_role: Mapped[PermissionRole] = mapped_column(
        Enum(PermissionRole, name="permission_role"),
        nullable=False,
        default=PermissionRole.member,
    )
    is_team_member: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    roster_entries: Mapped[list["TeamRoster"]] = relationship(back_populates="auth_user")


class TeamRoster(Base):
    __tablename__ = "team_roster"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expected_email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    auth_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False, default="")
    profile_emoji: Mapped[str] = mapped_column(String, nullable=False, default="👤")
    permission_role: Mapped[PermissionRole] = mapped_column(
        Enum(PermissionRole, name="permission_role"),
        nullable=False,
        default=PermissionRole.member,
    )
    is_team_member: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    auth_user: Mapped[User | None] = relationship(back_populates="roster_entries")
