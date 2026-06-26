from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.task import Task, TaskPost, TaskTag, TaskUpdateLog
from app.models.user import TeamRoster, User
from app.schemas.ai import (
    AiEvidencePeriod,
    AiEvidenceResponse,
    AiRecentPostEvidence,
    AiRecentUpdateEvidence,
    AiRecentUpdateItem,
    AiRecentUpdatesResponse,
    AiSignalEvidence,
    AiSourceRef,
    AiTaskEvidenceItem,
)

router = APIRouter(prefix="/ai/read", tags=["ai-read"])

issue_words = ["보류", "확인 필요", "지연", "요청", "대기", "리스크", "미확보", "협의 필요", "의사결정"]
explicit_issue_types = {"issue", "risk", "request", "decision", "이슈", "리스크", "요청", "결정사항"}


def today_utc() -> datetime:
    return datetime.now(UTC)


def in_period(value: date | datetime | None, period_start: date | None, period_end: date | None) -> bool:
    if value is None:
        return False
    day = value.date() if isinstance(value, datetime) else value
    if period_start and day < period_start:
        return False
    if period_end and day > period_end:
        return False
    return True


def text_has_issue(value: str | None) -> bool:
    text = (value or "").lower()
    return any(word.lower() in text for word in issue_words)


def update_is_issue(update: TaskUpdateLog) -> bool:
    return update.update_type.lower() in explicit_issue_types or text_has_issue(update.body)


def post_is_issue(post: TaskPost) -> bool:
    scope = post.scope.lower()
    return scope in explicit_issue_types or text_has_issue(post.scope) or text_has_issue(post.title) or text_has_issue(post.body)


def progress_for(task: Task) -> int:
    if task.subtasks:
        done = sum(1 for subtask in task.subtasks if subtask.done)
        return round((done / len(task.subtasks)) * 100)
    return task.progress


def owner_name_for(task: Task) -> str:
    if task.owner_roster:
        return task.owner_roster.name
    if task.owner:
        return task.owner.name
    return "미지정"


def owner_id_for(task: Task) -> UUID | None:
    return task.owner_roster_id or task.owner_id


def task_tags(task: Task) -> list[str]:
    return [link.tag.name for link in task.tag_links if link.tag]


def task_query() -> select:
    return (
        select(Task)
        .options(
            selectinload(Task.owner),
            selectinload(Task.owner_roster),
            selectinload(Task.subtasks),
            selectinload(Task.updates),
            selectinload(Task.posts).selectinload(TaskPost.category),
            selectinload(Task.tag_links).selectinload(TaskTag.tag),
        )
        .order_by(Task.created_at, Task.title)
    )


def find_person(db: Session, person: str | None) -> tuple[UUID | None, str | None]:
    if not person:
        return None, None
    try:
        return UUID(person), None
    except ValueError:
        pass
    roster = db.scalar(select(TeamRoster).where(TeamRoster.name == person))
    if roster:
        return roster.id, roster.name
    user = db.scalar(select(User).where(User.name == person))
    if user:
        return user.id, user.name
    return None, person


def matches_person(task: Task, person_id: UUID | None, person_name: str | None) -> bool:
    if person_id and person_id in {task.owner_id, task.owner_roster_id}:
        return True
    if person_name and owner_name_for(task) == person_name:
        return True
    return False


def sorted_recent_updates(task: Task, period_start: date | None, period_end: date | None) -> list[TaskUpdateLog]:
    updates = [update for update in task.updates if in_period(update.created_at, period_start, period_end)]
    return sorted(updates, key=lambda update: (update.created_at or datetime.min, update_is_issue(update)), reverse=True)


def sorted_recent_posts(task: Task, period_start: date | None, period_end: date | None) -> list[TaskPost]:
    posts = [post for post in task.posts if in_period(post.posted_at, period_start, period_end)]
    return sorted(posts, key=lambda post: (post.posted_at, post.created_at or datetime.min), reverse=True)


def build_signals(
    task: Task,
    recent_updates: list[TaskUpdateLog],
    recent_posts: list[TaskPost],
    period_start: date | None,
    period_end: date | None,
) -> list[AiSignalEvidence]:
    signals: list[AiSignalEvidence] = []
    for update in recent_updates:
        if update_is_issue(update):
            signals.append(
                AiSignalEvidence(
                    type="explicit",
                    label="이슈",
                    reason=update.body,
                    source=AiSourceRef(type="task_update", id=update.id, date=update.created_at.date() if update.created_at else None),
                )
            )
    for post in recent_posts:
        if post_is_issue(post):
            signals.append(
                AiSignalEvidence(
                    type="explicit",
                    label=post.scope or "업무 노트",
                    reason=" - ".join(part for part in [post.title, post.body] if part),
                    source=AiSourceRef(type="task_post", id=post.id, date=post.posted_at),
                )
            )
    if task.status.value in {"보류", "검토/대기"}:
        signals.append(AiSignalEvidence(type="explicit", label=task.status.value, reason=f"업무 상태가 {task.status.value}입니다."))
    if not recent_updates and task.status.value != "완료":
        start = period_start.isoformat() if period_start else "선택 기간 시작"
        end = period_end.isoformat() if period_end else "선택 기간 종료"
        signals.append(AiSignalEvidence(type="inferred", label="최근 기록 부족", reason=f"{start}~{end} 내 업데이트 없음"))
    if period_end and task.due_date <= period_end and task.status.value != "완료" and progress_for(task) < 100:
        signals.append(AiSignalEvidence(type="inferred", label="계획대비 지연 가능", reason="선택 기간 종료일까지 완료되지 않은 마감 업무입니다."))
    return signals


def build_task_item(task: Task, period_start: date | None, period_end: date | None) -> AiTaskEvidenceItem:
    recent_updates = sorted_recent_updates(task, period_start, period_end)
    recent_posts = sorted_recent_posts(task, period_start, period_end)
    return AiTaskEvidenceItem(
        task_id=task.id,
        task_title=task.title,
        owner_id=owner_id_for(task),
        owner_name=owner_name_for(task),
        status=task.status.value,
        priority=task.priority.value,
        workstream=task.workstream,
        tags=task_tags(task),
        due_date=task.due_date,
        progress=progress_for(task),
        recent_updates=[
            AiRecentUpdateEvidence(
                id=update.id,
                date=update.created_at.date() if update.created_at else today_utc().date(),
                type=update.update_type,
                body=update.body,
                author_id=update.author_id,
            )
            for update in recent_updates
        ],
        recent_posts=[
            AiRecentPostEvidence(
                id=post.id,
                date=post.posted_at,
                scope=post.scope,
                title=post.title,
                body=post.body,
                url=post.url,
            )
            for post in recent_posts
        ],
        open_subtasks=[subtask.title for subtask in task.subtasks if not subtask.done],
        signals=build_signals(task, recent_updates, recent_posts, period_start, period_end),
    )


def sort_items(items: list[AiTaskEvidenceItem]) -> list[AiTaskEvidenceItem]:
    return sorted(items, key=lambda item: (0 if item.signals else 1, item.due_date, item.task_title))


def base_response(question_type: str, period_start: date | None, period_end: date | None, **extra) -> AiEvidenceResponse:
    return AiEvidenceResponse(
        generated_at=today_utc(),
        question_type=question_type,
        period=AiEvidencePeriod(start=period_start, end=period_end),
        **extra,
    )


@router.get("/report-evidence", response_model=AiEvidenceResponse)
def report_evidence(
    period_start: date | None = None,
    period_end: date | None = None,
    report_type: str = "weekly",
    owner: str | None = None,
    workstream: str | None = None,
    status: str | None = None,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiEvidenceResponse:
    person_id, person_name = find_person(db, owner)
    tasks = list(db.scalars(task_query()).all())
    items = []
    for task in tasks:
        if owner and not matches_person(task, person_id, person_name):
            continue
        if workstream and task.workstream != workstream:
            continue
        if status and task.status.value != status:
            continue
        items.append(build_task_item(task, period_start, period_end))
    return base_response(
        "report-evidence",
        period_start,
        period_end,
        report_type=report_type,
        filters={"owner": owner, "workstream": workstream, "status": status},
        items=sort_items(items),
    )


@router.get("/person-work-status", response_model=AiEvidenceResponse)
def person_work_status(
    person: str = Query(...),
    period_start: date | None = None,
    period_end: date | None = None,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiEvidenceResponse:
    person_id, person_name = find_person(db, person)
    tasks = [task for task in db.scalars(task_query()).all() if matches_person(task, person_id, person_name)]
    return base_response(
        "person-work-status",
        period_start,
        period_end,
        person={"id": str(person_id) if person_id else None, "name": person_name or person},
        items=sort_items([build_task_item(task, period_start, period_end) for task in tasks]),
    )


@router.get("/topic-search", response_model=AiEvidenceResponse)
def topic_search(
    query: str = Query(""),
    period_start: date | None = None,
    period_end: date | None = None,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiEvidenceResponse:
    needle = query.lower().strip()
    tasks = []
    for task in db.scalars(task_query()).all():
        fields = [
            task.title,
            task.description,
            task.workstream or "",
            *task_tags(task),
            *(update.body for update in task.updates),
            *(post.scope for post in task.posts),
            *(post.title for post in task.posts),
            *(post.body for post in task.posts),
        ]
        if not needle or any(needle in field.lower() for field in fields):
            tasks.append(task)
    return base_response(
        "topic-search",
        period_start,
        period_end,
        query=query,
        items=sort_items([build_task_item(task, period_start, period_end) for task in tasks]),
    )


@router.get("/workstream-issues", response_model=AiEvidenceResponse)
def workstream_issues(
    workstream: str = Query(""),
    period_start: date | None = None,
    period_end: date | None = None,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiEvidenceResponse:
    items = [
        build_task_item(task, period_start, period_end)
        for task in db.scalars(task_query()).all()
        if (not workstream or task.workstream == workstream)
    ]
    issue_items = [item for item in items if item.signals]
    return base_response(
        "workstream-issues",
        period_start,
        period_end,
        workstream=workstream,
        items=sort_items(issue_items),
    )


@router.get("/recent-updates", response_model=AiRecentUpdatesResponse)
def recent_updates(
    owner: str | None = None,
    status: str | None = None,
    tag: str | None = None,
    workstream: str | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiRecentUpdatesResponse:
    person_id, person_name = find_person(db, owner)
    items: list[AiRecentUpdateItem] = []
    for task in db.scalars(task_query()).all():
        tags = task_tags(task)
        if owner and not matches_person(task, person_id, person_name):
            continue
        if status and task.status.value != status:
            continue
        if tag and tag not in tags:
            continue
        if workstream and task.workstream != workstream:
            continue
        for update in sorted_recent_updates(task, period_start, period_end):
            items.append(
                AiRecentUpdateItem(
                    task_id=task.id,
                    task_title=task.title,
                    owner_id=owner_id_for(task),
                    owner_name=owner_name_for(task),
                    status=task.status.value,
                    workstream=task.workstream,
                    tags=tags,
                    update_id=update.id,
                    date=update.created_at.date() if update.created_at else today_utc().date(),
                    type=update.update_type,
                    body=update.body,
                )
            )
    items.sort(key=lambda item: (item.date, item.type == "issue"), reverse=True)
    return AiRecentUpdatesResponse(
        generated_at=today_utc(),
        question_type="recent-updates",
        period=AiEvidencePeriod(start=period_start, end=period_end),
        filters={"owner": owner, "status": status, "tag": tag, "workstream": workstream},
        items=items,
    )
