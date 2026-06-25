from sqlalchemy.orm import Session, sessionmaker

from app.models.user import PermissionRole, User
from app.services.seed import hash_password, seed_first_admin
from tests.helpers import build_test_client, seed_admin


def test_admin_can_login_and_read_own_profile() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "temporary-admin-password"},
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    assert login_response.json()["token_type"] == "bearer"

    profile_response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})

    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "admin@example.com"
    assert profile_response.json()["permission_role"] == "admin"


def test_admin_can_create_roster_member() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "temporary-admin-password"},
    ).json()["access_token"]

    response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "expected_email": "member@example.com",
            "name": "팀원",
            "title": "연구원",
            "permission_role": "member",
            "is_team_member": True,
            "is_active": True,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["expected_email"] == "member@example.com"
    assert body["permission_role"] == "member"

    update_response = client.patch(
        f"/api/v1/admin/roster/{body['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "팀원2",
            "title": "책임연구원",
            "profile_emoji": "🙂",
            "permission_role": "lead",
            "is_active": False,
        },
    )

    assert update_response.status_code == 200
    assert update_response.json()["name"] == "팀원2"
    assert update_response.json()["permission_role"] == "lead"
    assert update_response.json()["is_active"] is False


def test_admin_can_list_roster_members_after_creation() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "temporary-admin-password"},
    ).json()["access_token"]
    client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "팀원"},
    )

    response = client.get("/api/v1/admin/roster", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert [item["expected_email"] for item in response.json()] == [
        "admin@example.com",
        "member@example.com",
    ]


def test_roster_creation_requires_admin_token() -> None:
    client, _ = build_test_client()

    response = client.post(
        "/api/v1/admin/roster",
        json={"expected_email": "member@example.com", "name": "팀원"},
    )

    assert response.status_code == 401


def test_roster_creation_rejects_member_token() -> None:
    client, session_factory = build_test_client()
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
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "member@example.com", "password": "temporary-member-password"},
    ).json()["access_token"]

    response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "other@example.com", "name": "다른 팀원"},
    )

    assert response.status_code == 403
