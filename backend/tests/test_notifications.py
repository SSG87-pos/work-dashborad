from app.models.user import PermissionRole, User
from app.services.seed import hash_password
from tests.helpers import build_test_client, login_admin, seed_admin


def create_member(session_factory, email: str, name: str = "팀원") -> None:
    with session_factory() as db:
        db.add(
            User(
                email=email,
                password_hash=hash_password("temporary-member-password"),
                name=name,
                title="연구원",
                permission_role=PermissionRole.member,
            )
        )
        db.commit()


def login_member(client, email: str) -> str:
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "temporary-member-password"},
    ).json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_owner_receives_assignment_notification_and_actor_cannot_read_it() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    create_member(session_factory, "owner@example.com", "담당자")
    admin_token = login_admin(client)
    owner_token = login_member(client, "owner@example.com")

    owner_profile = client.get("/api/v1/me", headers=auth(owner_token)).json()
    task_response = client.post(
        "/api/v1/tasks",
        headers=auth(admin_token),
        json={
            "title": "새 배정 알림 업무",
            "owner_id": owner_profile["id"],
            "start_date": "2026-06-25",
            "due_date": "2026-07-30",
        },
    )

    assert task_response.status_code == 201

    owner_notifications = client.get("/api/v1/notifications", headers=auth(owner_token))
    admin_notifications = client.get("/api/v1/notifications", headers=auth(admin_token))

    assert owner_notifications.status_code == 200
    assert owner_notifications.json()["unread_count"] == 1
    assert owner_notifications.json()["items"][0]["type"] == "task_assigned"
    assert owner_notifications.json()["items"][0]["task_id"] == task_response.json()["id"]
    assert admin_notifications.status_code == 200
    assert admin_notifications.json()["items"] == []


def test_owner_receives_update_and_post_notifications_from_other_users() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    create_member(session_factory, "owner@example.com", "담당자")
    create_member(session_factory, "writer@example.com", "작성자")
    admin_token = login_admin(client)
    owner_token = login_member(client, "owner@example.com")
    writer_token = login_member(client, "writer@example.com")
    owner_id = client.get("/api/v1/me", headers=auth(owner_token)).json()["id"]

    task_id = client.post(
        "/api/v1/tasks",
        headers=auth(admin_token),
        json={
            "title": "내 로그 알림 업무",
            "owner_id": owner_id,
            "start_date": "2026-06-25",
            "due_date": "2026-07-30",
        },
    ).json()["id"]

    update_response = client.post(
        f"/api/v1/tasks/{task_id}/updates",
        headers=auth(writer_token),
        json={"body": "담당자가 확인해야 하는 로그", "update_type": "note"},
    )
    post_response = client.post(
        f"/api/v1/tasks/{task_id}/posts",
        headers=auth(writer_token),
        json={"scope": "team", "title": "담당자 확인 자료", "body": "확인 필요"},
    )

    assert update_response.status_code == 201
    assert post_response.status_code == 201

    notifications = client.get("/api/v1/notifications", headers=auth(owner_token)).json()
    types = [item["type"] for item in notifications["items"]]

    assert "task_update_added" in types
    assert "task_post_added" in types
    assert notifications["unread_count"] == 3


def test_mark_read_and_mark_all_read_only_affect_current_user_notifications() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    create_member(session_factory, "owner@example.com", "담당자")
    create_member(session_factory, "other@example.com", "다른 담당자")
    admin_token = login_admin(client)
    owner_token = login_member(client, "owner@example.com")
    other_token = login_member(client, "other@example.com")
    owner_id = client.get("/api/v1/me", headers=auth(owner_token)).json()["id"]
    other_id = client.get("/api/v1/me", headers=auth(other_token)).json()["id"]

    for title, owner in [("내 알림", owner_id), ("남의 알림", other_id)]:
        client.post(
            "/api/v1/tasks",
            headers=auth(admin_token),
            json={"title": title, "owner_id": owner, "start_date": "2026-06-25", "due_date": "2026-07-30"},
        )

    owner_items = client.get("/api/v1/notifications", headers=auth(owner_token)).json()["items"]
    notification_id = owner_items[0]["id"]

    read_response = client.patch(f"/api/v1/notifications/{notification_id}/read", headers=auth(owner_token))
    owner_after_read = client.get("/api/v1/notifications", headers=auth(owner_token)).json()
    other_before_all = client.get("/api/v1/notifications", headers=auth(other_token)).json()
    all_read_response = client.patch("/api/v1/notifications/read-all", headers=auth(owner_token))
    other_after_all = client.get("/api/v1/notifications", headers=auth(other_token)).json()

    assert read_response.status_code == 200
    assert owner_after_read["unread_count"] == 0
    assert all_read_response.status_code == 200
    assert other_before_all["unread_count"] == 1
    assert other_after_all["unread_count"] == 1


def test_overdue_notifications_are_personal_and_deduped_on_read() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    create_member(session_factory, "owner@example.com", "담당자")
    admin_token = login_admin(client)
    owner_token = login_member(client, "owner@example.com")
    owner_id = client.get("/api/v1/me", headers=auth(owner_token)).json()["id"]

    task_id = client.post(
        "/api/v1/tasks",
        headers=auth(admin_token),
        json={
            "title": "지연 알림 업무",
            "owner_id": owner_id,
            "start_date": "1999-12-01",
            "due_date": "2000-01-01",
            "status": "진행중",
        },
    ).json()["id"]

    first_read = client.get("/api/v1/notifications", headers=auth(owner_token)).json()
    second_read = client.get("/api/v1/notifications", headers=auth(owner_token)).json()

    overdue_items = [item for item in second_read["items"] if item["type"] == "task_overdue"]
    assert len(overdue_items) == 1
    assert overdue_items[0]["task_id"] == task_id
    assert first_read["unread_count"] == second_read["unread_count"]
