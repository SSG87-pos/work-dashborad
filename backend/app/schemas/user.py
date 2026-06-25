from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import PermissionRole


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    name: str
    title: str
    team: str
    profile_emoji: str
    permission_role: PermissionRole
    is_team_member: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    name: str | None = None
    title: str | None = None
    profile_emoji: str | None = None


class TeamRosterCreate(BaseModel):
    expected_email: EmailStr | None = None
    name: str
    title: str = ""
    profile_emoji: str = "👤"
    permission_role: PermissionRole = PermissionRole.member
    is_team_member: bool = True
    is_active: bool = True


class TeamRosterUpdate(BaseModel):
    expected_email: EmailStr | None = None
    auth_user_id: UUID | None = None
    name: str | None = None
    title: str | None = None
    profile_emoji: str | None = None
    permission_role: PermissionRole | None = None
    is_team_member: bool | None = None
    is_active: bool | None = None


class TeamRosterRead(BaseModel):
    id: UUID
    expected_email: EmailStr | None
    auth_user_id: UUID | None
    name: str
    title: str
    profile_emoji: str
    permission_role: PermissionRole
    is_team_member: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
