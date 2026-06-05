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

- Supabase project URL and anon key.
- First administrator email.
- Whether members can create tasks assigned to other members.
- Whether lead can edit member profile emoji/title, or only work data.
- Whether performance report export should be Markdown only first, or also PDF/DOCX later.

## Immediate Next Technical Step

After the Supabase project connection details are available:

1. Apply `supabase/migrations/001_initial_dashboard_schema.sql`.
2. Add `@supabase/supabase-js` and a Supabase client.
3. Add a Supabase store beside `src/storage.js`, matching the `localDashboardStore` read/write/clear boundary.
4. Load users, tasks, tags, calendar events, notes, and preferences from API on login.
5. Keep JSON export/import as an admin backup and migration tool.

## Current Integration State

- `@supabase/supabase-js` is installed.
- `src/supabaseClient.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/supabaseStore.js` contains the first read/auth/preference adapter scaffold.
- The React UI still uses the local prototype store until a real Supabase project URL and anon key are provided.
