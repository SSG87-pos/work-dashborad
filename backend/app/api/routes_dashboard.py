from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.task import Task, TaskStatus, TaskUpdateLog
from app.models.user import PermissionRole, User
from app.schemas.dashboard import DashboardInsight, DashboardInsightsRead, DashboardInsightTask

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def latest_update_at(task: Task) -> datetime | None:
    updates = sorted(task.updates, key=lambda item: comparable_datetime(item.created_at), reverse=True)
    return updates[0].created_at if updates else None


def comparable_datetime(value: datetime | None) -> datetime:
    if value is None:
        return datetime.min.replace(tzinfo=UTC)
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def task_row(task: Task, reason: str) -> DashboardInsightTask:
    return DashboardInsightTask(
        id=task.id,
        title=task.title,
        owner_id=task.owner_id,
        owner_roster_id=task.owner_roster_id,
        status=task.status.value if hasattr(task.status, "value") else str(task.status),
        priority=task.priority.value if hasattr(task.priority, "value") else str(task.priority),
        due_date=task.due_date,
        workstream=task.workstream,
        latest_update_at=latest_update_at(task),
        reason=reason,
    )


def top_tasks(tasks: list[Task], reason: str, limit: int = 5) -> list[DashboardInsightTask]:
    return [task_row(task, reason) for task in tasks[:limit]]


def is_open(task: Task) -> bool:
    return task.status != TaskStatus.done


def scoped_tasks(tasks: list[Task], scope: str, owner_id: UUID | None) -> list[Task]:
    if scope != "mine" or owner_id is None:
        return tasks
    return [task for task in tasks if task.owner_id == owner_id or task.owner_roster_id == owner_id]


def can_read_owner(current_user: User, owner_id: UUID | None) -> bool:
    if owner_id is None or owner_id == current_user.id:
        return True
    return current_user.permission_role in {PermissionRole.admin, PermissionRole.lead}


@router.get("/insights", response_model=DashboardInsightsRead)
def read_dashboard_insights(
    scope: str = Query("team", pattern="^(team|mine)$"),
    owner_id: UUID | None = None,
    today: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardInsightsRead:
    target_owner_id = owner_id if scope == "mine" else None
    if scope == "mine" and target_owner_id is None:
        target_owner_id = current_user.id
    if not can_read_owner(current_user, target_owner_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="dashboard_insights_owner_forbidden")

    base_today = today or date.today()
    stale_before = datetime.combine(base_today - timedelta(days=7), datetime.min.time(), tzinfo=UTC)
    tasks = list(
        db.scalars(
            select(Task)
            .where(Task.archived_at.is_(None))
            .options(selectinload(Task.updates).selectinload(TaskUpdateLog.author))
            .order_by(Task.due_date, Task.created_at)
        )
    )
    tasks = scoped_tasks(tasks, scope, target_owner_id)
    open_tasks = [task for task in tasks if is_open(task)]
    completed_tasks = [task for task in tasks if task.status == TaskStatus.done]
    due_soon = sorted(
        [task for task in open_tasks if 0 <= (task.due_date - base_today).days <= 3],
        key=lambda task: (task.due_date, task.title),
    )
    overdue = sorted(
        [task for task in open_tasks if task.due_date < base_today],
        key=lambda task: (task.due_date, task.title),
    )
    stale = sorted(
        [
            task for task in open_tasks
            if task.start_date <= base_today and comparable_datetime(latest_update_at(task)) < stale_before
        ],
        key=lambda task: (comparable_datetime(latest_update_at(task)), task.due_date, task.title),
    )
    unclassified = sorted(
        [task for task in open_tasks if not (task.workstream or "").strip()],
        key=lambda task: (task.due_date, task.title),
    )
    average_progress = round(sum(task.progress for task in open_tasks) / len(open_tasks)) if open_tasks else 100

    items = [
        DashboardInsight(
            key="open",
            label="내 진행 업무" if scope == "mine" else "팀 진행 업무",
            count=len(open_tasks),
            severity="info",
            caption=f"평균 진행률 {average_progress}%" if open_tasks else f"정상 · 평균 {average_progress}%",
            tasks=top_tasks(sorted(open_tasks, key=lambda task: (task.due_date, task.title)), "진행 중인 업무입니다."),
        ),
        DashboardInsight(
            key="soon",
            label="3일 내 마감",
            count=len(due_soon),
            severity="warning" if due_soon else "ok",
            caption="오늘 먼저 확인" if due_soon else "마감 여유",
            tasks=top_tasks(due_soon, "3일 안에 마감됩니다."),
        ),
        DashboardInsight(
            key="overdue",
            label="지연 업무",
            count=len(overdue),
            severity="critical" if overdue else "ok",
            caption="조정 필요" if overdue else "지연 없음",
            tasks=top_tasks(overdue, "마감일이 지났습니다."),
        ),
        DashboardInsight(
            key="stale",
            label="업데이트 정체",
            count=len(stale),
            severity="warning" if stale else "ok",
            caption="7일 이상 새 로그 없음" if stale else "최근 로그 양호",
            tasks=top_tasks(stale, "최근 7일간 업데이트 로그가 없습니다."),
        ),
        DashboardInsight(
            key="unclassified",
            label="흐름 미지정",
            count=len(unclassified),
            severity="warning" if unclassified else "ok",
            caption="업무흐름 정리 필요" if unclassified else "흐름 정리됨",
            tasks=top_tasks(unclassified, "상위 업무흐름이 비어 있습니다."),
        ),
        DashboardInsight(
            key="completed",
            label="완료 업무",
            count=len(completed_tasks),
            severity="ok",
            caption="보관 전 검토 가능",
            tasks=top_tasks(sorted(completed_tasks, key=lambda task: (task.due_date, task.title)), "완료된 업무입니다."),
        ),
    ]
    return DashboardInsightsRead(
        scope=scope,
        owner_id=target_owner_id,
        today=base_today,
        generated_at=datetime.now(UTC),
        items=items,
    )
