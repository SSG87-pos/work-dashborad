# Backend Implementation Plan

This plan turns the current React/Vite localStorage prototype into a usable shared dashboard with real login and shared data.

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

The approved first implementation path is Supabase:

- localStorage adapter for prototype/development
- Supabase/Postgres schema in `supabase/migrations/001_initial_dashboard_schema.sql`
- setup guide in `docs/supabase-start-guide.md`
- API/table contract in `docs/backend-api-spec.md`
- future internal SSO support through the same `public.users` profile model

### Approved Option. Supabase BaaS

Best when the team wants a working shared dashboard quickly.

Pros:

- faster auth and tables
- less infrastructure work
- easier prototype-to-production transition

Cons:

- service choice and account setup required
- row-level permissions must be configured carefully

### Future Option. Custom API

Best when the dashboard must live inside an existing internal system.

Pros:

- full control over authentication and permissions
- easier integration with internal SSO later

Cons:

- slower first usable version
- needs deployment, database, and operations decisions

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

After the first admin login and initial Supabase connection:

1. Keep actual team-member signup/auth account linking deferred until the team is ready.
2. Do not run a legacy JSON import for the current launch; the team will start writing fresh data in Supabase. Keep the approved JSON import flow only as an admin backup/future migration path, and use it only after a source file is selected and local 담당자 IDs are mapped to the current team roster.
3. Use `docs/supabase-security-next-pass.md` for the next approved security hardening pass around SECURITY DEFINER helper functions and shared memo RLS strictness.
4. Continue small no-approval stabilization through the existing storage boundary and verification scripts.
5. Keep JSON export/import as an admin backup and migration tool.

## Current Integration State

- `@supabase/supabase-js` is installed.
- `src/supabaseClient.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/supabaseStore.js` contains auth/read/preference/memo/tag/task/calendar adapters.
- Live project URL is configured locally in ignored `.env.local`.
- Initial Supabase schema, RLS policies, manual Data API grants, and first admin promotion have been applied.
- Login/session restore hydrates profile/preferences/memos/tags/events/tasks from Supabase.
- Empty Supabase task/calendar tables preserve prototype data during migration so the UI remains usable.
- First write paths exist for shared tags, page-scoped memos, profile name/title/emoji, UUID-backed tasks, task status, due-date change history, task change-history note correction/delete, update logs, update-log body correction/delete, links, archive/delete, subtask progress, and calendar event create/edit/delete.
- Admin user-management UI exists for permission role, team-list visibility, and active-state changes.
- Live migration `admin_user_management_grants` has been applied. The matching local file is `supabase/migrations/002_admin_user_management.sql`, which grants the additional `users` update columns required by admin user-management.
- Live migration `task_recurring_columns` has been applied. The matching local file is `supabase/migrations/003_task_recurring_columns.sql`, which stores the visible recurring task rule directly on `tasks` so the existing board/timeline/recurring UI can round-trip rules without a separate worker.
- Live migration `team_roster_pre_auth` has been applied. The matching local file is `supabase/migrations/004_team_roster_pre_auth.sql`, which lets admins create assignee roster rows with expected signup emails before teammates have accounts.
- Live migration `roster_task_permissions` has been applied. The matching local file is `supabase/migrations/005_roster_task_permissions.sql`, which lets a linked teammate manage pre-created tasks assigned to their roster row.
- The UI now shows a short in-app sync notice when a Supabase write fails or when a prototype-only sample item is kept local.
- Prototype JSON import now has a signed-in Supabase summary guard, administrator confirmation, live merge/upsert execution, and local same-JSON fingerprint warning before duplicate-risk reruns.
- Prototype JSON import now blocks unknown local 담당자 IDs before live Supabase writes, so stale local IDs are mapped before they can become operational roster rows.
- Supabase advisor preflight produced `supabase/migrations/013_advisor_preflight_hardening.sql` for `touch_updated_at` search path and FK covering indexes. It passed `BEGIN ... ROLLBACK` syntax verification and was applied live through `execute_sql`.
- Transition note: tasks can now save against roster assignees before signup. When a teammate signs up with the expected email, the roster row links to the real auth user automatically.
