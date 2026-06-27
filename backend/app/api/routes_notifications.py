from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationBulkReadUpdate,
    NotificationListRead,
    NotificationRead,
    NotificationReadUpdate,
)
from app.services.notifications import (
    create_overdue_notifications_for_user,
    mark_all_notifications_read,
    mark_notification_read,
    notification_counts,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def serialize_notification(notification: Notification) -> NotificationRead:
    return NotificationRead(
        id=notification.id,
        recipient_user_id=notification.recipient_user_id,
        actor_user_id=notification.actor_user_id,
        actor_email=notification.actor.email if notification.actor else None,
        actor_name=notification.actor.name if notification.actor else None,
        task_id=notification.task_id,
        task_title=notification.task.title if notification.task else notification.data.get("task_title"),
        source_type=notification.source_type,
        source_id=notification.source_id,
        type=notification.type,
        severity=notification.severity,
        title=notification.title,
        body=notification.body,
        action_url=notification.action_url,
        metadata=notification.data or {},
        created_at=notification.created_at,
        read_at=notification.read_at,
        dismissed_at=notification.dismissed_at,
    )


@router.get("", response_model=NotificationListRead)
def list_notifications(
    limit: int = Query(default=30, ge=1, le=100),
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationListRead:
    create_overdue_notifications_for_user(db, user=current_user)
    db.commit()
    query = (
        select(Notification)
        .where(Notification.recipient_user_id == current_user.id, Notification.dismissed_at.is_(None))
        .options(selectinload(Notification.actor), selectinload(Notification.task))
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    items = db.scalars(query).all()
    unread_count, urgent_count = notification_counts(db, user_id=current_user.id)
    return NotificationListRead(
        items=[serialize_notification(item) for item in items],
        unread_count=unread_count,
        urgent_count=urgent_count,
    )


@router.patch("/{notification_id}/read", response_model=NotificationReadUpdate)
def mark_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationReadUpdate:
    notification = db.scalar(
        select(Notification).where(Notification.id == notification_id, Notification.recipient_user_id == current_user.id)
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="notification_not_found")
    mark_notification_read(db, notification=notification)
    db.commit()
    db.refresh(notification)
    return NotificationReadUpdate(id=notification.id, read_at=notification.read_at)


@router.patch("/read-all", response_model=NotificationBulkReadUpdate)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationBulkReadUpdate:
    updated_count = mark_all_notifications_read(db, user_id=current_user.id)
    db.commit()
    return NotificationBulkReadUpdate(updated_count=updated_count)
