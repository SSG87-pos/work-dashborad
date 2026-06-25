from tests.helpers import build_test_client, login_admin, seed_admin


def test_user_can_create_list_and_complete_team_check_item() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)

    create_response = client.post(
        "/api/v1/briefing-items",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "scope": "team",
            "kind": "todo",
            "item_type": "todo",
            "title": "운영 검증 체크",
            "body": "health/db/auth/task/calendar 확인",
        },
    )

    assert create_response.status_code == 201
    item_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/v1/briefing-items/{item_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"done": True, "status": "done"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["done"] is True

    list_response = client.get("/api/v1/briefing-items?scope=team", headers={"Authorization": f"Bearer {token}"})

    assert list_response.status_code == 200
    assert list_response.json()[0]["title"] == "운영 검증 체크"
    assert list_response.json()[0]["status"] == "done"


def test_my_briefing_item_requires_owner() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)

    response = client.post(
        "/api/v1/briefing-items",
        headers={"Authorization": f"Bearer {token}"},
        json={"scope": "my", "kind": "inbox", "title": "개인 인박스"},
    )

    assert response.status_code == 422
