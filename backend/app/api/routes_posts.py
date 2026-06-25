from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.core.security import get_current_user, require_admin
from app.models.task import Task, TaskPost, TaskPostCategory
from app.models.user import User
from app.schemas.task import TaskPostCategoryCreate, TaskPostCategoryRead, TaskPostCategoryUpdate, TaskPostRead, WorkstreamPostRollup

router = APIRouter(prefix="/post-categories", tags=["post-categories"])


@router.get("", response_model=list[TaskPostCategoryRead])
def list_post_categories(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskPostCategory]:
    return list(db.scalars(select(TaskPostCategory).order_by(TaskPostCategory.sort_order, TaskPostCategory.label)))


@router.post("", response_model=TaskPostCategoryRead, status_code=status.HTTP_201_CREATED)
def create_post_category(
    payload: TaskPostCategoryCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TaskPostCategory:
    category = TaskPostCategory(**payload.model_dump(), created_by=admin.id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=TaskPostCategoryRead)
def update_post_category(
    category_id: UUID,
    payload: TaskPostCategoryUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TaskPostCategory:
    category = db.get(TaskPostCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post_category_not_found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


rollup_router = APIRouter(prefix="/post-rollups", tags=["post-rollups"])


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


@rollup_router.get("/workstreams", response_model=list[WorkstreamPostRollup])
def list_workstream_post_rollups(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WorkstreamPostRollup]:
    posts = db.scalars(
        select(TaskPost)
        .join(Task, Task.id == TaskPost.task_id)
        .where(Task.workstream.is_not(None), Task.workstream != "")
        .options(selectinload(TaskPost.author), selectinload(TaskPost.category), selectinload(TaskPost.task))
        .order_by(Task.workstream, TaskPost.created_at.desc())
    ).all()
    rollups: dict[str, list[TaskPostRead]] = {}
    for post in posts:
        if not post.task or not post.task.workstream:
            continue
        rollups.setdefault(post.task.workstream, []).append(serialize_post(post))
    return [WorkstreamPostRollup(workstream=workstream, posts=items) for workstream, items in rollups.items()]
