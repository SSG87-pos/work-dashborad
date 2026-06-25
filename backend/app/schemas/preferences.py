from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserPreferenceRead(BaseModel):
    user_id: UUID
    active_page: str
    active_view: str
    selected_tag: str
    timeline_mode: str
    timeline_month: str
    timeline_year: str
    selected_task_id: UUID | None

    model_config = ConfigDict(from_attributes=True)


class UserPreferenceUpdate(BaseModel):
    active_page: str = "my"
    active_view: str = "board"
    selected_tag: str = "전체"
    timeline_mode: str = "month"
    timeline_month: str = ""
    timeline_year: str = ""
    selected_task_id: UUID | None = None


class DashboardMemoUpdate(BaseModel):
    body: str = ""
