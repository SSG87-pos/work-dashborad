from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import get_current_user, require_admin
from app.models.task import Tag, TagGroup
from app.models.user import User
from app.schemas.tag import TagCreate, TagGroupRead, TagGroupSave, TagRead, TagUpdate

router = APIRouter(prefix="/tags", tags=["tags"])
groups_router = APIRouter(prefix="/tag-groups", tags=["tag-groups"])


@router.get("", response_model=list[TagRead])
def list_tags(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Tag]:
    return list(db.scalars(select(Tag).order_by(Tag.name)))


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
def create_tag(
    payload: TagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Tag:
    tag = Tag(name=payload.name, tone=payload.tone, created_by=current_user.id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.patch("/{tag_id}", response_model=TagRead)
def update_tag(
    tag_id: UUID,
    payload: TagUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Tag:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tag_not_found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(tag, key, value)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tag_not_found")
    db.delete(tag)
    db.commit()
    return None


@groups_router.get("", response_model=list[TagGroupRead])
def list_tag_groups(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TagGroup]:
    return list(db.scalars(select(TagGroup).order_by(TagGroup.label)))


@groups_router.put("/{group_id:path}", response_model=TagGroupRead)
def save_tag_group(
    group_id: str,
    payload: TagGroupSave,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TagGroup:
    group = db.get(TagGroup, group_id)
    if group is None:
        group = TagGroup(id=group_id, created_by=admin.id)
        db.add(group)
    group.label = payload.label
    group.tags = payload.tags
    group.tone = payload.tone
    db.commit()
    db.refresh(group)
    return group


@groups_router.delete("/{group_id:path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag_group(
    group_id: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    group = db.get(TagGroup, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tag_group_not_found")
    db.delete(group)
    db.commit()
    return None
