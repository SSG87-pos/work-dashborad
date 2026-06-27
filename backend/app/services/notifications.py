from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.notification import Notification, NotificationSeverity, NotificationSourceType, NotificationType
from app.models.task import Task, TaskPost, TaskStatus, TaskUpdateLog
from app.models.user import TeamRoster, User


def task_recipient_user_id(task: Task) -> UUID | None:
    if task.owner_id:
        return task.owner_id
    if task.owner_roster and task.owner_roster.auth_user_id:
        return task.owner_roster.auth_user_id
    return None


def create_notification_once(
    db: Session,
    *,
    recipient_user_id: UUID | None,
    actor_user_id: UUID | None,
    task_id: UUID | None,
    source_type: NotificationSourceType,
    source_id: UUID | None,
    type: NotificationType,
    severity: NotificationSeverity = NotificationSeverity.normal,
    title: str,
    body: str,
    action_url: str | None = None,
    metadata: dict | None = None,
) -> Notification | None:
    if recipient_user_id is None or recipient_user_id == actor_user_id:
        return None
    if source_id is not None:
        existing = db.scalar(
            select(Notification).where(
                Notification.recipient_user_id == recipient_user_id,
                Notification.type == type,
                Notification.source_type == source_type,
                Notification.source_id == source_id,
            )
        )
        if existing:
            return existing

    notification = Notification(
        recipient_user_id=recipient_user_id,
        actor_user_id=actor_user_id,
        task_id=task_id,
        source_type=source_type,
        source_id=source_id,
        type=type,
        severity=severity,
        title=title,
        body=body,
        action_url=action_url,
        data=metadata or {},
    )
    db.add(notification)
    return notification


def create_task_assignment_notification(db: Session, *, task: Task, actor: User) -> Notification | None:
    return create_notification_once(
        db,
        recipient_user_id=task_recipient_user_id(task),
        actor_user_id=actor.id,
        task_id=task.id,
        source_type=NotificationSourceType.task,
        source_id=task.id,
        type=NotificationType.task_assigned,
        title="새 업무가 배정되었습니다",
        body=task.title,
        action_url=f"/tasks/{task.id}",
        metadata={"task_title": task.title},
    )


def create_task_update_notification(
    db: Session,
    *,
    task: Task,
    update: TaskUpdateLog,
    actor: User,
) -> Notification | None:
    return create_notification_once(
        db,
        recipient_user_id=task_recipient_user_id(task),
        actor_user_id=actor.id,
        task_id=task.id,
        source_type=NotificationSourceType.task_update,
        source_id=update.id,
        type=NotificationType.task_update_added,
        title="내 업무에 업데이트 로그가 남겨졌습니다",
        body=update.body[:160],
        action_url=f"/tasks/{task.id}",
        metadata={"task_title": task.title, "update_type": update.update_type},
    )


def is_risk_post(post: TaskPost) -> bool:
    category_text = " ".join([post.category.label if post.category else "", post.title, post.body]).lower()
    return "리스크" in category_text or "risk" in category_text


def create_task_post_notification(
    db: Session,
    *,
    task: Task,
    post: TaskPost,
    actor: User,
) -> Notification | None:
    is_risk = is_risk_post(post)
    return create_notification_once(
        db,
        recipient_user_id=task_recipient_user_id(task),
        actor_user_id=actor.id,
        task_id=task.id,
        source_type=NotificationSourceType.task_post,
        source_id=post.id,
        type=NotificationType.risk_added if is_risk else NotificationType.task_post_added,
        severity=NotificationSeverity.high if is_risk else NotificationSeverity.normal,
        title="내 업무에 리스크 Note가 남겨졌습니다" if is_risk else "내 업무에 업무 Note가 남겨졌습니다",
        body=post.title,
        action_url=f"/tasks/{task.id}",
        metadata={"task_title": task.title, "post_scope": post.scope},
    )


def create_overdue_notifications_for_user(db: Session, *, user: User, today: date | None = None) -> None:
    current_date = today or date.today()
    tasks = db.scalars(
        select(Task)
        .outerjoin(TeamRoster, TeamRoster.id == Task.owner_roster_id)
        .where(
            Task.archived_at.is_(None),
            Task.status != TaskStatus.done,
            Task.due_date < current_date,
            or_(Task.owner_id == user.id, TeamRoster.auth_user_id == user.id),
        )
        .options(selectinload(Task.owner_roster))
    ).all()
    for task in tasks:
        create_notification_once(
            db,
            recipient_user_id=user.id,
            actor_user_id=None,
            task_id=task.id,
            source_type=NotificationSourceType.task,
            source_id=task.id,
            type=NotificationType.task_overdue,
            severity=NotificationSeverity.urgent,
            title="내 업무가 지연되었습니다",
            body=task.title,
            action_url=f"/tasks/{task.id}",
            metadata={"task_title": task.title, "due_date": task.due_date.isoformat()},
        )


def notification_counts(db: Session, *, user_id: UUID) -> tuple[int, int]:
    unread_count = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_user_id == user_id, Notification.read_at.is_(None), Notification.dismissed_at.is_(None))
    )
    urgent_count = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.recipient_user_id == user_id,
            Notification.read_at.is_(None),
            Notification.dismissed_at.is_(None),
            Notification.severity == NotificationSeverity.urgent,
        )
    )
    return int(unread_count or 0), int(urgent_count or 0)


def mark_notification_read(db: Session, *, notification: Notification) -> Notification:
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        db.add(notification)
    return notification


def mark_all_notifications_read(db: Session, *, user_id: UUID) -> int:
    notifications = db.scalars(
        select(Notification).where(
            Notification.recipient_user_id == user_id,
            Notification.read_at.is_(None),
            Notification.dismissed_at.is_(None),
        )
    ).all()
    for notification in notifications:
        notification.read_at = datetime.now(UTC)
        db.add(notification)
    return len(notifications)
