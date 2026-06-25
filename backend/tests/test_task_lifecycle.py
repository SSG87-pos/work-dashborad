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
            "title": "업무 lifecycle 검증",
            "owner_roster_id": roster_response.json()["id"],
            "start_date": "2026-06-25",
            "due_date": "2026-06-30",
        },
    )
    return task_response.json()["id"]


def test_status_update_records_change_history_and_archive() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)

    status_response = client.patch(
        f"/api/v1/tasks/{task_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "진행중", "note": "착수"},
    )

    assert status_response.status_code == 200
    history_response = client.get(f"/api/v1/tasks/{task_id}/history", headers={"Authorization": f"Bearer {token}"})
    assert history_response.status_code == 200
    assert history_response.json()[0]["change_type"] == "status"
    assert history_response.json()[0]["to_value"] == "진행중"

    archive_response = client.patch(
        f"/api/v1/tasks/{task_id}/archive",
        headers={"Authorization": f"Bearer {token}"},
        json={"archived": True},
    )

    assert archive_response.status_code == 200
    assert archive_response.json()["archived_at"] is not None


def test_task_manager_can_add_and_delete_related_link() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)

    create_response = client.post(
        f"/api/v1/tasks/{task_id}/links",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "운영 runbook", "url": "https://example.com/runbook", "link_type": "문서"},
    )

    assert create_response.status_code == 201
    link_id = create_response.json()["id"]
    list_response = client.get(f"/api/v1/tasks/{task_id}/links", headers={"Authorization": f"Bearer {token}"})
    assert list_response.json()[0]["title"] == "운영 runbook"

    delete_response = client.delete(
        f"/api/v1/tasks/{task_id}/links/{link_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert delete_response.status_code == 204


def test_task_post_category_and_task_post_flow() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)

    category_response = client.post(
        "/api/v1/post-categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"key": "decision", "label": "결정사항", "tone": "blue", "sort_order": 10},
    )
    assert category_response.status_code == 201

    post_response = client.post(
        f"/api/v1/tasks/{task_id}/posts",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "category_id": category_response.json()["id"],
            "scope": "team",
            "title": "운영 결정",
            "body": "회사 Linux에서는 FastAPI/PostgreSQL로 검증",
        },
    )

    assert post_response.status_code == 201
    assert post_response.json()["author_email"] == "admin@example.com"

    list_response = client.get(f"/api/v1/tasks/{task_id}/posts", headers={"Authorization": f"Bearer {token}"})
    assert list_response.status_code == 200
    assert list_response.json()[0]["title"] == "운영 결정"
