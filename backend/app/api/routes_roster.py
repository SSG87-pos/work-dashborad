from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import require_admin
from app.models.user import TeamRoster, User
from app.schemas.user import TeamRosterCreate, TeamRosterRead, TeamRosterUpdate

router = APIRouter(prefix="/admin/roster", tags=["admin-roster"])


@router.get("", response_model=list[TeamRosterRead])
def list_roster_members(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[TeamRoster]:
    return list(db.scalars(select(TeamRoster).order_by(TeamRoster.expected_email.asc().nulls_last(), TeamRoster.name)))


@router.post("", response_model=TeamRosterRead, status_code=status.HTTP_201_CREATED)
def create_roster_member(
    payload: TeamRosterCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TeamRoster:
    roster = TeamRoster(**payload.model_dump())
    db.add(roster)
    db.commit()
    db.refresh(roster)
    return roster


@router.patch("/{roster_id}", response_model=TeamRosterRead)
def update_roster_member(
    roster_id: UUID,
    payload: TeamRosterUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TeamRoster:
    roster = db.get(TeamRoster, roster_id)
    if roster is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="roster_not_found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(roster, key, value)
    db.commit()
    db.refresh(roster)
    return roster
