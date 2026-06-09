# Backend Implementation Plan

This plan turns the current React/Vite localStorage prototype into a usable shared dashboard with real login and shared data.

Current approved backend route: **FastAPI + PostgreSQL without Docker**. Read `docs/fastapi-postgres-backend-spec.md` before implementation. Supabase remains design history and schema reference only because the company backend condition cannot run Supabase Docker.

## Recommended Sequence

### 1. Keep the Current Prototype as the UI Source

Keep `src/App.jsx`, `src/data.js`, and `src/styles.css` as the working UI prototype until the backend data shape is ready.

Do not rebuild the UI from scratch. The first storage boundary now lives in `src/storage.js`; keep expanding that boundary into an API-backed store instead of mixing network calls directly into screen components.

### 2. Add Authentication

Minimum account model:

- email/password login
- admin account
- lead account
- member accounts
- profile emoji selection
- active/inactive user state

The current account picker should become a development-only fallback after real auth exists.

### 3. Create Core Tables or Collections

Use `docs/backend-decision-brief.md` for the approval point, `docs/data-model.md` for entity meaning, and `docs/backend-api-spec.md` for concrete tables, endpoints, permissions, and migration order.

First tables:

- users
- tasks
- subtasks
- task_updates
- task_links
- tags
- task_tags
- calendar_events
- personal_notes

Second wave:

- recurring_task_templates
- recurring_task_instances or generated task rows linked by recurring_template_id
- performance_snapshots

### 4. Move Task CRUD First

Start backend integration with tasks because most screens depend on them.

Required operations:

- list visible tasks by role
- create task
- update task
- update status
- archive/restore task
- toggle subtask
- add update log

After this step, board, briefing, timeline, calendar task due items, updates, and performance reports can all use shared task data.

### 5. Move Shared Metadata

Next migrate:

- tags
- team calendar events
- profile emoji

Tags should remain team-shared. Everyone can add tags, while rename/delete stays admin-only.

### 6. Move Private Data

Migrate:

- personal calendar events
- personal notes

Privacy rules from `docs/permission-rules.md` must be enforced server-side.

### 7. Recurring Work

Current prototype supports two paths:

- virtual recurring instances for display
- saved recurring instances through `다음 회차 저장`

Production should use a template plus instance model:

- recurring template stores the rule
- generated instances are normal tasks
- generated instances copy subtasks as unchecked
- generated instances have independent status, progress, archive, links, and updates

Avoid generating unlimited future rows. Generate visible near-term periods, or materialize on demand.

### 8. Performance Reports

Keep reports computed live at first.

Then add:

- Markdown export
- optional source appendix
- frozen snapshots for submitted weekly/monthly reports

Rules are defined in `docs/performance-report-rules.md`.

### 9. AI Agent Readiness

Keep AI/HERmes integration read-only until the shared backend and permission model are stable.

First add a permission-filtered evidence projection for:

- 담당자별 업무 진행내용
- 주제/아이디어 관련 진행내용과 이슈
- 상위 업무흐름별 진행/리스크
- 주간/월간/임원 보고서 초안 근거

Rules are defined in `docs/ai-agent-readiness.md`. AI-generated reports must include source task/update dates and stay human-reviewed drafts.

## Backend Options

The approved first implementation path is now:

- FastAPI backend in a new `backend/` folder
- Direct PostgreSQL install on the company Linux server
- API-backed frontend store selected by `VITE_API_BASE_URL`
- SQLAlchemy or SQLModel models
- Alembic migrations
- FastAPI service-layer permissions instead of Supabase RLS
- future internal SSO support through the same `users` profile model

### Approved Option. FastAPI + PostgreSQL

Best when the dashboard must run inside a company internal network where Docker/Supabase self-hosting is not available.

Pros:

- no Supabase Docker dependency
- full control over authentication and permissions
- easier to operate inside an internal Linux server policy
- PostgreSQL still supports reporting, joins, audit history, and later AI evidence queries
- future SSO can be integrated at the API session layer

Cons:

- more implementation work than Supabase table API
- auth, permissions, migrations, and deployment must be owned by the project
- realtime features require a later WebSocket/SSE pass

### Reference Option. Supabase

Supabase remains useful as a design reference because it already shaped the table model, task-posts, briefing items, Canvas storage, and permission thinking. It is not the current operating target while Docker-based self-hosting is blocked.

## Minimal Production Milestone

A first usable shared version should include:

- real login
- shared task CRUD
- shared tags
- team calendar events
- private personal notes
- private personal calendar events
- role-based permissions
- JSON export/import retained as backup

After that, add recurring automation and report snapshots.

## Open Decisions Requiring User Confirmation

- Whether members can create tasks assigned to other members.
- Whether lead can edit member profile emoji/title, or only work data.
- Whether performance report export should be Markdown only first, or also PDF/DOCX later.
- Whether an approved AI agent such as HERmes should connect through Supabase RPC/views, a custom REST API, or an MCP tool layer.

## Immediate Next Technical Step

For the FastAPI/PostgreSQL path:

1. Create `backend/` with FastAPI, config, DB session, health check, and Alembic.
2. Add PostgreSQL migrations for `users` and `team_roster`.
3. Add first-admin seed flow.
4. Implement email/password login and `GET /api/v1/me`.
5. Add `src/apiClient.js` and `src/apiStore.js` selected by `VITE_API_BASE_URL`.
6. Move shared task CRUD first.
7. Keep JSON export/import as an admin backup and migration tool.
8. Keep realtime, Teams push, and AI model calls deferred.

## Current Integration State

- Frontend UI and local fallback are complete enough to keep as the product surface.
- `src/storage.js` is the local persistence boundary and should remain the fallback.
- `src/supabaseClient.js` and `src/supabaseStore.js` still exist from the earlier Supabase path and can be used as adapter-shape references.
- No FastAPI backend has been implemented yet.
- No `backend/` folder exists yet.
- No PostgreSQL Alembic migrations exist yet.
- The current first implementation task is to add a FastAPI skeleton and PostgreSQL schema based on `docs/fastapi-postgres-backend-spec.md`.
