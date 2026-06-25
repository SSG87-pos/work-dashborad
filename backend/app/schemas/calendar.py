from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.calendar import CalendarScope


class CalendarEventCreate(BaseModel):
    title: str
    event_date: date
    start_date: date | None = None
    end_date: date | None = None
    scope: CalendarScope = CalendarScope.team
    owner_id: UUID | None = None
    owner_roster_id: UUID | None = None
    note: str = ""

    @model_validator(mode="after")
    def validate_personal_owner(self) -> "CalendarEventCreate":
        if self.scope == CalendarScope.personal and self.owner_id is None and self.owner_roster_id is None:
            raise ValueError("personal calendar events require owner_id or owner_roster_id")
        return self


class CalendarEventUpdate(BaseModel):
    title: str | None = None
    event_date: date | None = None
    start_date: date | None = None
    end_date: date | None = None
    note: str | None = None


class CalendarEventRead(BaseModel):
    id: UUID
    title: str
    event_date: date
    start_date: date | None
    end_date: date | None
    scope: CalendarScope
    owner_id: UUID | None
    owner_roster_id: UUID | None
    note: str
    created_by: UUID | None

    model_config = ConfigDict(from_attributes=True)
