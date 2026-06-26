# LLM-Wiki Architecture Plan

This note adapts the recent LLM-Wiki / personal knowledge-base idea to the work dashboard.

It is the architecture contract for the LLM-Wiki backend implementation. It does not require installing Obsidian on the company Linux server, and it should not turn the AI into a direct unrestricted database client.

Status 2026-06-26:

- FastAPI/PostgreSQL Phase 1 backend is implemented.
- Alembic migration `20260625_0011_llm_wiki.py` adds `wiki_pages`, `wiki_revisions`, `wiki_source_links`, `wiki_links`, `ai_wiki_drafts`, and `wiki_error_book`.
- Backend models live in `backend/app/models/wiki.py`.
- Backend schemas live in `backend/app/schemas/wiki.py`.
- Backend routes live in `backend/app/api/routes_wiki.py` under `/api/v1/ai/wiki/...`.
- Tests live in `backend/tests/test_ai_wiki.py`.
- No OpenAI/HERmes model call is implemented yet. AI-generated changes still enter through a draft/approval path.

## What We Mean By LLM-Wiki

The useful idea is not simply "attach more documents to RAG".

For this dashboard, LLM-Wiki means:

- Current operational facts stay in PostgreSQL task/update/calendar/post tables.
- Durable knowledge is compiled into structured Wiki pages.
- Wiki pages are connected by typed bidirectional links.
- The AI agent can search pages, read pages, follow links, and return to source records.
- When an answer is wrong or incomplete, the correction is recorded in an Error Book so the knowledge structure can improve.

This is closer to an agent-readable knowledge system than a flat vector search index.

## System Boundary

Recommended boundary:

```txt
Dashboard UI
-> FastAPI permission layer
-> PostgreSQL operational tables
-> LLM-Wiki tables and revisions
-> AI read tools
-> grounded answer with citations
```

Rules:

- PostgreSQL remains the source of truth.
- Dashboard task/update records win when they conflict with Wiki summaries.
- Wiki pages summarize and connect knowledge, but they do not replace operational records.
- AI can draft Wiki updates, but human approval is required before publishing.
- Obsidian, Markdown export, or local notes can be optional clients later, not the central company sync layer.

## Proposed Database Shape

### `wiki_pages`

Stores the current published or draft Wiki page.

Suggested fields:

- `id`
- `workspace_id`
- `slug`
- `title`
- `page_type`: `workstream`, `project`, `person_context`, `topic`, `term`, `report`, `decision`, `playbook`
- `summary`
- `body_markdown`
- `status`: `draft`, `published`, `archived`
- `visibility`: `team`, `private`, `workspace`
- `owner_user_id`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### `wiki_revisions`

Stores immutable page history.

Suggested fields:

- `id`
- `page_id`
- `revision_number`
- `summary`
- `body_markdown`
- `change_reason`
- `created_by`
- `created_at`

### `wiki_source_links`

Connects Wiki claims back to dashboard records.

Suggested fields:

- `id`
- `page_id`
- `source_type`: `task`, `task_update`, `task_post`, `briefing_item`, `calendar_event`, `report_evidence`
- `source_id`
- `source_title`
- `source_date`
- `excerpt`
- `content_hash`
- `created_at`

### `wiki_links`

Stores typed bidirectional relationships between pages.

Suggested fields:

- `id`
- `from_page_id`
- `to_page_id`
- `relation_type`: `depends_on`, `related_to`, `explains`, `owned_by`, `part_of`, `decision_for`, `risk_for`
- `created_by`
- `created_at`

When a link is created, the API should maintain the reverse relationship or expose reverse lookup directly.

### `wiki_entities`

Optional normalized entity index for people, topics, workstreams, and terms.

Suggested fields:

- `id`
- `entity_type`: `person`, `workstream`, `topic`, `team`, `term`
- `name`
- `canonical_key`
- `aliases`

### `ai_wiki_drafts`

Stores AI-proposed changes before human approval.

Suggested fields:

- `id`
- `draft_type`: `create_page`, `update_page`, `link_pages`, `add_source_link`
- `target_page_id`
- `proposed_title`
- `proposed_body_markdown`
- `proposed_links`
- `source_evidence_json`
- `status`: `pending`, `approved`, `rejected`, `superseded`
- `created_by_ai_model`
- `requested_by_user_id`
- `reviewed_by_user_id`
- `created_at`
- `reviewed_at`

### `wiki_error_book`

Records corrections that should improve future retrieval and page structure.

Suggested fields:

- `id`
- `question`
- `wrong_or_incomplete_answer`
- `correction`
- `missing_source_type`
- `missing_source_id`
- `target_page_id`
- `resolution_status`: `open`, `drafted`, `fixed`, `rejected`
- `created_by_user_id`
- `created_at`
- `resolved_at`

## AI Tool Set

Start with read and draft tools only.

| Tool | Purpose |
| --- | --- |
| `wiki_search(query, filters)` | Find candidate pages and linked source records. |
| `wiki_read(page_id)` | Read one structured Wiki page with citations. |
| `wiki_follow_links(page_id, relation_type?)` | Traverse related pages for multi-hop questions. |
| `wiki_sources(page_id)` | Return underlying task/update/post/report evidence. |
| `wiki_draft_from_dashboard(source_scope)` | Propose a new or updated Wiki page from dashboard records. |
| `wiki_record_error(question, correction, target?)` | Add a correction to the Error Book. |

Possible FastAPI paths:

- `GET /api/v1/ai/wiki/search`
- `GET /api/v1/ai/wiki/pages/{page_id}`
- `GET /api/v1/ai/wiki/pages/{page_id}/links`
- `GET /api/v1/ai/wiki/pages/{page_id}/sources`
- `POST /api/v1/ai/wiki/drafts`
- `POST /api/v1/ai/wiki/drafts/from-dashboard`
- `POST /api/v1/ai/wiki/drafts/{draft_id}/approve`
- `POST /api/v1/ai/wiki/error-book`

## Dashboard Integration

Recommended first UI surfaces:

- Task detail: `Wiki로 정리` creates a draft page/update from selected task, updates, and 업무 노트.
- Highlights: `업무흐름 Wiki` shows the page connected to the selected workstream.
- Entry AI assistant: answers by combining live dashboard evidence and Wiki pages.
- Admin/review: pending AI Wiki drafts can be approved, edited, or rejected.

Example flow:

```txt
User asks: "혁신아이디어 관련 최근 이슈와 이전 결정사항 알려줘"
1. AI calls dashboard topic evidence for "혁신아이디어".
2. AI calls wiki_search("혁신아이디어").
3. AI reads the workstream Wiki page.
4. AI follows links to decision/risk pages.
5. AI answers with "현재 DB 기준" and "Wiki 정리 기준" separated.
6. If a missing decision is found, user can add an Error Book correction.
```

## Accuracy Model

Expected answer reliability by question type:

- Direct factual lookup from current dashboard DB: high, if permissions and API filters are correct.
- Workstream/person summaries from current DB: medium-high, because summarization can omit nuance.
- Historical context from Wiki pages: medium-high when pages have source links and recent revisions.
- Cross-topic reasoning across many pages: medium, because link quality and page structure matter.
- Predictions, personnel evaluation, or intent judgment: out of scope unless explicitly redesigned.

Practical rule:

- The AI should cite source records for concrete claims.
- The AI should say when it is using Wiki summary instead of live dashboard data.
- The AI should flag stale Wiki pages when source records changed after the last page revision.
- The AI should record repeated misses in `wiki_error_book`.

## Permission And Safety Rules

- All Wiki reads must go through the same FastAPI auth context as dashboard reads.
- Private notes and private calendar details remain excluded unless a later permission design changes that.
- Draft generation can use visible task/update/post records only.
- AI-generated Wiki changes must remain drafts until a human approves them.
- Revisions must be append-only.
- Every answer should be auditable through source links.
- Service-role keys and OpenAI/HERmes credentials must stay server-side only.

## Implementation Phases

### Phase 1: Schema And Read Contract

- Add Wiki tables and migrations.
- Add read-only FastAPI endpoints.
- Seed a few manually written pages from existing workstream/report concepts.
- Add tests for permissions, source links, revisions, and stale-page detection.

Status: implemented for schema, read endpoints, task-based draft creation, approval, source links, revisions, and Error Book creation. Manual seed pages and richer stale-source checks can be expanded later.

### Phase 2: Draft From Dashboard

- Add `Wiki로 정리` draft action for task detail and workstream Highlights.
- Create AI or deterministic draft proposals from task/update/post evidence.
- Require human approval before publish.

### Phase 3: AI Tool Calling

- Let OpenAI/HERmes call `wiki_search`, `wiki_read`, `wiki_follow_links`, and current dashboard evidence tools together.
- Keep final answers citation-first.
- Log tool calls, scope, and source ids.

Status: not implemented yet. The backend API is ready to be wrapped by OpenAI tool calling or HERmes/MCP.

### Phase 4: Error Book

- Add user correction capture.
- Turn accepted corrections into Wiki draft updates or new source links.
- Show unresolved correction count to admins/reviewers.

### Phase 5: Optional Markdown / Obsidian Bridge

- Export Wiki pages to Markdown for offline reading or Obsidian use.
- Import reviewed Markdown changes only through an approval path.
- Do not rely on each user's local Obsidian vault as the source of truth.

## First Codex Implementation Prompt

```txt
AGENTS.md, HANDOFF.md, TODO.md, docs/llm-wiki-architecture-plan.md를 읽고
codex/llm-wiki-architecture 브랜치에서 LLM-Wiki Phase 1을 시작해줘.

목표는 FastAPI/PostgreSQL 기준으로 Wiki 테이블 마이그레이션,
read-only API 계약, 권한 테스트, 그리고 현재 AI evidence layer와 연결되는
wiki_search/wiki_read/wiki_sources 초안 구현이다.

AI 자동 쓰기나 OpenAI API 호출은 아직 하지 말고,
사람 승인 전 draft 상태로 남기는 구조까지만 구현해줘.
```
