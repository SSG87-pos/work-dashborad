from tests.helpers import build_test_client, login_admin, seed_admin


def create_task(client, token: str, roster_id: str, title: str, **overrides) -> str:
    payload = {
        "title": title,
        "description": overrides.pop("description", "DB 인사이트 검증용 업무입니다."),
        "workstream": overrides.pop("workstream", "월간 운영"),
        "owner_roster_id": roster_id,
        "status": overrides.pop("status", "계획"),
        "priority": overrides.pop("priority", "보통"),
        "start_date": overrides.pop("start_date", "2026-06-01"),
        "due_date": overrides.pop("due_date", "2026-06-30"),
        **overrides,
    }
    response = client.post("/api/v1/tasks", headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert response.status_code == 201
    return response.json()["id"]


def test_dashboard_insights_return_db_backed_operational_signals() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    roster = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "팀원"},
    ).json()
    stale_id = create_task(
        client,
        token,
        roster["id"],
        "업데이트 없는 업무",
        workstream="",
        start_date="2026-06-01",
        due_date="2026-06-28",
    )
    overdue_id = create_task(
        client,
        token,
        roster["id"],
        "마감 지난 업무",
        workstream="월간 운영",
        start_date="2026-06-01",
        due_date="2026-06-20",
    )
    soon_id = create_task(
        client,
        token,
        roster["id"],
        "곧 마감 업무",
        workstream="월간 운영",
        start_date="2026-06-25",
        due_date="2026-06-27",
    )
    create_task(
        client,
        token,
        roster["id"],
        "완료 업무",
        workstream="월간 운영",
        status="완료",
        start_date="2026-06-01",
        due_date="2026-06-10",
    )
    client.post(
        f"/api/v1/tasks/{soon_id}/updates",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "오늘 업데이트됨", "update_type": "note"},
    )

    response = client.get(
        f"/api/v1/dashboard/insights?scope=mine&owner_id={roster['id']}&today=2026-06-26",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    items = {item["key"]: item for item in response.json()["items"]}
    assert items["open"]["count"] == 3
    assert items["soon"]["count"] == 2
    assert items["overdue"]["count"] == 1
    assert items["stale"]["count"] >= 2
    assert items["unclassified"]["count"] == 1
    assert items["completed"]["count"] == 1
    assert {task["id"] for task in items["unclassified"]["tasks"]} == {stale_id}
    assert overdue_id in {task["id"] for task in items["overdue"]["tasks"]}
    assert soon_id in {task["id"] for task in items["soon"]["tasks"]}
