from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.briefing import BriefingItem
from app.models.user import TeamRoster, User
from app.schemas.briefing import BriefingItemCreate, BriefingItemRead, BriefingItemUpdate

router = APIRouter(prefix="/briefing-items", tags=["briefing-items"])


@router.get("", response_model=list[BriefingItemRead])
def list_briefing_items(
    scope: str | None = Query(default=None),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BriefingItem]:
    query = select(BriefingItem).order_by(BriefingItem.created_at.desc())
    if scope:
        query = query.where(BriefingItem.scope == scope)
    return list(db.scalars(query))


@router.post("", response_model=BriefingItemRead, status_code=status.HTTP_201_CREATED)
def create_briefing_item(
    payload: BriefingItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BriefingItem:
    if payload.owner_id and db.get(User, payload.owner_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="owner_not_found")
    if payload.owner_roster_id and db.get(TeamRoster, payload.owner_roster_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="owner_roster_not_found")
    item = BriefingItem(**payload.model_dump(), author_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=BriefingItemRead)
def update_briefing_item(
    item_id: UUID,
    payload: BriefingItemUpdate,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BriefingItem:
    item = db.get(BriefingItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="briefing_item_not_found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item
