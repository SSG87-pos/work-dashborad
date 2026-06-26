from __future__ import annotations

import re
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.core.security import require_admin
from app.models.task import Task, TaskPost, TaskTag, TaskUpdateLog
from app.models.user import User
from app.schemas.task import WorkstreamSuggestionRead, WorkstreamSuggestionTask

router = APIRouter(prefix="/workstreams", tags=["workstreams"])

STOP_TERMS = {
    "관련",
    "대상",
    "업무",
    "관리",
    "추진",
    "진행",
    "검토",
    "정리",
    "점검",
    "보고",
    "보고서",
    "자료",
    "초안",
    "작성",
    "후속",
    "회의",
    "일정",
    "운영",
    "체계",
    "대응",
    "기획",
    "조사",
    "업데이트",
}


def normalize_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_key(value: object) -> str:
    return re.sub(r"[()[\]{}.,:;'\"`~!?·ㆍ/_\-\s]+", "", normalize_text(value)).lower()


def tokenize(value: object) -> list[str]:
    text = normalize_text(value).lower()
    terms = re.findall(r"[가-힣A-Za-z0-9]{2,}", text)
    return [term for term in terms if term not in STOP_TERMS and len(normalize_key(term)) >= 2]


def attachment_text(attachment: dict | None) -> str:
    if not isinstance(attachment, dict):
        return ""
    values = [
        attachment.get("label"),
        attachment.get("caption"),
        attachment.get("ocrText"),
        attachment.get("visionSummary"),
        attachment.get("summary"),
        attachment.get("text"),
    ]
    return " ".join(normalize_text(value) for value in values if value)


def task_terms(task: Task) -> Counter[str]:
    text_parts = [
        task.title,
        task.description,
        task.workstream,
        " ".join(link.tag.name for link in task.tag_links if link.tag),
        " ".join(update.body for update in sorted(task.updates, key=lambda item: item.created_at, reverse=True)[:5]),
        " ".join(
            " ".join([post.title, post.body, attachment_text(post.attachment)])
            for post in sorted(task.posts, key=lambda item: item.created_at, reverse=True)[:5]
        ),
    ]
    return Counter(tokenize(" ".join(text_parts)))


def label_similarity(left: str, right: str) -> float:
    left_key = normalize_key(left)
    right_key = normalize_key(right)
    if not left_key or not right_key:
        return 0.0
    if left_key == right_key:
        return 1.0
    if left_key in right_key or right_key in left_key:
        return 0.65
    left_terms = set(tokenize(left))
    right_terms = set(tokenize(right))
    if not left_terms or not right_terms:
        return 0.0
    return len(left_terms & right_terms) / len(left_terms | right_terms)


def group_task_terms(tasks: list[Task]) -> Counter[str]:
    terms: Counter[str] = Counter()
    for task in tasks:
        terms.update(task_terms(task))
    return terms


@router.get("/suggestions", response_model=list[WorkstreamSuggestionRead])
def suggest_similar_workstreams(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[WorkstreamSuggestionRead]:
    tasks = list(
        db.scalars(
            select(Task)
            .where(Task.archived_at.is_(None), Task.workstream.is_not(None), Task.workstream != "")
            .options(
                selectinload(Task.tag_links).selectinload(TaskTag.tag),
                selectinload(Task.updates).selectinload(TaskUpdateLog.author),
                selectinload(Task.posts).selectinload(TaskPost.category),
            )
        )
    )
    groups: dict[str, list[Task]] = {}
    for task in tasks:
        label = normalize_text(task.workstream)
        if label:
            groups.setdefault(label, []).append(task)

    group_items = [
        {"label": label, "tasks": items, "terms": group_task_terms(items)}
        for label, items in groups.items()
    ]
    suggestions: list[WorkstreamSuggestionRead] = []
    for index, group in enumerate(group_items):
        for other in group_items[index + 1:]:
            left_terms = set(group["terms"])
            right_terms = set(other["terms"])
            shared_terms = sorted(
                left_terms & right_terms,
                key=lambda term: (group["terms"][term] + other["terms"][term], len(term), term),
                reverse=True,
            )[:8]
            if not shared_terms:
                continue
            overlap_score = len(shared_terms) / max(6, min(len(left_terms), len(right_terms)))
            label_score = label_similarity(group["label"], other["label"])
            score = round(min(1.0, 0.72 * overlap_score + 0.28 * label_score), 3)
            if score < 0.24 and len(shared_terms) < 3:
                continue
            task_rows = []
            for task in [*group["tasks"][:2], *other["tasks"][:2]]:
                terms = task_terms(task)
                task_rows.append(
                    WorkstreamSuggestionTask(
                        id=task.id,
                        title=task.title,
                        workstream=normalize_text(task.workstream),
                        matched_terms=[term for term in shared_terms if term in terms][:5],
                    )
                )
            suggestions.append(
                WorkstreamSuggestionRead(
                    primary_label=group["label"],
                    candidate_label=other["label"],
                    score=score,
                    shared_terms=shared_terms,
                    task_count=len(group["tasks"]) + len(other["tasks"]),
                    reason="제목, 설명, 태그, 업데이트, 업무 노트에서 공통 근거가 발견됐습니다.",
                    tasks=task_rows,
                )
            )
    return sorted(suggestions, key=lambda item: (item.score, item.task_count), reverse=True)[:12]
