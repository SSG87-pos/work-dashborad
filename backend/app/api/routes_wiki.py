import hashlib
import re
from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.core.security import get_current_user, require_admin
from app.models.task import Task, TaskPost, TaskUpdateLog
from app.models.user import User
from app.models.wiki import AiWikiDraft, WikiErrorBookEntry, WikiLink, WikiPage, WikiRevision, WikiSourceLink
from app.schemas.wiki import (
    WikiDraftApprove,
    WikiDraftCreate,
    WikiDraftFromDashboardCreate,
    WikiDraftRead,
    WikiErrorBookCreate,
    WikiErrorBookRead,
    WikiLinkInput,
    WikiLinkRead,
    WikiPageRead,
    WikiPageSummary,
    WikiSearchResponse,
    WikiSourceLinkInput,
    WikiSourceLinkRead,
)

router = APIRouter(prefix="/ai/wiki", tags=["ai-wiki"])


def now_utc() -> datetime:
    return datetime.now(UTC)


def is_admin(user: User) -> bool:
    return user.permission_role.value == "admin"


def can_read_page(page: WikiPage, user: User) -> bool:
    if is_admin(user):
        return True
    if page.visibility == "private" and page.owner_user_id not in {None, user.id}:
        return False
    if page.status == "published":
        return page.visibility in {"team", "workspace"} or page.owner_user_id == user.id
    return page.owner_user_id == user.id or page.created_by == user.id


def require_page_read(page: WikiPage | None, user: User) -> WikiPage:
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="wiki_page_not_found")
    if not can_read_page(page, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="wiki_page_forbidden")
    return page


def normalize_slug(title: str) -> str:
    slug = re.sub(r"\s+", "-", title.strip().lower())
    slug = re.sub(r"[^0-9a-zA-Z가-힣._-]+", "", slug).strip("-")
    return slug or f"wiki-{now_utc().strftime('%Y%m%d%H%M%S')}"


def short_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def source_hash(source_type: str, title: str, excerpt: str) -> str:
    return short_hash(f"{source_type}|{title}|{excerpt}")


def make_unique_slug(db: Session, base_slug: str, page_id: UUID | None = None) -> str:
    slug = base_slug
    index = 2
    while True:
        existing = db.scalar(select(WikiPage).where(WikiPage.workspace_id == "research-strategy", WikiPage.slug == slug))
        if existing is None or existing.id == page_id:
            return slug
        slug = f"{base_slug}-{index}"
        index += 1


def visible_pages(db: Session, user: User) -> list[WikiPage]:
    pages = db.scalars(
        select(WikiPage)
        .options(selectinload(WikiPage.source_links), selectinload(WikiPage.outgoing_links), selectinload(WikiPage.revisions))
        .order_by(WikiPage.updated_at.desc(), WikiPage.title)
    ).all()
    return [page for page in pages if can_read_page(page, user)]


def latest_revision_number(page: WikiPage) -> int:
    if not page.revisions:
        return 0
    return max(revision.revision_number for revision in page.revisions)


def source_updated_at(db: Session, source_type: str, source_id: UUID) -> datetime | None:
    if source_type == "task":
        source = db.get(Task, source_id)
        return source.updated_at if source else None
    if source_type == "task_update":
        source = db.get(TaskUpdateLog, source_id)
        return source.updated_at or source.created_at if source else None
    if source_type == "task_post":
        source = db.get(TaskPost, source_id)
        return source.updated_at or source.created_at if source else None
    return None


def serialize_source_link(db: Session, link: WikiSourceLink) -> WikiSourceLinkRead:
    updated_at = source_updated_at(db, link.source_type, link.source_id)
    stale = bool(updated_at and link.created_at and updated_at > link.created_at)
    return WikiSourceLinkRead(
        id=link.id,
        page_id=link.page_id,
        source_type=link.source_type,
        source_id=link.source_id,
        source_title=link.source_title,
        source_date=link.source_date,
        excerpt=link.excerpt,
        content_hash=link.content_hash,
        created_at=link.created_at,
        stale=stale,
    )


def serialize_link(db: Session, link: WikiLink) -> WikiLinkRead:
    target = db.get(WikiPage, link.to_page_id)
    return WikiLinkRead(
        id=link.id,
        from_page_id=link.from_page_id,
        to_page_id=link.to_page_id,
        to_page_title=target.title if target else "삭제된 Wiki",
        relation_type=link.relation_type,
        created_at=link.created_at,
    )


def serialize_page_summary(page: WikiPage) -> WikiPageSummary:
    return WikiPageSummary(
        id=page.id,
        slug=page.slug,
        title=page.title,
        page_type=page.page_type,
        summary=page.summary,
        status=page.status,
        visibility=page.visibility,
        updated_at=page.updated_at,
        source_count=len(page.source_links),
        link_count=len(page.outgoing_links),
    )


def serialize_page(db: Session, page: WikiPage) -> WikiPageRead:
    summary = serialize_page_summary(page)
    return WikiPageRead(
        **summary.model_dump(),
        body_markdown=page.body_markdown,
        latest_revision_number=latest_revision_number(page),
        sources=[serialize_source_link(db, link) for link in sorted(page.source_links, key=lambda item: item.created_at, reverse=True)],
        links=[serialize_link(db, link) for link in sorted(page.outgoing_links, key=lambda item: item.created_at, reverse=True)],
    )


def source_link_dump(link: WikiSourceLinkInput) -> dict:
    data = link.model_dump(mode="json")
    if not data.get("content_hash"):
        data["content_hash"] = source_hash(link.source_type, link.source_title, link.excerpt)
    return data


def link_dump(link: WikiLinkInput) -> dict:
    return link.model_dump(mode="json")


def next_revision_number(db: Session, page_id: UUID) -> int:
    current = db.scalar(select(func.max(WikiRevision.revision_number)).where(WikiRevision.page_id == page_id))
    return int(current or 0) + 1


def task_source_link(task: Task) -> WikiSourceLinkInput:
    return WikiSourceLinkInput(
        source_type="task",
        source_id=task.id,
        source_title=task.title,
        source_date=task.due_date,
        excerpt=task.description or task.title,
        content_hash=source_hash("task", task.title, task.description or task.title),
    )


def update_source_link(update: TaskUpdateLog, task_title: str) -> WikiSourceLinkInput:
    return WikiSourceLinkInput(
        source_type="task_update",
        source_id=update.id,
        source_title=task_title,
        source_date=update.created_at.date() if update.created_at else None,
        excerpt=update.body,
        content_hash=source_hash("task_update", task_title, update.body),
    )


def post_source_link(post: TaskPost, task_title: str) -> WikiSourceLinkInput:
    attachment = post_attachment_evidence(post)
    excerpt = "\n\n".join(
        part
        for part in [
            post.body,
            f"[이미지 요약] {attachment['summary']}" if attachment["summary"] else "",
            f"[이미지 판독] {attachment['text']}" if attachment["text"] else "",
        ]
        if part
    )
    return WikiSourceLinkInput(
        source_type="task_post",
        source_id=post.id,
        source_title=post.title or task_title,
        source_date=post.posted_at,
        excerpt=excerpt or post.body,
        content_hash=source_hash("task_post", post.title or task_title, excerpt or post.body),
    )


def clean_attachment_value(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text or None


def post_attachment_evidence(post: TaskPost) -> dict[str, str | None]:
    attachment = post.attachment if isinstance(post.attachment, dict) else {}
    return {
        "summary": clean_attachment_value(attachment.get("visionSummary")) or clean_attachment_value(attachment.get("summary")),
        "text": (
            clean_attachment_value(attachment.get("ocrText"))
            or clean_attachment_value(attachment.get("extractedText"))
            or clean_attachment_value(attachment.get("text"))
        ),
    }


def post_wiki_line(post: TaskPost) -> str:
    attachment = post_attachment_evidence(post)
    parts = [post.body]
    if attachment["summary"]:
        parts.append(f"[이미지 요약] {attachment['summary']}")
    if attachment["text"]:
        parts.append(f"[이미지 판독] {attachment['text']}")
    return f"- {post.posted_at}: [{post.scope}] {post.title} - {' / '.join(part for part in parts if part)}"


@router.get("/search", response_model=WikiSearchResponse)
def search_wiki(
    query: str = Query(""),
    page_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WikiSearchResponse:
    needle = query.strip().lower()
    items = []
    for page in visible_pages(db, current_user):
        if page_type and page.page_type != page_type:
            continue
        haystack = " ".join([page.slug, page.title, page.summary, page.body_markdown]).lower()
        if needle and needle not in haystack:
            continue
        items.append(serialize_page_summary(page))
    return WikiSearchResponse(generated_at=now_utc(), query=query, items=items)


@router.get("/pages/{page_id}", response_model=WikiPageRead)
def read_wiki_page(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WikiPageRead:
    page = db.scalar(
        select(WikiPage)
        .where(WikiPage.id == page_id)
        .options(selectinload(WikiPage.source_links), selectinload(WikiPage.outgoing_links), selectinload(WikiPage.revisions))
    )
    return serialize_page(db, require_page_read(page, current_user))


@router.get("/pages/{page_id}/links", response_model=list[WikiLinkRead])
def read_wiki_page_links(
    page_id: UUID,
    relation_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WikiLinkRead]:
    page = require_page_read(db.get(WikiPage, page_id), current_user)
    links = db.scalars(select(WikiLink).where(or_(WikiLink.from_page_id == page.id, WikiLink.to_page_id == page.id))).all()
    result = []
    for link in links:
        if relation_type and link.relation_type != relation_type:
            continue
        target_id = link.to_page_id if link.from_page_id == page.id else link.from_page_id
        target = db.get(WikiPage, target_id)
        if not target or not can_read_page(target, current_user):
            continue
        normalized = WikiLink(
            id=link.id,
            from_page_id=page.id,
            to_page_id=target_id,
            relation_type=link.relation_type,
            created_by=link.created_by,
            created_at=link.created_at,
        )
        result.append(serialize_link(db, normalized))
    return result


@router.get("/pages/{page_id}/sources", response_model=list[WikiSourceLinkRead])
def read_wiki_page_sources(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WikiSourceLinkRead]:
    page = db.scalar(select(WikiPage).where(WikiPage.id == page_id).options(selectinload(WikiPage.source_links)))
    page = require_page_read(page, current_user)
    return [serialize_source_link(db, link) for link in sorted(page.source_links, key=lambda item: item.created_at, reverse=True)]


@router.post("/drafts", response_model=WikiDraftRead, status_code=status.HTTP_201_CREATED)
def create_wiki_draft(
    payload: WikiDraftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiWikiDraft:
    if payload.target_page_id:
        require_page_read(db.get(WikiPage, payload.target_page_id), current_user)
    draft = AiWikiDraft(
        draft_type=payload.draft_type,
        target_page_id=payload.target_page_id,
        proposed_title=payload.proposed_title,
        proposed_slug=payload.proposed_slug,
        proposed_page_type=payload.proposed_page_type,
        proposed_summary=payload.proposed_summary,
        proposed_body_markdown=payload.proposed_body_markdown,
        proposed_links=[link_dump(link) for link in payload.proposed_links],
        proposed_source_links=[source_link_dump(link) for link in payload.proposed_source_links],
        source_evidence_json=payload.source_evidence_json,
        created_by_ai_model=payload.created_by_ai_model,
        requested_by_user_id=current_user.id,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/drafts/from-dashboard", response_model=WikiDraftRead, status_code=status.HTTP_201_CREATED)
def create_wiki_draft_from_dashboard(
    payload: WikiDraftFromDashboardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiWikiDraft:
    if payload.source_type != "task":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unsupported_source_type")
    task = db.scalar(
        select(Task)
        .where(Task.id == payload.source_id)
        .options(selectinload(Task.updates), selectinload(Task.posts), selectinload(Task.owner), selectinload(Task.owner_roster))
    )
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="source_task_not_found")

    owner_name = task.owner_roster.name if task.owner_roster else task.owner.name if task.owner else "미지정"
    proposed_title = payload.proposed_title or task.workstream or task.title
    updates = sorted(task.updates, key=lambda update: update.created_at or datetime.min, reverse=True)
    posts = sorted(task.posts, key=lambda post: post.posted_at, reverse=True)
    update_lines = "\n".join(f"- {update.created_at.date() if update.created_at else ''}: {update.body}" for update in updates[:5])
    post_lines = "\n".join(post_wiki_line(post) for post in posts[:5])
    body = "\n\n".join(
        part
        for part in [
            f"# {proposed_title}",
            f"## 현재 업무\n- 업무: {task.title}\n- 담당: {owner_name}\n- 상태: {task.status.value}\n- 진행률: {task.progress}%",
            f"## 설명\n{task.description or '기록된 설명 없음'}",
            f"## 최근 업데이트\n{update_lines or '- 최근 업데이트 없음'}",
            f"## 업무 노트\n{post_lines or '- 업무 노트 없음'}",
        ]
        if part
    )
    source_links = [task_source_link(task), *[update_source_link(update, task.title) for update in updates[:5]], *[post_source_link(post, task.title) for post in posts[:5]]]
    draft = AiWikiDraft(
        draft_type="create_page",
        proposed_title=proposed_title,
        proposed_slug=normalize_slug(proposed_title),
        proposed_page_type=payload.proposed_page_type,
        proposed_summary=f"{task.title} 기준으로 생성된 Wiki 초안입니다.",
        proposed_body_markdown=body,
        proposed_source_links=[source_link_dump(link) for link in source_links],
        source_evidence_json={
            "source_type": "task",
            "source_id": str(task.id),
            "task_title": task.title,
            "workstream": task.workstream,
            "owner_name": owner_name,
            "status": task.status.value,
        },
        created_by_ai_model=payload.created_by_ai_model,
        requested_by_user_id=current_user.id,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/drafts/{draft_id}/approve", response_model=WikiPageRead)
def approve_wiki_draft(
    draft_id: UUID,
    payload: WikiDraftApprove,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> WikiPageRead:
    draft = db.get(AiWikiDraft, draft_id)
    if draft is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="wiki_draft_not_found")
    if draft.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="wiki_draft_not_pending")

    page = db.get(WikiPage, draft.target_page_id) if draft.target_page_id else None
    if page is None:
        page = WikiPage(
            title=draft.proposed_title,
            slug=make_unique_slug(db, draft.proposed_slug or normalize_slug(draft.proposed_title)),
            page_type=draft.proposed_page_type,
            owner_user_id=draft.requested_by_user_id,
            created_by=draft.requested_by_user_id,
        )
        db.add(page)
        db.flush()
    else:
        page.slug = make_unique_slug(db, draft.proposed_slug or page.slug or normalize_slug(draft.proposed_title), page.id)
        page.title = draft.proposed_title
        page.page_type = draft.proposed_page_type

    page.summary = draft.proposed_summary
    page.body_markdown = draft.proposed_body_markdown
    page.status = payload.status
    page.visibility = payload.visibility
    page.updated_by = admin.id

    revision = WikiRevision(
        page_id=page.id,
        revision_number=next_revision_number(db, page.id),
        summary=page.summary,
        body_markdown=page.body_markdown,
        change_reason=payload.change_reason,
        created_by=admin.id,
    )
    db.add(revision)

    for source in draft.proposed_source_links:
        db.add(
            WikiSourceLink(
                page_id=page.id,
                source_type=source["source_type"],
                source_id=UUID(source["source_id"]),
                source_title=source.get("source_title") or "",
                source_date=date.fromisoformat(source["source_date"]) if source.get("source_date") else None,
                excerpt=source.get("excerpt") or "",
                content_hash=source.get("content_hash"),
            )
        )
    for link in draft.proposed_links:
        db.add(
            WikiLink(
                from_page_id=page.id,
                to_page_id=UUID(link["to_page_id"]),
                relation_type=link.get("relation_type") or "related_to",
                created_by=admin.id,
            )
        )

    draft.status = "approved"
    draft.target_page_id = page.id
    draft.reviewed_by_user_id = admin.id
    draft.reviewed_at = now_utc()
    db.commit()
    db.refresh(page)
    page = db.scalar(
        select(WikiPage)
        .where(WikiPage.id == page.id)
        .options(selectinload(WikiPage.source_links), selectinload(WikiPage.outgoing_links), selectinload(WikiPage.revisions))
    )
    return serialize_page(db, page)


@router.post("/error-book", response_model=WikiErrorBookRead, status_code=status.HTTP_201_CREATED)
def record_wiki_error(
    payload: WikiErrorBookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WikiErrorBookEntry:
    if payload.target_page_id:
        require_page_read(db.get(WikiPage, payload.target_page_id), current_user)
    entry = WikiErrorBookEntry(
        question=payload.question,
        wrong_or_incomplete_answer=payload.wrong_or_incomplete_answer,
        correction=payload.correction,
        missing_source_type=payload.missing_source_type,
        missing_source_id=payload.missing_source_id,
        target_page_id=payload.target_page_id,
        created_by_user_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
