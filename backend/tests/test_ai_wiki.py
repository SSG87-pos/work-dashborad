from tests.helpers import build_test_client, login_admin, seed_admin


def seed_wiki_source_task(client, token: str) -> str:
    roster_response = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "wiki-member@example.com", "name": "박경수", "title": "팀장"},
    )
    owner_roster_id = roster_response.json()["id"]
    task_response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "LLM Wiki 업무지식 구조화",
            "description": "대시보드 기록을 Wiki 페이지와 출처 링크로 정리합니다.",
            "owner_roster_id": owner_roster_id,
            "status": "진행중",
            "priority": "높음",
            "workstream": "AI 업무 에이전트",
            "start_date": "2026-06-20",
            "due_date": "2026-06-30",
            "progress": 40,
        },
    )
    task_id = task_response.json()["id"]
    client.post(
        f"/api/v1/tasks/{task_id}/updates",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "Wiki source link와 draft 승인 흐름 정의", "update_type": "note"},
    )
    category_response = client.post(
        "/api/v1/post-categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"key": "decision", "label": "결정사항", "tone": "blue"},
    )
    client.post(
        f"/api/v1/tasks/{task_id}/posts",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "category_id": category_response.json()["id"],
            "scope": "결정사항",
            "title": "PostgreSQL을 원천으로 유지",
            "body": "Obsidian vault가 아니라 FastAPI/PostgreSQL을 중앙 원천으로 둡니다.",
            "posted_at": "2026-06-25",
        },
    )
    return task_id


def test_ai_wiki_draft_approve_search_read_sources_and_error_book() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = seed_wiki_source_task(client, token)

    draft_response = client.post(
        "/api/v1/ai/wiki/drafts/from-dashboard",
        headers={"Authorization": f"Bearer {token}"},
        json={"source_type": "task", "source_id": task_id, "proposed_page_type": "workstream"},
    )
    assert draft_response.status_code == 201
    draft = draft_response.json()
    assert draft["status"] == "pending"
    assert draft["proposed_title"] == "AI 업무 에이전트"
    assert "LLM Wiki 업무지식 구조화" in draft["proposed_body_markdown"]
    assert {link["source_type"] for link in draft["proposed_source_links"]} == {"task", "task_update", "task_post"}

    approve_response = client.post(
        f"/api/v1/ai/wiki/drafts/{draft['id']}/approve",
        headers={"Authorization": f"Bearer {token}"},
        json={"change_reason": "초기 Wiki 페이지 발행", "visibility": "team", "status": "published"},
    )
    assert approve_response.status_code == 200
    page = approve_response.json()
    assert page["title"] == "AI 업무 에이전트"
    assert page["status"] == "published"
    assert page["latest_revision_number"] == 1
    assert len(page["sources"]) == 3
    assert all(source["stale"] is False for source in page["sources"])

    search_response = client.get(
        "/api/v1/ai/wiki/search?query=에이전트",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert search_response.status_code == 200
    assert [item["id"] for item in search_response.json()["items"]] == [page["id"]]

    read_response = client.get(
        f"/api/v1/ai/wiki/pages/{page['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert read_response.status_code == 200
    assert "PostgreSQL을 중앙 원천" in read_response.json()["body_markdown"]

    sources_response = client.get(
        f"/api/v1/ai/wiki/pages/{page['id']}/sources",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sources_response.status_code == 200
    assert {source["source_type"] for source in sources_response.json()} == {"task", "task_update", "task_post"}

    error_response = client.post(
        "/api/v1/ai/wiki/error-book",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "question": "LLM Wiki 원천은 무엇인가?",
            "wrong_or_incomplete_answer": "Obsidian vault",
            "correction": "FastAPI/PostgreSQL이 중앙 원천이고 Obsidian은 선택적 export입니다.",
            "target_page_id": page["id"],
        },
    )
    assert error_response.status_code == 201
    assert error_response.json()["resolution_status"] == "open"


def test_ai_wiki_requires_authentication() -> None:
    client, _session_factory = build_test_client()

    response = client.get("/api/v1/ai/wiki/search?query=wiki")

    assert response.status_code == 401
