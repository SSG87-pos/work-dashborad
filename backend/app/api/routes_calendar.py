from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.calendar import CalendarEvent
from app.models.user import PermissionRole, TeamRoster, User
from app.schemas.calendar import CalendarEventCreate, CalendarEventRead, CalendarEventUpdate

router = APIRouter(prefix="/calendar/events", tags=["calendar"])


def can_manage_event(user: User, event: CalendarEvent) -> bool:
    if user.permission_role in {PermissionRole.admin, PermissionRole.lead}:
        return True
    return event.created_by == user.id or event.owner_id == user.id


@router.get("", response_model=list[CalendarEventRead])
def list_calendar_events(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CalendarEvent]:
    return list(db.scalars(select(CalendarEvent).order_by(CalendarEvent.event_date, CalendarEvent.title)))


@router.post("", response_model=CalendarEventRead, status_code=status.HTTP_201_CREATED)
def create_calendar_event(
    payload: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarEvent:
    if payload.owner_id and db.get(User, payload.owner_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="owner_not_found")
    if payload.owner_roster_id and db.get(TeamRoster, payload.owner_roster_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="owner_roster_not_found")
    event = CalendarEvent(**payload.model_dump(), created_by=current_user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/{event_id}", response_model=CalendarEventRead)
def update_calendar_event(
    event_id: UUID,
    payload: CalendarEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarEvent:
    event = db.get(CalendarEvent, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="event_not_found")
    if not can_manage_event(current_user, event):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="event_manage_forbidden")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    event = db.get(CalendarEvent, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="event_not_found")
    if not can_manage_event(current_user, event):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="event_manage_forbidden")
    db.delete(event)
    db.commit()
    return None
