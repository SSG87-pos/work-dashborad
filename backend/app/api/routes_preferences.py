from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.preferences import DashboardMemo, UserPreference
from app.models.user import User
from app.schemas.preferences import DashboardMemoUpdate, UserPreferenceRead, UserPreferenceUpdate

preferences_router = APIRouter(prefix="/preferences", tags=["preferences"])
memos_router = APIRouter(prefix="/dashboard-memos", tags=["dashboard-memos"])


def default_preference(user: User) -> UserPreference:
    return UserPreference(user_id=user.id)


@preferences_router.get("/me", response_model=UserPreferenceRead)
def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreference:
    preference = db.get(UserPreference, current_user.id)
    return preference or default_preference(current_user)


@preferences_router.put("/me", response_model=UserPreferenceRead)
def upsert_my_preferences(
    payload: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreference:
    preference = db.get(UserPreference, current_user.id)
    if preference is None:
        preference = UserPreference(user_id=current_user.id)
        db.add(preference)
    for key, value in payload.model_dump().items():
        setattr(preference, key, value)
    db.commit()
    db.refresh(preference)
    return preference


@memos_router.get("", response_model=dict[str, str])
def list_dashboard_memos(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    rows = db.scalars(select(DashboardMemo)).all()
    memos = {"my": "", "team": ""}
    memos.update({row.page_key: row.body for row in rows})
    return memos


@memos_router.put("/{page_key}", response_model=dict[str, str])
def upsert_dashboard_memo(
    page_key: str,
    payload: DashboardMemoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    memo = db.get(DashboardMemo, page_key)
    if memo is None:
        memo = DashboardMemo(page_key=page_key)
        db.add(memo)
    memo.body = payload.body
    memo.updated_by = current_user.id
    db.commit()
    return {page_key: memo.body}
