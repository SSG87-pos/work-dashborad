from tests.helpers import build_test_client, login_admin, seed_admin


def create_workstream_task(client, token: str, roster_id: str, title: str, workstream: str, tags: list[str]) -> str:
    response = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": title,
            "description": "AI 활용사례와 임원보고 근거를 함께 정리합니다.",
            "workstream": workstream,
            "owner_roster_id": roster_id,
            "start_date": "2026-06-25",
            "due_date": "2026-06-30",
        },
    )
    task_id = response.json()["id"]
    client.put(
        f"/api/v1/tasks/{task_id}/tags",
        headers={"Authorization": f"Bearer {token}"},
        json={"tags": tags},
    )
    client.post(
        f"/api/v1/tasks/{task_id}/updates",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "AI 활용사례 근거와 임원보고 Q&A 정합성 확인", "update_type": "note"},
    )
    return task_id


def test_admin_gets_evidence_based_workstream_suggestions() -> None:
    client, session_factory = build_test_client()
    seed_admin(session_factory)
    token = login_admin(client)
    roster = client.post(
        "/api/v1/admin/roster",
        headers={"Authorization": f"Bearer {token}"},
        json={"expected_email": "member@example.com", "name": "팀원"},
    ).json()
    category = client.post(
        "/api/v1/post-categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"key": "decision", "label": "결정사항", "tone": "blue"},
    ).json()
    first_id = create_workstream_task(
        client,
        token,
        roster["id"],
        "AI 활용사례 조사",
        "AI 연구기획 활용사례",
        ["AI활용", "임원보고"],
    )
    second_id = create_workstream_task(
        client,
        token,
        roster["id"],
        "임원보고 Q&A 대응",
        "AI 보고 대응",
        ["AI활용", "임원보고"],
    )
    client.post(
        f"/api/v1/tasks/{second_id}/posts",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "category_id": category["id"],
            "scope": "team",
            "title": "AI 근거 캡처",
            "body": "임원보고 Q&A에 AI 활용사례 근거를 연결합니다.",
            "attachment": {
                "ocrText": "AI 활용사례 임원보고 Q&A",
                "visionSummary": "AI 사례와 보고 대응이 같은 자료에 표시됨",
            },
        },
    )

    response = client.get("/api/v1/workstreams/suggestions", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    suggestions = response.json()
    assert suggestions
    labels = {suggestions[0]["primary_label"], suggestions[0]["candidate_label"]}
    assert labels == {"AI 연구기획 활용사례", "AI 보고 대응"}
    assert suggestions[0]["score"] >= 0.24
    assert "AI활용".lower() in suggestions[0]["shared_terms"] or "ai활용" in suggestions[0]["shared_terms"]
    assert {item["id"] for item in suggestions[0]["tasks"]} >= {first_id, second_id}
