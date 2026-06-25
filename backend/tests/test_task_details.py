from tests.helpers import build_test_client, login_admin, seed_admin


def create_task(client, token: str) -> str:
    roster_response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "팀원"},
    )
    task_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "상세 저장 검증",
            "owner_roster_id": roster_response.json()["id"],
            "start_date": "2026-06-25",
            "due_date": "2026-06-30",
        },
    )
    return task_response.json()["id"]


def test_task_manager_can_add_and_update_subtask() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)

    create_response = client.post(
        f"/api/v1/tasks/{task_id}/subtasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "PostgreSQL migration 적용", "sort_order": 1},
    )

    assert create_response.status_code == 201
    subtask_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/v1/tasks/{task_id}/subtasks/{subtask_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"done": True},
    )

    assert update_response.status_code == 200
    assert update_response.json()["done"] is True

    list_response = client.get(f"/api/v1/tasks/{task_id}/subtasks", headers={"Authorization": f"Bearer {token}"})

    assert list_response.status_code == 200
    assert list_response.json()[0]["title"] == "PostgreSQL migration 적용"
    assert list_response.json()[0]["done"] is True


def test_visible_user_can_add_task_update_log() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)

    create_response = client.post(
        f"/api/v1/tasks/{task_id}/updates",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "회사 Linux health/db 검증 완료", "update_type": "note"},
    )

    assert create_response.status_code == 201
    assert create_response.json()["author_email"] == "admin@example.com"

    list_response = client.get(f"/api/v1/tasks/{task_id}/updates", headers={"Authorization": f"Bearer {token}"})

    assert list_response.status_code == 200
    assert list_response.json()[0]["body"] == "회사 Linux health/db 검증 완료"


def test_task_update_log_author_can_update_and_delete_own_log() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)

    create_response = client.post(
        f"/api/v1/tasks/{task_id}/updates",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "초기 운영 로그", "update_type": "note"},
    )
    update_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/v1/tasks/{task_id}/updates/{update_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "수정된 운영 로그"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["body"] == "수정된 운영 로그"

    delete_response = client.delete(
        f"/api/v1/tasks/{task_id}/updates/{update_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert delete_response.status_code == 204

    list_response = client.get(f"/api/v1/tasks/{task_id}/updates", headers={"Authorization": f"Bearer {token}"})

    assert list_response.status_code == 200
    assert list_response.json() == []


def test_authenticated_user_can_create_and_list_tags() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)

    create_response = client.post(
        "/api/v1/tags",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "백엔드", "tone": "blue"},
    )

    assert create_response.status_code == 201
    assert create_response.json()["name"] == "백엔드"

    list_response = client.get("/api/v1/tags", headers={"Authorization": f"Bearer {token}"})

    assert list_response.status_code == 200
    assert list_response.json()[0]["name"] == "백엔드"

    tag_id = list_response.json()[0]["id"]
    update_response = client.patch(
        f"/api/v1/tags/{tag_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "서버", "tone": "green"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["name"] == "서버"

    delete_response = client.delete(
        f"/api/v1/tags/{tag_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert delete_response.status_code == 204


def test_admin_can_save_and_delete_tag_group() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)

    save_response = client.put(
        "/api/v1/tag-groups/preset%3Aoperations",
        headers={"Authorization": f"Bearer {token}"},
        json={"label": "운영/KPI", "tags": ["운영", "KPI"], "tone": "operations"},
    )

    assert save_response.status_code == 200
    assert save_response.json()["id"] == "preset:operations"

    list_response = client.get("/api/v1/tag-groups", headers={"Authorization": f"Bearer {token}"})

    assert list_response.status_code == 200
    assert list_response.json()[0]["tags"] == ["운영", "KPI"]

    delete_response = client.delete(
        "/api/v1/tag-groups/preset%3Aoperations",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert delete_response.status_code == 204
    final_list_response = client.get("/api/v1/tag-groups", headers={"Authorization": f"Bearer {token}"})

    assert final_list_response.status_code == 200
    assert final_list_response.json() == []
