# Backend Decision Brief

This brief defines the backend decision for turning the local React/Vite prototype into a shared work dashboard.

Status as of 2026-06-09: the approved route changed from Supabase to **FastAPI + PostgreSQL without Docker** because the company backend environment cannot install the Supabase Docker stack. Use `docs/fastapi-postgres-backend-spec.md` for the implementation plan.

## Decision Needed

Choose the first shared-data route:

| Route | Best when | Tradeoff |
| --- | --- | --- |
| BaaS / managed backend | The team wants a usable shared dashboard quickly. | Faster auth/tables, but service account and permission setup are required. |
| Internal API | The dashboard must live inside an existing company system. | Better internal fit, but slower first usable version. |

Recommended first production path under the current company constraint: internal API.

Approved first route: FastAPI backend with directly installed PostgreSQL. Supabase remains a design reference only.

Active implementation branch:

- `release/company-fastapi-postgres`

## Authentication Decision

Choose one:

| Login | Best when | Notes |
| --- | --- | --- |
| Email/password first | Fast pilot with a small known team. | Good for team leader + six members. Internal SSO can be added later. |
| Internal SSO first | Company policy requires it before pilot. | Needs internal identity/infrastructure coordination before app work can finish. |

Recommended first pilot: email/password with one admin account, one team lead account, and six member accounts.

Approved first login route: email/password signup and login. New signups default to `member`; admin permission is assigned separately. Future company internal login or SSO should map into the same user/profile model.

## Permission Decisions Already Reflected

- Admin can manage users, roles, all tasks, all tags, all shared data.
- Team lead can assign and manage team work.
- Members can create and edit their own work.
- Everyone can add tags.
- Only admin can rename or delete tags.
- Personal notes and personal calendar events are private to the owner, with admin support access only when explicitly needed.

## First Production Milestone

Build only the data needed for a shared daily dashboard:

1. Real login.
2. Users and roles.
3. Shared tasks, subtasks, task links, task updates, and change history.
4. Shared tags.
5. Team calendar events.
6. Personal calendar events and notes.
7. JSON export/import retained as an admin backup.

Recurring automation and frozen report snapshots can come after shared task CRUD is stable.

Implementation guide:

- `docs/fastapi-postgres-backend-spec.md`

Reference schema history:

- `supabase/migrations/*.sql`

## Approval Boundary

Do not implement real backend calls until the internal PostgreSQL/FastAPI host, first admin account, and deployment folder are confirmed.

After API connection details are available, the implementation should add an API-backed store beside `src/storage.js` and keep the current local store as a development fallback. The frontend should switch through `VITE_API_BASE_URL`.
