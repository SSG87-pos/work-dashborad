# Backend Decision Brief

This brief defines the next approval point for turning the local React/Vite prototype into a shared work dashboard.

## Decision Needed

Choose the first shared-data route:

| Route | Best when | Tradeoff |
| --- | --- | --- |
| BaaS / managed backend | The team wants a usable shared dashboard quickly. | Faster auth/tables, but service account and permission setup are required. |
| Internal API | The dashboard must live inside an existing company system. | Better internal fit, but slower first usable version. |

Recommended first production path: start with a managed/backend-table route unless an internal system requirement is already fixed.

Approved first route: Supabase managed backend with Postgres and Row Level Security.

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

First Supabase migration draft:

- `supabase/migrations/001_initial_dashboard_schema.sql`

Setup guide:

- `docs/supabase-start-guide.md`

## Approval Boundary

Do not implement real backend calls until the actual Supabase project URL and anon key are provided.

After project connection details are available, the implementation should add a Supabase-backed store beside `src/storage.js` and keep the current local store as a development fallback.
