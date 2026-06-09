# Supabase Start Guide

This guide records the approved first backend path for the `연구기획그룹-전략` dashboard.

## Approved Direction

- Backend: Supabase.
- Login first: email/password signup and login.
- Signup policy: anyone who can sign up becomes a normal `member` by default.
- Admin policy: administrator permission is assigned separately after signup.
- Future login path: company internal login or SSO can be connected later by mapping the internal identity to the same `public.users` profile row.

## Why This Path

The dashboard is relational and audit-heavy:

- tasks
- subtasks
- task links
- task updates
- change history
- tags and task tags
- calendar events
- recurring task templates
- performance report sources

Supabase/Postgres fits this model better than a document-only database because joins, reports, history tables, and RLS permission rules are central to the app.

## Initial Setup Steps

1. Create or choose a Supabase project.
2. Apply `supabase/migrations/001_initial_dashboard_schema.sql`.
3. Enable email/password signup in Supabase Auth.
4. Sign up the first real administrator account through the app or Supabase Auth UI.
5. Promote that account to admin in SQL:

```sql
update public.users
set
  permission_role = 'admin',
  title = '관리자 또는 실제 직책',
  is_team_member = false -- admin-only support account이면 false, 실제 팀원이면 true
where email = 'ADMIN_EMAIL_HERE';
```

6. Sign up the team lead and members.
7. Promote the team lead:

```sql
update public.users
set
  permission_role = 'lead',
  title = '팀장',
  is_team_member = true
where email = 'LEAD_EMAIL_HERE';
```

8. Keep other signup users as `member` unless an admin changes their role.

## Frontend Integration Boundary

Do not call Supabase directly from view components.

Use this path:

1. Keep `localDashboardStore` in `src/storage.js` as the development fallback.
2. Add a future `supabaseDashboardStore` beside it.
3. Let `App.jsx` select the active store from environment/config.
4. Keep JSON export/import as admin backup and migration support.

## Environment Variables

Future frontend integration should use:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never commit service role keys or database passwords to the frontend repo.

Current local project values:

- Supabase project: `work-dashboard`
- Project ref: `nbefvcrcfwacvnohtsmy`
- URL: `https://nbefvcrcfwacvnohtsmy.supabase.co`
- First admin email: `seulgis@posco.com`
- Applied live migrations:
  - `20260605105710 initial_dashboard_core_schema`
  - `20260605105800 initial_dashboard_rls_policies`
  - `grant_data_api_table_access`
  - `promote_first_admin`
  - `20260608140147 020_task_posts`

Because `Automatically expose new tables` is disabled, every new public table that should be available through `supabase-js` needs explicit grants for the Data API roles. RLS policies still control row-level access after those grants.

Latest live verification:

- 2026-06-08: `020_task_posts` is applied to live project `nbefvcrcfwacvnohtsmy`.
- Authenticated-role rollback smoke verified `task_posts` create, read, update, and delete with URL and attachment metadata; the rollback left 0 QA rows.
- `task_posts` and `task_post_categories` both have RLS enabled. Default active post categories count is 7.
- Browser UI smoke on `http://127.0.0.1:5188/` verified Supabase-connected `업무 노트` flow: open task detail, create note, read note, update title/body/URL, delete note, reload, and confirm the deleted note stays gone. DB cleanup check found 0 leftover UI QA rows.
- Local repo migration `021_task_work_kind.sql` adds `tasks.work_kind` for `스팟 업무`. Apply it before using spot work in a new self-hosted Supabase environment; the public live project note above only reflects migrations already applied there.
- Local repo migration `022_briefing_items.sql` adds Today Briefing `업무 인박스`/`팀 체크` storage through `briefing_items`. Apply it before expecting those capture records to persist in a new self-hosted Supabase environment; the public live project note above only reflects migrations already applied there.

## Permission Notes

- New signups default to `member`.
- `admin` can manage roles, users, tags, all tasks, all shared data, and support access.
- `lead` can assign/manage team tasks and view team reports.
- `member` can create/edit own tasks and add updates to visible team tasks.
- Everyone can create shared tags.
- Only `admin` can rename/delete shared tags.
- Personal calendar events and personal notes stay owner/admin only.
- Page memos used by the current dashboard are shared by page key (`my`, `team`), not private personal notes.

## Team Onboarding Inputs

Use these files when moving from prototype/sample users to real team operation:

- `docs/local-linux-supabase-runbook.md` explains how to connect this dashboard to a local Supabase stack on a company Linux computer, including local CLI setup, migrations, `.env.local`, port `10097`, admin promotion, and current shared-persistence gaps.
- `docs/company-self-hosted-supabase-guide.md` explains the later company-internal self-hosted Supabase operating path, including GitHub branch strategy, what to clone, how the Supabase official Docker repo differs from this dashboard repo, how to move the operating baseline to an internal company Git when GitHub push is blocked, migration application, app environment variables, and remaining production-readiness work.
- `docs/multi-workspace-expansion-plan.md` explains the later expansion path for 30-person groups and multiple groups, including `workspace_id`, `unit_id`, visibility, group-specific tags/workstreams/post types, and RLS separation.
- `docs/personal-notification-inbox-plan.md` explains the later personal notification inbox after self-hosted Supabase is stable, including notification events, `notifications` table/RLS, top bell badge behavior, read/unread state, and why Teams delivery should remain a later high-signal integration.
- `docs/company-supabase-review-brief.md` is the company-facing review summary for Supabase use, data scope, security boundaries, and temporary URL decisions.
- `docs/company-demo-readiness-checklist.md` explains the company-approval demo stop point, real-name demo policy, temporary URL decision, and approval boundaries.
- `docs/supabase-auth-security-checklist.md` explains the remaining Auth dashboard security check for leaked password protection and password policy.
- `docs/internal-port-demo-runbook.md` is the no-temporary-URL runbook for port/local-network demos inside the company network.
- `docs/company-clone-runbook.md` explains the later Windows/Linux company PC clone, install, environment, check, and run flow.
- `docs/team-onboarding-checklist.md` explains when real user information is needed and the recommended validation order.
- `docs/team-roster-template.csv` is the fill-in template for initial roster setup.

Minimum fields needed for each real user:

- name
- title
- permission_role: `admin`, `lead`, or `member`
- expected_email: the email they will use to sign up
- is_team_member: whether they should appear in the team list

The current app can create roster rows before a teammate signs up. When the teammate later signs up with the matching `expected_email`, the roster row can link to the real auth user.

## Future SSO

When company login becomes available:

- keep `public.users.id` as the app profile id linked to `auth.users.id`
- map SSO identity/email into Supabase Auth or a backend session
- preserve `permission_role`, `profile_emoji`, title, and team fields in `public.users`
- keep the app-facing storage contract unchanged

The frontend should not need a major rewrite if the storage boundary is preserved.
