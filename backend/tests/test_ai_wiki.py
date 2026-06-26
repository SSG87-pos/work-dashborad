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
            "attachment": {
                "label": "화이트보드 캡처",
                "caption": "LLM-Wiki 원천 구조 회의 이미지",
                "ocrText": "PostgreSQL 원천, Wiki는 정리 레이어, Obsidian은 선택 export",
                "visionSummary": "회의 화이트보드에 중앙 DB와 Wiki 계층이 구분되어 있음",
            },
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
    assert "PostgreSQL 원천, Wiki는 정리 레이어" in draft["proposed_body_markdown"]
    assert {link["source_type"] for link in draft["proposed_source_links"]} == {"task", "task_update", "task_post"}
    post_source = next(link for link in draft["proposed_source_links"] if link["source_type"] == "task_post")
    assert "회의 화이트보드에 중앙 DB와 Wiki 계층" in post_source["excerpt"]
    assert "PostgreSQL 원천, Wiki는 정리 레이어" in post_source["excerpt"]

    pending_response = client.get("/api/v1/ai/wiki/drafts?status=pending", headers={"Authorization": f"Bearer {token}"})
    assert pending_response.status_code == 200
    assert [item["id"] for item in pending_response.json()] == [draft["id"]]

    update_response = client.patch(
        f"/api/v1/ai/wiki/drafts/{draft['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "proposed_title": "AI 업무 에이전트 운영 지식",
            "proposed_summary": "관리자가 검토 중 보강한 Wiki 초안입니다.",
            "proposed_body_markdown": f"{draft['proposed_body_markdown']}\n\n## 관리자 보강\n- 발행 전 제목과 요약을 조정했습니다.",
        },
    )
    assert update_response.status_code == 200
    updated_draft = update_response.json()
    assert updated_draft["proposed_title"] == "AI 업무 에이전트 운영 지식"
    assert updated_draft["proposed_summary"] == "관리자가 검토 중 보강한 Wiki 초안입니다."
    assert "관리자 보강" in updated_draft["proposed_body_markdown"]

    approve_response = client.post(
        f"/api/v1/ai/wiki/drafts/{draft['id']}/approve",
        headers={"Authorization": f"Bearer {token}"},
        json={"change_reason": "초기 Wiki 페이지 발행", "visibility": "team", "status": "published"},
    )
    assert approve_response.status_code == 200
    page = approve_response.json()
    assert page["title"] == "AI 업무 에이전트 운영 지식"
    assert page["summary"] == "관리자가 검토 중 보강한 Wiki 초안입니다."
    assert "관리자 보강" in page["body_markdown"]
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


def test_admin_can_list_and_reject_ai_wiki_draft() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    task_id = seed_wiki_source_task(client, token)

    draft_response = client.post(
        "/api/v1/ai/wiki/drafts/from-dashboard",
        headers={"Authorization": f"Bearer {token}"},
        json={"source_type": "task", "source_id": task_id, "proposed_page_type": "workstream"},
    )
    draft = draft_response.json()

    reject_response = client.post(
        f"/api/v1/ai/wiki/drafts/{draft['id']}/reject",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "중복 초안"},
    )

    assert reject_response.status_code == 200
    assert reject_response.json()["status"] == "rejected"
    assert reject_response.json()["source_evidence_json"]["reject_reason"] == "중복 초안"

    pending_response = client.get("/api/v1/ai/wiki/drafts?status=pending", headers={"Authorization": f"Bearer {token}"})
    assert pending_response.status_code == 200
    assert pending_response.json() == []

    rejected_response = client.get("/api/v1/ai/wiki/drafts?status=rejected", headers={"Authorization": f"Bearer {token}"})
    assert rejected_response.status_code == 200
    assert [item["id"] for item in rejected_response.json()] == [draft["id"]]


def test_ai_wiki_requires_authentication() -> None:
    client, _session_factory = build_test_client()

    response = client.get("/api/v1/ai/wiki/search?query=wiki")

    assert response.status_code == 401
