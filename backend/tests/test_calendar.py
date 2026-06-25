from tests.helpers import build_test_client, login_admin, seed_admin


def test_authenticated_user_can_create_list_and_update_calendar_event() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)

    create_response = client.post(
        "/api/v1/calendar/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "회사 백엔드 운영 점검",
            "event_date": "2026-06-26",
            "scope": "team",
            "note": "FastAPI systemd 검증",
        },
    )

    assert create_response.status_code == 201
    event_id = create_response.json()["id"]

    list_response = client.get("/api/v1/calendar/events", headers={"Authorization": f"Bearer {token}"})

    assert list_response.status_code == 200
    assert list_response.json()[0]["title"] == "회사 백엔드 운영 점검"

    update_response = client.patch(
        f"/api/v1/calendar/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"note": "PostgreSQL migration 확인 완료"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["note"] == "PostgreSQL migration 확인 완료"

    delete_response = client.delete(
        f"/api/v1/calendar/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert delete_response.status_code == 204

    final_list_response = client.get("/api/v1/calendar/events", headers={"Authorization": f"Bearer {token}"})

    assert final_list_response.status_code == 200
    assert final_list_response.json() == []


def test_calendar_event_creation_requires_authentication() -> None:
    client, _ = build_test_client()

    response = client.post(
        "/api/v1/calendar/events",
        json={"title": "인증 없는 일정", "event_date": "2026-06-26"},
    )

    assert response.status_code == 401
