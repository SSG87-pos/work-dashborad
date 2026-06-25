from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class BriefingItemCreate(BaseModel):
    scope: str
    kind: str
    item_type: str = "note"
    title: str
    body: str = ""
    url: str | None = None
    status: str = "new"
    done: bool = False
    owner_id: UUID | None = None
    owner_roster_id: UUID | None = None
    task_id: UUID | None = None

    @model_validator(mode="after")
    def validate_scope(self) -> "BriefingItemCreate":
        if self.scope not in {"my", "team"}:
            raise ValueError("scope must be my or team")
        if self.kind not in {"inbox", "todo"}:
            raise ValueError("kind must be inbox or todo")
        if self.scope == "my" and self.owner_id is None and self.owner_roster_id is None:
            raise ValueError("my briefing item requires owner_id or owner_roster_id")
        return self


class BriefingItemUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    url: str | None = None
    status: str | None = None
    done: bool | None = None


class BriefingItemRead(BaseModel):
    id: UUID
    scope: str
    kind: str
    item_type: str
    title: str
    body: str
    url: str | None
    status: str
    done: bool
    owner_id: UUID | None
    owner_roster_id: UUID | None
    task_id: UUID | None
    author_id: UUID | None

    model_config = ConfigDict(from_attributes=True)
