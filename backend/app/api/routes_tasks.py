from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.task import Subtask, Task, TaskUpdateLog
from app.models.task import ChangeType, Tag, TaskChangeHistory, TaskLink, TaskPost, TaskPostCategory, TaskTag
from app.models.user import PermissionRole, TeamRoster, User
from app.schemas.task import (
    SubtaskCreate,
    SubtaskRead,
    SubtaskUpdate,
    TaskArchiveUpdate,
    TaskChangeHistoryRead,
    TaskCreate,
    TaskHistoryNoteUpdate,
    TaskLinkCreate,
    TaskLinkRead,
    TaskPostCreate,
    TaskPostRead,
    TaskPostUpdate,
    TaskRead,
    TaskStatusUpdate,
    TaskTagsUpdate,
    TaskUpdate,
    TaskUpdateLogCreate,
    TaskUpdateLogRead,
    TaskUpdateLogUpdate,
)
from app.services.notifications import (
    create_task_assignment_notification,
    create_task_post_notification,
    create_task_update_notification,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def serialize_task(task: Task) -> TaskRead:
    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        workstream=task.workstream,
        owner_id=task.owner_id,
        owner_roster_id=task.owner_roster_id,
        creator_id=task.creator_id,
        creator_email=task.creator.email if task.creator else None,
        assigner_type=task.assigner_type,
        status=task.status,
        priority=task.priority,
        work_kind=task.work_kind,
        start_date=task.start_date,
        due_date=task.due_date,
        progress=task.progress,
        recurring=task.recurring,
        recurring_detail=task.recurring_detail,
        recurring_interval=task.recurring_interval,
        recurring_weekdays=task.recurring_weekdays or [],
        recurring_start_date=task.recurring_start_date,
        recurring_end_date=task.recurring_end_date,
        recurring_no_end=task.recurring_no_end,
        recurring_duration_days=task.recurring_duration_days,
        recurring_template_id=task.recurring_template_id,
        archived_at=task.archived_at,
        tags=[link.tag.name for link in task.tag_links if link.tag],
    )


def can_manage_task(user: User, task: Task) -> bool:
    if user.permission_role in {PermissionRole.admin, PermissionRole.lead}:
        return True
    if task.creator_id == user.id or task.owner_id == user.id:
        return True
    if task.owner_roster and task.owner_roster.auth_user_id == user.id:
        return True
    return False


def get_task_or_404(db: Session, task_id: UUID) -> Task:
    task = db.scalar(
        select(Task)
        .where(Task.id == task_id)
        .options(selectinload(Task.creator), selectinload(Task.owner_roster), selectinload(Task.tag_links).selectinload(TaskTag.tag))
    )
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_not_found")
    return task


def require_task_manager(db: Session, task_id: UUID, user: User) -> Task:
    task = get_task_or_404(db, task_id)
    if not can_manage_task(user, task):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="task_manage_forbidden")
    return task


def serialize_update(update: TaskUpdateLog) -> TaskUpdateLogRead:
    return TaskUpdateLogRead(
        id=update.id,
        task_id=update.task_id,
        author_id=update.author_id,
        author_email=update.author.email if update.author else None,
        body=update.body,
        update_type=update.update_type,
    )


def serialize_history(history: TaskChangeHistory) -> TaskChangeHistoryRead:
    return TaskChangeHistoryRead(
        id=history.id,
        task_id=history.task_id,
        change_type=history.change_type,
        from_value=history.from_value,
        to_value=history.to_value,
        actor_id=history.actor_id,
        actor_email=history.actor.email if history.actor else None,
        note=history.note,
        created_at=history.created_at,
    )


def serialize_post(post: TaskPost) -> TaskPostRead:
    return TaskPostRead(
        id=post.id,
        task_id=post.task_id,
        category_id=post.category_id,
        category_label=post.category.label if post.category else None,
        scope=post.scope,
        title=post.title,
        body=post.body,
        url=post.url,
        attachment=post.attachment,
        author_id=post.author_id,
        author_email=post.author.email if post.author else None,
        posted_at=post.posted_at,
        created_at=post.created_at,
    )


@router.get("", response_model=list[TaskRead])
def list_tasks(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskRead]:
    tasks = db.scalars(
        select(Task)
        .options(selectinload(Task.creator), selectinload(Task.tag_links).selectinload(TaskTag.tag))
        .order_by(Task.created_at, Task.title)
    ).all()
    return [serialize_task(task) for task in tasks]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskRead:
    if payload.owner_id and db.get(User, payload.owner_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="owner_not_found")
    if payload.owner_roster_id and db.get(TeamRoster, payload.owner_roster_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="owner_roster_not_found")

    task = Task(**payload.model_dump(), creator_id=current_user.id)
    if payload.owner_roster_id:
        task.owner_roster = db.get(TeamRoster, payload.owner_roster_id)
    db.add(task)
    db.flush()
    create_task_assignment_notification(db, task=task, actor=current_user)
    db.commit()
    db.refresh(task)
    task.creator = current_user
    return serialize_task(task)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskRead:
    task = require_task_manager(db, task_id, current_user)

    updates = payload.model_dump(exclude_unset=True)
    if "progress" in updates and updates["progress"] is not None and not 0 <= updates["progress"] <= 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_progress")
    for key, value in updates.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.put("/{task_id}/tags", response_model=TaskRead)
def replace_task_tags(
    task_id: UUID,
    payload: TaskTagsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskRead:
    task = require_task_manager(db, task_id, current_user)
    clean_names = []
    for tag in payload.tags:
        clean = tag.strip()
        if clean and clean not in clean_names:
            clean_names.append(clean)

    existing_tags = {
        tag.name: tag
        for tag in db.scalars(select(Tag).where(Tag.name.in_(clean_names))).all()
    } if clean_names else {}
    for name in clean_names:
        if name not in existing_tags:
            tag = Tag(name=name, created_by=current_user.id)
            db.add(tag)
            db.flush()
            existing_tags[name] = tag

    db.query(TaskTag).filter(TaskTag.task_id == task_id).delete()
    for name in clean_names:
        db.add(TaskTag(task_id=task_id, tag_id=existing_tags[name].id, created_by=current_user.id))
    db.commit()
    task = get_task_or_404(db, task_id)
    return serialize_task(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    task = require_task_manager(db, task_id, current_user)
    db.delete(task)
    db.commit()
    return None


@router.delete("/{task_id}/recurring/future", status_code=status.HTTP_204_NO_CONTENT)
def delete_future_recurring_instances(
    task_id: UUID,
    after_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_task_manager(db, task_id, current_user)
    instances = db.scalars(
        select(Task).where(
            Task.recurring_template_id == task_id,
            Task.start_date > after_date,
            Task.progress == 0,
            Task.archived_at.is_(None),
        )
    ).all()
    for instance in instances:
        db.delete(instance)
    db.commit()
    return None


@router.patch("/{task_id}/status", response_model=TaskRead)
def update_task_status(
    task_id: UUID,
    payload: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskRead:
    task = require_task_manager(db, task_id, current_user)
    previous_status = task.status.value
    task.status = payload.status
    db.add(
        TaskChangeHistory(
            task_id=task.id,
            change_type=ChangeType.status,
            from_value=previous_status,
            to_value=payload.status.value,
            actor_id=current_user.id,
            note=payload.note,
        )
    )
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.get("/{task_id}/history", response_model=list[TaskChangeHistoryRead])
def list_task_history(
    task_id: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskChangeHistoryRead]:
    get_task_or_404(db, task_id)
    history = db.scalars(
        select(TaskChangeHistory)
        .where(TaskChangeHistory.task_id == task_id)
        .options(selectinload(TaskChangeHistory.actor))
        .order_by(TaskChangeHistory.created_at.desc())
    ).all()
    return [serialize_history(item) for item in history]


@router.patch("/{task_id}/history/{history_id}", response_model=TaskChangeHistoryRead)
def update_task_history_note(
    task_id: UUID,
    history_id: UUID,
    payload: TaskHistoryNoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskChangeHistoryRead:
    require_task_manager(db, task_id, current_user)
    history = db.scalar(
        select(TaskChangeHistory)
        .where(TaskChangeHistory.id == history_id, TaskChangeHistory.task_id == task_id)
        .options(selectinload(TaskChangeHistory.actor))
    )
    if history is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_history_not_found")
    history.note = payload.note
    db.commit()
    db.refresh(history)
    return serialize_history(history)


@router.delete("/{task_id}/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_history(
    task_id: UUID,
    history_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_task_manager(db, task_id, current_user)
    history = db.get(TaskChangeHistory, history_id)
    if history is None or history.task_id != task_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_history_not_found")
    db.delete(history)
    db.commit()
    return None


@router.patch("/{task_id}/archive", response_model=TaskRead)
def update_task_archive(
    task_id: UUID,
    payload: TaskArchiveUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskRead:
    task = require_task_manager(db, task_id, current_user)
    previous_value = "archived" if task.archived_at else "active"
    task.archived_at = datetime.now(UTC) if payload.archived else None
    next_value = "archived" if task.archived_at else "active"
    db.add(
        TaskChangeHistory(
            task_id=task.id,
            change_type=ChangeType.archive,
            from_value=previous_value,
            to_value=next_value,
            actor_id=current_user.id,
        )
    )
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.get("/{task_id}/links", response_model=list[TaskLinkRead])
def list_task_links(
    task_id: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskLink]:
    get_task_or_404(db, task_id)
    return list(db.scalars(select(TaskLink).where(TaskLink.task_id == task_id).order_by(TaskLink.created_at.desc())))


@router.post("/{task_id}/links", response_model=TaskLinkRead, status_code=status.HTTP_201_CREATED)
def create_task_link(
    task_id: UUID,
    payload: TaskLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskLink:
    require_task_manager(db, task_id, current_user)
    link = TaskLink(task_id=task_id, title=payload.title, url=payload.url, link_type=payload.link_type)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/{task_id}/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_link(
    task_id: UUID,
    link_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_task_manager(db, task_id, current_user)
    link = db.get(TaskLink, link_id)
    if link is None or link.task_id != task_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_link_not_found")
    db.delete(link)
    db.commit()
    return None


@router.get("/{task_id}/subtasks", response_model=list[SubtaskRead])
def list_subtasks(
    task_id: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Subtask]:
    get_task_or_404(db, task_id)
    return list(db.scalars(select(Subtask).where(Subtask.task_id == task_id).order_by(Subtask.sort_order, Subtask.created_at)))


@router.post("/{task_id}/subtasks", response_model=SubtaskRead, status_code=status.HTTP_201_CREATED)
def create_subtask(
    task_id: UUID,
    payload: SubtaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Subtask:
    require_task_manager(db, task_id, current_user)
    subtask = Subtask(task_id=task_id, title=payload.title, sort_order=payload.sort_order)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskRead)
def update_subtask(
    task_id: UUID,
    subtask_id: UUID,
    payload: SubtaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Subtask:
    require_task_manager(db, task_id, current_user)
    subtask = db.get(Subtask, subtask_id)
    if subtask is None or subtask.task_id != task_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="subtask_not_found")

    updates = payload.model_dump(exclude_unset=True)
    if "done" in updates:
        subtask.done_at = datetime.now(UTC) if updates["done"] else None
        subtask.done_by = current_user.id if updates["done"] else None
    for key, value in updates.items():
        setattr(subtask, key, value)

    db.commit()
    db.refresh(subtask)
    return subtask


@router.get("/{task_id}/updates", response_model=list[TaskUpdateLogRead])
def list_task_updates(
    task_id: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskUpdateLogRead]:
    get_task_or_404(db, task_id)
    updates = db.scalars(
        select(TaskUpdateLog)
        .where(TaskUpdateLog.task_id == task_id)
        .options(selectinload(TaskUpdateLog.author))
        .order_by(TaskUpdateLog.created_at.desc())
    ).all()
    return [serialize_update(update) for update in updates]


@router.post("/{task_id}/updates", response_model=TaskUpdateLogRead, status_code=status.HTTP_201_CREATED)
def create_task_update(
    task_id: UUID,
    payload: TaskUpdateLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskUpdateLogRead:
    task = get_task_or_404(db, task_id)
    update = TaskUpdateLog(
        task_id=task_id,
        author_id=current_user.id,
        body=payload.body,
        update_type=payload.update_type,
    )
    db.add(update)
    db.flush()
    create_task_update_notification(db, task=task, update=update, actor=current_user)
    db.commit()
    db.refresh(update)
    update.author = current_user
    return serialize_update(update)


@router.patch("/{task_id}/updates/{update_id}", response_model=TaskUpdateLogRead)
def update_task_update(
    task_id: UUID,
    update_id: UUID,
    payload: TaskUpdateLogUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskUpdateLogRead:
    task = get_task_or_404(db, task_id)
    update = db.scalar(
        select(TaskUpdateLog)
        .where(TaskUpdateLog.id == update_id, TaskUpdateLog.task_id == task_id)
        .options(selectinload(TaskUpdateLog.author))
    )
    if update is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_update_not_found")
    if update.author_id != current_user.id and not can_manage_task(current_user, task):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="task_update_manage_forbidden")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(update, key, value)
    db.commit()
    db.refresh(update)
    update.author = current_user if update.author_id == current_user.id else update.author
    return serialize_update(update)


@router.delete("/{task_id}/updates/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_update(
    task_id: UUID,
    update_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    task = get_task_or_404(db, task_id)
    update = db.get(TaskUpdateLog, update_id)
    if update is None or update.task_id != task_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_update_not_found")
    if update.author_id != current_user.id and not can_manage_task(current_user, task):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="task_update_manage_forbidden")
    db.delete(update)
    db.commit()
    return None


@router.get("/{task_id}/posts", response_model=list[TaskPostRead])
def list_task_posts(
    task_id: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskPostRead]:
    get_task_or_404(db, task_id)
    posts = db.scalars(
        select(TaskPost)
        .where(TaskPost.task_id == task_id)
        .options(selectinload(TaskPost.author), selectinload(TaskPost.category))
        .order_by(TaskPost.created_at.desc())
    ).all()
    return [serialize_post(post) for post in posts]


@router.post("/{task_id}/posts", response_model=TaskPostRead, status_code=status.HTTP_201_CREATED)
def create_task_post(
    task_id: UUID,
    payload: TaskPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskPostRead:
    task = get_task_or_404(db, task_id)
    if payload.category_id and db.get(TaskPostCategory, payload.category_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post_category_not_found")

    post = TaskPost(
        task_id=task_id,
        category_id=payload.category_id,
        scope=payload.scope,
        title=payload.title,
        body=payload.body,
        url=payload.url,
        attachment=payload.attachment,
        author_id=current_user.id,
    )
    if payload.posted_at:
        post.posted_at = payload.posted_at
    db.add(post)
    db.flush()
    if post.category_id:
        post.category = db.get(TaskPostCategory, post.category_id)
    create_task_post_notification(db, task=task, post=post, actor=current_user)
    db.commit()
    db.refresh(post)
    post.author = current_user
    if post.category_id:
        post.category = db.get(TaskPostCategory, post.category_id)
    return serialize_post(post)


@router.patch("/{task_id}/posts/{post_id}", response_model=TaskPostRead)
def update_task_post(
    task_id: UUID,
    post_id: UUID,
    payload: TaskPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskPostRead:
    task = get_task_or_404(db, task_id)
    post = db.scalar(
        select(TaskPost)
        .where(TaskPost.id == post_id, TaskPost.task_id == task_id)
        .options(selectinload(TaskPost.author), selectinload(TaskPost.category))
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_post_not_found")
    if post.author_id != current_user.id and not can_manage_task(current_user, task):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="task_post_manage_forbidden")

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("category_id") and db.get(TaskPostCategory, updates["category_id"]) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post_category_not_found")
    for key, value in updates.items():
        setattr(post, key, value)
    db.commit()
    db.refresh(post)
    post.author = current_user if post.author_id == current_user.id else post.author
    if post.category_id:
        post.category = db.get(TaskPostCategory, post.category_id)
    return serialize_post(post)


@router.delete("/{task_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_post(
    task_id: UUID,
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    task = get_task_or_404(db, task_id)
    post = db.get(TaskPost, post_id)
    if post is None or post.task_id != task_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_post_not_found")
    if post.author_id != current_user.id and not can_manage_task(current_user, task):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="task_post_manage_forbidden")
    db.delete(post)
    db.commit()
    return None
