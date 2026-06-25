from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TagCreate(BaseModel):
    name: str
    tone: str = "slate"


class TagUpdate(BaseModel):
    name: str | None = None
    tone: str | None = None


class TagRead(BaseModel):
    id: UUID
    name: str
    tone: str
    created_by: UUID | None

    model_config = ConfigDict(from_attributes=True)


class TagGroupSave(BaseModel):
    label: str
    tags: list[str]
    tone: str = "custom"


class TagGroupRead(BaseModel):
    id: str
    label: str
    tags: list[str]
    tone: str
    created_by: UUID | None

    model_config = ConfigDict(from_attributes=True)
