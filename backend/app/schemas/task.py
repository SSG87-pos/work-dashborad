from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.task import AssignerType, ChangeType, TaskPriority, TaskStatus, TaskWorkKind


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    workstream: str | None = None
    owner_id: UUID | None = None
    owner_roster_id: UUID | None = None
    assigner_type: AssignerType = AssignerType.personal
    status: TaskStatus = TaskStatus.planned
    priority: TaskPriority = TaskPriority.normal
    work_kind: TaskWorkKind = TaskWorkKind.standard
    start_date: date
    due_date: date
    recurring: str | None = None
    recurring_detail: str | None = None
    recurring_interval: int = 1
    recurring_weekdays: list[int] = Field(default_factory=list)
    recurring_start_date: date | None = None
    recurring_end_date: date | None = None
    recurring_no_end: bool = False
    recurring_duration_days: int = 1
    recurring_template_id: UUID | None = None

    @model_validator(mode="after")
    def validate_owner(self) -> "TaskCreate":
        if self.owner_id is None and self.owner_roster_id is None:
            raise ValueError("owner_id or owner_roster_id is required")
        return self


class TaskRead(BaseModel):
    id: UUID
    title: str
    description: str
    workstream: str | None
    owner_id: UUID | None
    owner_roster_id: UUID | None
    creator_id: UUID | None
    creator_email: str | None
    assigner_type: AssignerType
    status: TaskStatus
    priority: TaskPriority
    work_kind: TaskWorkKind
    start_date: date
    due_date: date
    progress: int
    recurring: str | None
    recurring_detail: str | None
    recurring_interval: int
    recurring_weekdays: list[int]
    recurring_start_date: date | None
    recurring_end_date: date | None
    recurring_no_end: bool
    recurring_duration_days: int
    recurring_template_id: UUID | None
    archived_at: datetime | None
    tags: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    workstream: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    work_kind: TaskWorkKind | None = None
    start_date: date | None = None
    due_date: date | None = None
    progress: int | None = None
    recurring: str | None = None
    recurring_detail: str | None = None
    recurring_interval: int | None = None
    recurring_weekdays: list[int] | None = None
    recurring_start_date: date | None = None
    recurring_end_date: date | None = None
    recurring_no_end: bool | None = None
    recurring_duration_days: int | None = None
    recurring_template_id: UUID | None = None


class TaskTagsUpdate(BaseModel):
    tags: list[str]


class TaskStatusUpdate(BaseModel):
    status: TaskStatus
    note: str | None = None


class TaskArchiveUpdate(BaseModel):
    archived: bool


class TaskChangeHistoryRead(BaseModel):
    id: UUID
    task_id: UUID
    change_type: ChangeType
    from_value: str | None
    to_value: str
    actor_id: UUID | None
    actor_email: str | None
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskHistoryNoteUpdate(BaseModel):
    note: str | None = None


class TaskLinkCreate(BaseModel):
    title: str
    url: str
    link_type: str = "링크"


class TaskLinkRead(BaseModel):
    id: UUID
    task_id: UUID
    title: str
    url: str
    link_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubtaskCreate(BaseModel):
    title: str
    sort_order: int = 0


class SubtaskUpdate(BaseModel):
    title: str | None = None
    done: bool | None = None
    sort_order: int | None = None


class SubtaskRead(BaseModel):
    id: UUID
    task_id: UUID
    title: str
    done: bool
    done_by: UUID | None
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class TaskUpdateLogCreate(BaseModel):
    body: str
    update_type: str = "note"


class TaskUpdateLogUpdate(BaseModel):
    body: str | None = None
    update_type: str | None = None


class TaskUpdateLogRead(BaseModel):
    id: UUID
    task_id: UUID
    author_id: UUID | None
    author_email: str | None
    body: str
    update_type: str

    model_config = ConfigDict(from_attributes=True)


class TaskPostCategoryCreate(BaseModel):
    key: str
    label: str
    tone: str = "slate"
    active: bool = True
    sort_order: int = 0


class TaskPostCategoryUpdate(BaseModel):
    key: str | None = None
    label: str | None = None
    tone: str | None = None
    active: bool | None = None
    sort_order: int | None = None


class TaskPostCategoryRead(BaseModel):
    id: UUID
    key: str
    label: str
    tone: str
    active: bool
    sort_order: int
    created_by: UUID | None

    model_config = ConfigDict(from_attributes=True)


class TaskPostCreate(BaseModel):
    category_id: UUID | None = None
    scope: str
    title: str
    body: str
    url: str | None = None
    attachment: dict | None = None
    posted_at: date | None = None


class TaskPostUpdate(BaseModel):
    category_id: UUID | None = None
    scope: str | None = None
    title: str | None = None
    body: str | None = None
    url: str | None = None
    attachment: dict | None = None
    posted_at: date | None = None


class TaskPostRead(BaseModel):
    id: UUID
    task_id: UUID
    category_id: UUID | None
    category_label: str | None
    scope: str
    title: str
    body: str
    url: str | None
    attachment: dict | None
    author_id: UUID | None
    author_email: str | None
    posted_at: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkstreamPostRollup(BaseModel):
    workstream: str
    posts: list[TaskPostRead]


class WorkstreamSuggestionTask(BaseModel):
    id: UUID
    title: str
    workstream: str
    matched_terms: list[str] = Field(default_factory=list)


class WorkstreamSuggestionRead(BaseModel):
    primary_label: str
    candidate_label: str
    score: float
    shared_terms: list[str] = Field(default_factory=list)
    task_count: int
    reason: str
    tasks: list[WorkstreamSuggestionTask] = Field(default_factory=list)


class CanvasTabRead(BaseModel):
    id: str
    label: str
    title: str
    description: str = ""


class CanvasNodeRead(BaseModel):
    id: str
    title: str
    body: str = ""
    template: str = "memo"
    parent_id: str | None = None
    todo_items: list[dict] = Field(default_factory=list)
    x: int = 0
    y: int = 0


class CanvasLinkRead(BaseModel):
    id: str
    source_id: str
    target_id: str


class CanvasState(BaseModel):
    active_tab_id: str | None = None
    tabs: list[CanvasTabRead]
    nodes_by_tab: dict[str, list[CanvasNodeRead]]
    links_by_tab: dict[str, list[CanvasLinkRead]]
