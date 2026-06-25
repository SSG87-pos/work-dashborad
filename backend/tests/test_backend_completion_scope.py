from tests.test_task_lifecycle import create_task
from tests.helpers import build_test_client, login_admin, seed_admin


def test_task_delete_post_edit_delete_and_history_note_flow() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)

    status_response = client.patch(
        f"/api/v1/tasks/{task_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "진행중", "note": "처음 메모"},
    )
    assert status_response.status_code == 200
    history_id = client.get(f"/api/v1/tasks/{task_id}/history", headers={"Authorization": f"Bearer {token}"}).json()[0]["id"]

    history_update = client.patch(
        f"/api/v1/tasks/{task_id}/history/{history_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"note": "수정된 메모"},
    )
    assert history_update.status_code == 200
    assert history_update.json()["note"] == "수정된 메모"

    category = client.post(
        "/api/v1/post-categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"key": "risk", "label": "리스크", "tone": "red"},
    ).json()
    category_update = client.patch(
        f"/api/v1/post-categories/{category['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"label": "이슈", "tone": "orange"},
    )
    assert category_update.status_code == 200
    assert category_update.json()["label"] == "이슈"
    post = client.post(
        f"/api/v1/tasks/{task_id}/posts",
        headers={"Authorization": f"Bearer {token}"},
        json={"category_id": category["id"], "scope": "team", "title": "초안", "body": "초안 내용"},
    ).json()

    post_update = client.patch(
        f"/api/v1/tasks/{task_id}/posts/{post['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "수정본", "body": "수정 내용"},
    )
    assert post_update.status_code == 200
    assert post_update.json()["title"] == "수정본"

    assert client.delete(
        f"/api/v1/tasks/{task_id}/posts/{post['id']}",
        headers={"Authorization": f"Bearer {token}"},
    ).status_code == 204
    category_deactivate = client.patch(
        f"/api/v1/post-categories/{category['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"active": False},
    )
    assert category_deactivate.status_code == 200
    assert category_deactivate.json()["active"] is False
    assert client.delete(
        f"/api/v1/tasks/{task_id}/history/{history_id}",
        headers={"Authorization": f"Bearer {token}"},
    ).status_code == 204
    assert client.delete(f"/api/v1/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"}).status_code == 204


def test_workstream_post_rollup_lists_posts_by_workstream() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = create_task(client, token)
    client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"workstream": "회사 백엔드"},
    )
    category = client.post(
        "/api/v1/post-categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"key": "decision", "label": "결정사항", "tone": "blue"},
    ).json()
    client.post(
        f"/api/v1/tasks/{task_id}/posts",
        headers={"Authorization": f"Bearer {token}"},
        json={"category_id": category["id"], "scope": "team", "title": "운영 결정", "body": "FastAPI로 간다"},
    )

    response = client.get("/api/v1/post-rollups/workstreams", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()[0]["workstream"] == "회사 백엔드"
    assert response.json()[0]["posts"][0]["title"] == "운영 결정"


def test_canvas_state_can_be_saved_and_read_back() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    state = {
        "active_tab_id": "ideas",
        "tabs": [{"id": "ideas", "label": "아이디어", "title": "생각 정리", "description": "운영 준비"}],
        "nodes_by_tab": {
            "ideas": [
                {
                    "id": "node-1",
                    "title": "백엔드",
                    "body": "FastAPI",
                    "template": "memo",
                    "parent_id": None,
                    "todo_items": [{"id": "todo-1", "text": "검증", "done": False}],
                    "x": 120,
                    "y": 160,
                }
            ]
        },
        "links_by_tab": {"ideas": []},
    }

    save_response = client.put(
        "/api/v1/canvas/state",
        headers={"Authorization": f"Bearer {token}"},
        json=state,
    )
    assert save_response.status_code == 200

    read_response = client.get("/api/v1/canvas/state", headers={"Authorization": f"Bearer {token}"})
    assert read_response.status_code == 200
    assert read_response.json()["tabs"][0]["title"] == "생각 정리"
    assert read_response.json()["nodes_by_tab"]["ideas"][0]["todo_items"][0]["text"] == "검증"
