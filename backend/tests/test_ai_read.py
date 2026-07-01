from datetime import UTC, date, datetime
from uuid import UUID

from app.models.task import TaskUpdateLog
from tests.helpers import build_test_client, login_admin, seed_admin


def seed_ai_evidence_fixture(client, token: str, session_factory) -> tuple[str, str]:
    roster_response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "류강묵", "title": "수석"},
    )
    owner_roster_id = roster_response.json()["id"]

    task_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "AI 기반 혁신 아이디어 정리",
            "description": "AI 활용 가능성과 아이디어 후보를 정리합니다.",
            "owner_roster_id": owner_roster_id,
            "status": "진행중",
            "priority": "높음",
            "workstream": "혁신아이디어",
            "start_date": "2026-06-01",
            "due_date": "2026-06-07",
            "progress": 50,
        },
    )
    task_id = task_response.json()["id"]

    client.put(
        f"/api/v1/tasks/{task_id}/tags",
        headers={"Authorization": f"Bearer {token}"},
        json={"tags": ["AI활용", "전략과제"]},
    )
    done_subtask_response = client.post(
        f"/api/v1/tasks/{task_id}/subtasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "후보 목록 정리", "sort_order": 1},
    )
    client.patch(
        f"/api/v1/tasks/{task_id}/subtasks/{done_subtask_response.json()['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"done": True},
    )
    open_subtask_response = client.post(
        f"/api/v1/tasks/{task_id}/subtasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "우선순위 확정", "sort_order": 2},
    )
    client.patch(
        f"/api/v1/tasks/{task_id}/subtasks/{open_subtask_response.json()['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"done": False},
    )
    first_update_response = client.post(
        f"/api/v1/tasks/{task_id}/updates",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "아이디어 후보 1차 분류 완료", "update_type": "note"},
    )
    issue_update_response = client.post(
        f"/api/v1/tasks/{task_id}/updates",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "자료 수급 지연으로 확인 필요", "update_type": "issue"},
    )
    with session_factory() as db:
        first_update = db.get(TaskUpdateLog, UUID(first_update_response.json()["id"]))
        issue_update = db.get(TaskUpdateLog, UUID(issue_update_response.json()["id"]))
        first_update.created_at = datetime(2026, 6, 4, 9, 0, tzinfo=UTC)
        issue_update.created_at = datetime(2026, 6, 6, 9, 0, tzinfo=UTC)
        db.commit()

    category_response = client.post(
        "/api/v1/post-categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"key": "risk", "label": "리스크", "tone": "red"},
    )
    post_response = client.post(
        f"/api/v1/tasks/{task_id}/posts",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "category_id": category_response.json()["id"],
            "scope": "리스크",
            "title": "외부 자료 미확보",
            "body": "외부 자료 미확보로 일정 조정 필요",
            "attachment": {
                "label": "외부자료 캡처",
                "caption": "자료 요청 현황 이미지",
                "ocrText": "공급사 회신 지연. 대체 자료 확보 필요.",
                "visionSummary": "자료 확보 상태가 지연으로 표시된 캡처",
            },
            "posted_at": "2026-06-05",
        },
    )

    stale_task_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "월간 KPI 관리",
            "owner_roster_id": owner_roster_id,
            "status": "검토/대기",
            "priority": "보통",
            "workstream": "월간 KPI 관리",
            "start_date": "2026-05-01",
            "due_date": "2026-06-08",
            "progress": 20,
        },
    )
    stale_task_id = stale_task_response.json()["id"]
    client.put(
        f"/api/v1/tasks/{stale_task_id}/tags",
        headers={"Authorization": f"Bearer {token}"},
        json={"tags": ["KPI"]},
    )

    return task_id, "|".join([first_update_response.json()["id"], issue_update_response.json()["id"], post_response.json()["id"]])


def test_ai_read_report_evidence_returns_grounded_items_and_exclusions() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id, source_ids = seed_ai_evidence_fixture(client, token, session_factory)
    first_update_id, issue_update_id, post_id = source_ids.split("|")

    response = client.get(
        "/api/v1/ai/read/report-evidence?period_start=2026-06-01&period_end=2026-06-30&report_type=weekly",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["question_type"] == "report-evidence"
    assert payload["period"] == {"start": "2026-06-01", "end": "2026-06-30"}
    assert payload["excluded"] == {"personal_notes": True, "private_calendar_details": True}

    ai_item = next(item for item in payload["items"] if item["task_id"] == task_id)
    assert ai_item["task_title"] == "AI 기반 혁신 아이디어 정리"
    assert ai_item["owner_name"] == "류강묵"
    assert ai_item["status"] == "진행중"
    assert ai_item["priority"] == "높음"
    assert ai_item["workstream"] == "혁신아이디어"
    assert ai_item["tags"] == ["AI활용", "전략과제"]
    assert ai_item["due_date"] == "2026-06-07"
    assert ai_item["progress"] == 50
    assert "우선순위 확정" in ai_item["open_subtasks"]
    assert {update["id"] for update in ai_item["recent_updates"]} == {first_update_id, issue_update_id}
    assert ai_item["recent_posts"][0]["id"] == post_id
    assert ai_item["recent_posts"][0]["attachment_label"] == "외부자료 캡처"
    assert ai_item["recent_posts"][0]["attachment_text"] == "공급사 회신 지연. 대체 자료 확보 필요."
    assert ai_item["recent_posts"][0]["attachment_summary"] == "자료 확보 상태가 지연으로 표시된 캡처"
    assert any(signal["type"] == "explicit" and signal["label"] == "이슈" for signal in ai_item["signals"])

    stale_item = next(item for item in payload["items"] if item["task_title"] == "월간 KPI 관리")
    assert any(signal["type"] == "inferred" and signal["label"] == "최근 기록 부족" for signal in stale_item["signals"])


def test_ai_read_topic_person_workstream_and_recent_update_endpoints() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id, source_ids = seed_ai_evidence_fixture(client, token, session_factory)
    first_update_id, issue_update_id, _post_id = source_ids.split("|")

    topic_response = client.get(
        "/api/v1/ai/read/topic-search?query=아이디어&period_start=2026-06-01&period_end=2026-06-30",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert topic_response.status_code == 200
    assert [item["task_id"] for item in topic_response.json()["items"]] == [task_id]

    person_response = client.get(
        "/api/v1/ai/read/person-work-status?person=류강묵&period_start=2026-06-01&period_end=2026-06-30",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert person_response.status_code == 200
    assert person_response.json()["person"]["name"] == "류강묵"
    assert {item["task_title"] for item in person_response.json()["items"]} == {"AI 기반 혁신 아이디어 정리", "월간 KPI 관리"}

    workstream_response = client.get(
        "/api/v1/ai/read/workstream-issues?workstream=혁신아이디어&period_start=2026-06-01&period_end=2026-06-30",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert workstream_response.status_code == 200
    assert [item["task_id"] for item in workstream_response.json()["items"]] == [task_id]

    recent_response = client.get(
        "/api/v1/ai/read/recent-updates?owner=류강묵&period_start=2026-06-01&period_end=2026-06-30",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert recent_response.status_code == 200
    assert [item["update_id"] for item in recent_response.json()["items"]] == [issue_update_id, first_update_id]


def test_ai_read_requires_authentication() -> None:
    client, _session_factory = build_test_client()

    response = client.get("/api/v1/ai/read/report-evidence")

    assert response.status_code == 401
