from tests.helpers import build_test_client, login_admin, seed_admin
from tests.test_task_lifecycle import create_task


def test_task_tags_are_persisted_with_task_detail() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)

    response = client.put(
        f"/api/v1/tasks/{task_id}/tags",
        headers={"Authorization": f"Bearer {token}"},
        json={"tags": ["운영", "백엔드"]},
    )

    assert response.status_code == 200
    tasks_response = client.get("/api/v1/tasks", headers={"Authorization": f"Bearer {token}"})
    task = next(item for item in tasks_response.json() if item["id"] == task_id)
    assert task["tags"] == ["운영", "백엔드"]


def test_user_preferences_and_dashboard_memos_round_trip() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)

    preferences_response = client.put(
        "/api/v1/preferences/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "active_page": "team",
            "active_view": "calendar",
            "selected_tag": "전체",
            "timeline_mode": "month",
            "timeline_month": "2026-06",
            "timeline_year": "2026",
        },
    )
    memo_response = client.put(
        "/api/v1/dashboard-memos/team",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "회사 운영 검증 메모"},
    )

    assert preferences_response.status_code == 200
    assert memo_response.status_code == 200
    read_preferences = client.get("/api/v1/preferences/me", headers={"Authorization": f"Bearer {token}"})
    read_memos = client.get("/api/v1/dashboard-memos", headers={"Authorization": f"Bearer {token}"})
    assert read_preferences.json()["active_view"] == "calendar"
    assert read_memos.json()["team"] == "회사 운영 검증 메모"
