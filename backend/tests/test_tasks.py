from tests.helpers import build_test_client, login_admin, seed_admin
from app.models.user import PermissionRole, User
from app.services.seed import hash_password


def test_admin_can_create_and_list_task() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    roster_response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "팀원"},
    )
    owner_roster_id = roster_response.json()["id"]

    create_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "회사 백엔드 검증",
            "description": "FastAPI와 PostgreSQL 연결 확인",
            "owner_roster_id": owner_roster_id,
            "status": "계획",
            "priority": "보통",
            "start_date": "2026-06-25",
            "due_date": "2026-06-30",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "회사 백엔드 검증"
    assert created["owner_roster_id"] == owner_roster_id
    assert created["creator_email"] == "admin@example.com"

    list_response = client.get("/api/v1/tasks", headers={"Authorization": f"Bearer {token}"})

    assert list_response.status_code == 200
    assert [task["title"] for task in list_response.json()] == ["회사 백엔드 검증"]


def test_task_creation_requires_authentication() -> None:
    client, _ = build_test_client()

    response = client.post(
        "/api/v1/tasks",
        json={
            "title": "인증 없는 업무",
            "owner_roster_id": "00000000-0000-0000-0000-000000000000",
            "start_date": "2026-06-25",
            "due_date": "2026-06-30",
        },
    )

    assert response.status_code == 401


def test_admin_can_update_task_status_and_progress() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    roster_response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "팀원"},
    )
    create_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "상태 변경 검증",
            "owner_roster_id": roster_response.json()["id"],
            "start_date": "2026-06-25",
            "due_date": "2026-06-30",
        },
    )

    update_response = client.patch(
        f"/api/v1/tasks/{create_response.json()['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "진행중", "progress": 40},
    )

    assert update_response.status_code == 200
    assert update_response.json()["status"] == "진행중"
    assert update_response.json()["progress"] == 40


def test_task_recurring_rule_round_trips() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    roster_response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "팀원"},
    )

    create_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "반복 업무 검증",
            "owner_roster_id": roster_response.json()["id"],
            "start_date": "2026-06-01",
            "due_date": "2026-06-05",
            "recurring": "매월",
            "recurring_detail": "매월 첫째 주",
            "recurring_interval": 1,
            "recurring_weekdays": [1],
            "recurring_start_date": "2026-06-01",
            "recurring_no_end": True,
            "recurring_duration_days": 4,
        },
    )

    assert create_response.status_code == 201
    assert create_response.json()["recurring"] == "매월"
    assert create_response.json()["recurring_weekdays"] == [1]

    task_id = create_response.json()["id"]
    update_response = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "recurring": "매주",
            "recurring_detail": "격주 월요일",
            "recurring_interval": 2,
            "recurring_weekdays": [1],
            "recurring_end_date": "2026-09-01",
            "recurring_no_end": False,
        },
    )

    assert update_response.status_code == 200
    assert update_response.json()["recurring"] == "매주"
    assert update_response.json()["recurring_interval"] == 2
    assert update_response.json()["recurring_end_date"] == "2026-09-01"


def test_task_manager_can_delete_future_recurring_instances() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    roster_response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "팀원"},
    )
    owner_roster_id = roster_response.json()["id"]
    template_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "반복 원본",
            "owner_roster_id": owner_roster_id,
            "start_date": "2026-06-01",
            "due_date": "2026-06-05",
            "recurring": "매월",
        },
    )
    template_id = template_response.json()["id"]
    future_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "미래 회차",
            "owner_roster_id": owner_roster_id,
            "start_date": "2026-07-01",
            "due_date": "2026-07-05",
            "recurring_template_id": template_id,
        },
    )
    past_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "과거 회차",
            "owner_roster_id": owner_roster_id,
            "start_date": "2026-06-01",
            "due_date": "2026-06-05",
            "recurring_template_id": template_id,
        },
    )

    delete_response = client.delete(
        f"/api/v1/tasks/{template_id}/recurring/future?after_date=2026-06-26",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert delete_response.status_code == 204
    list_response = client.get("/api/v1/tasks", headers={"Authorization": f"Bearer {token}"})
    remaining_ids = {task["id"] for task in list_response.json()}
    assert future_response.json()["id"] not in remaining_ids
    assert past_response.json()["id"] in remaining_ids


def test_member_cannot_update_task_they_do_not_manage() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    admin_token = login_admin(client)
    roster_response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"expected_email": "owner@example.com", "name": "담당자"},
    )
    task_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "권한 검증 업무",
            "owner_roster_id": roster_response.json()["id"],
            "start_date": "2026-06-25",
            "due_date": "2026-06-30",
        },
    )
    with session_factory() as db:
        member = User(
            email="member@example.com",
            password_hash=hash_password("temporary-member-password"),
            name="팀원",
            title="연구원",
            permission_role=PermissionRole.member,
        )
        db.add(member)
        db.commit()
    member_token = client.post(
        "/api/v1/auth/login",
        json={"email": "member@example.com", "password": "temporary-member-password"},
    ).json()["access_token"]

    response = client.patch(
        f"/api/v1/tasks/{task_response.json()['id']}",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"status": "진행중"},
    )

    assert response.status_code == 403
