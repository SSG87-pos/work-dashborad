import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.user import PermissionRole, TeamRoster, User


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("FIRST_ADMIN_PASSWORD must be 72 bytes or fewer for bcrypt.")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def seed_first_admin(db: Session, settings: Settings) -> User:
    if settings.first_admin_password == "CHANGE_ME_BEFORE_SEED":
        raise ValueError("FIRST_ADMIN_PASSWORD must be changed before seeding the first admin.")

    existing = db.scalar(select(User).where(User.email == settings.first_admin_email))
    if existing:
        existing.permission_role = PermissionRole.admin
        existing.is_active = True
        existing.is_team_member = True
        existing.name = existing.name or settings.first_admin_name
        existing.title = existing.title or settings.first_admin_title
        user = existing
    else:
        user = User(
            email=settings.first_admin_email,
            password_hash=hash_password(settings.first_admin_password),
            name=settings.first_admin_name,
            title=settings.first_admin_title,
            permission_role=PermissionRole.admin,
            is_team_member=True,
            is_active=True,
        )
        db.add(user)
        db.flush()

    roster = db.scalar(select(TeamRoster).where(TeamRoster.expected_email == settings.first_admin_email))
    if roster:
        roster.auth_user_id = user.id
        roster.permission_role = PermissionRole.admin
        roster.is_active = True
        roster.is_team_member = True
        roster.name = roster.name or settings.first_admin_name
        roster.title = roster.title or settings.first_admin_title
    else:
        db.add(
            TeamRoster(
                expected_email=settings.first_admin_email,
                auth_user_id=user.id,
                name=settings.first_admin_name,
                title=settings.first_admin_title,
                permission_role=PermissionRole.admin,
                is_team_member=True,
                is_active=True,
            )
        )

    db.commit()
    db.refresh(user)
    return user
