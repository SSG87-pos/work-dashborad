# AGENTS.md

## Operational Commands

- Install/use package manager through the existing local path: `/Users/seulgi/Library/pnpm/bin/pnpm`.
- Start development server: `/Users/seulgi/Library/pnpm/bin/pnpm run dev`.
- Build verification: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`.
- Preview built app when needed: `./node_modules/.bin/vite preview --host 127.0.0.1 --port 4173`.
- Main browser URL during active development is usually `http://127.0.0.1:5173/`.
- Do not use plain `npm`, `yarn`, or global `pnpm` unless the user explicitly changes the toolchain.
- Backend setup after `backend/` exists:
  - `cd backend && python3 -m venv .venv && source .venv/bin/activate`
  - `pip install -e .[dev]`
  - `cp .env.example .env`, then fill real secrets locally.
  - `alembic upgrade head`
  - `uvicorn app.main:app --host 0.0.0.0 --port 18080`
  - `work-dashboard-api seed-first-admin` after `FIRST_ADMIN_PASSWORD` is changed.
  - Backend tests: `cd backend && python -m pytest`
  - API smoke: `curl http://127.0.0.1:18080/api/v1/health` and `curl http://127.0.0.1:18080/api/v1/health/db`.

## Project Context

This is a React/Vite prototype for the `연구기획그룹-전략` shared work dashboard. It prioritizes personal daily briefing, public team workflow, task detail/update logs, tag filtering, timeline/calendar, recurring work, archive, shared memo, performance reporting, local fallback persistence, and FastAPI/PostgreSQL backend persistence.

Tech stack: React 19, Vite 4, lucide-react, motion, localStorage prototype persistence, plain CSS with layered overrides.

## Golden Rules

- Keep `HANDOFF.md` and `TODO.md` aligned after meaningful product, UX, or architecture changes.
- Treat `legacy/prototype.html` as legacy visual reference only. Do not implement new features there.
- Preserve user-approved UI decisions unless the user explicitly asks to revisit them.
- For frontend changes, run the build and verify the rendered app in the browser when practical.
- Do not reserve empty task-detail space before explicit user selection.
- Keep task detail contextual:
  - briefing detail beside `오늘 브리핑`
  - board, timeline, recurring, and archive detail beside the clicked workflow area
  - calendar task detail uses the same common task detail component style.
- Use `src/storage.js` as the local persistence boundary. Do not spread localStorage or future API calls into arbitrary view code.
- Do not claim backend security from UI-only role restrictions.
- Never hardcode secrets or external credentials.

## Design Governance

- Read `DESIGN.md` before changing layout, typography, chips, task detail, briefing, board, timeline, calendar, updates, or performance views.
- If a visual rule in `DESIGN.md` conflicts with rendered behavior, either fix the behavior or update the document in the same change.
- Avoid broad visual refreshes that rewrite many approved surfaces at once. Make targeted changes and verify the affected flow.

## Coding Rules

- Prefer existing helpers in `src/App.jsx` before adding new state or duplicated logic.
- Keep task title display normalized through `displayTaskTitle(task)`.
- Keep progress based on `상세 업무 내용` checklist completion.
- Keep tag behavior shared: everyone can add tags; admin can rename/delete tags.
- Use `word-break: keep-all` behavior for Korean text unless a URL or long token requires breaking.
- Avoid new dependencies unless they are necessary and approved.

## Context Map

- **[Frontend source and interaction rules](./src/AGENTS.md)** — React state, task behavior, CSS layering, and browser QA rules.
- **[Design system and product UI rules](./DESIGN.md)** — Approved visual direction, layout behavior, typography, chips, and component-specific design contracts.
- **[Backend planning docs](./docs/backend-api-spec.md)** — Future API/storage/auth contract reference.
- **[FastAPI/PostgreSQL backend spec](./docs/fastapi-postgres-backend-spec.md)** — Current C3-friendly FastAPI/PostgreSQL backend target, PostgreSQL schema, FastAPI endpoints, and rollout sequence.
- **[Beginner FastAPI/PostgreSQL runbook](./docs/company-fastapi-postgres-beginner-runbook.md)** — Step-by-step company Linux manual for cloning the branch, preparing PostgreSQL/FastAPI prerequisites, and connecting the app after backend implementation.
- **[Permission rules](./docs/permission-rules.md)** — Role and permission model reference.
- **[AI agent readiness](./docs/ai-agent-readiness.md)** — Future read-only HERmes/AI answer and report-generation contract.
- **[AI implementation guide](./docs/ai-agent-implementation-guide.md)** — Beginner-friendly starting point for future OpenAI/HERmes/MCP integration.
- **[AI Codex implementation brief](./docs/ai-agent-codex-implementation-brief.md)** — Developer execution checklist for future Codex implementation sessions.
- **[LLM-Wiki architecture plan](./docs/llm-wiki-architecture-plan.md)** — Future agent-readable Wiki layer over FastAPI/PostgreSQL dashboard data, source links, revisions, and Error Book corrections.
- **[Multi-workspace expansion plan](./docs/multi-workspace-expansion-plan.md)** — Future group/workspace/unit expansion and RLS separation plan.
- **[Personal notification inbox plan](./docs/personal-notification-inbox-plan.md)** — Per-user notification inbox, bell badge, backend permission rules, read/all-read behavior, and Teams-notification boundary.

## Maintenance Policy

- If implementation and these rules drift, update the rules or note the drift in `TODO.md`.
- Current backend implementation target is FastAPI + PostgreSQL in a C3-friendly single-app shape. This means we avoid a Supabase-style multi-container Docker Compose stack, while still allowing the FastAPI app to run either as a normal Python/systemd process or inside one C3-provided container. PostgreSQL should be a separately managed DB/service, not bundled into the same app container for production. `backend/` now has health/db checks, auth/JWT, admin roster create/list/update, task create/list/update/delete, recurring rule persistence, future recurring instance cleanup, status history edit/delete, archive/restore, related links, task posts/categories edit/delete, Highlights post rollups, Canvas state read/save, subtasks, update logs edit/delete, tags/tag groups, dashboard insight filters, workstream similarity suggestions, calendar events CRUD, preferences, memos, briefing-item APIs, personal notifications read/mark-read/mark-all-read with high-signal creation rules, deterministic AI read APIs, and LLM-Wiki APIs for search/read/source links/recommendations/draft list/create/edit/approve/reject/Error Book. The UI includes task-detail Wiki draft creation, admin Wiki recommendation candidates and draft review/edit/approve/reject, a Highlights Wiki search/read surface, DB-backed top insight cards, a DB-backed top bell notification panel in FastAPI mode, and admin DB-evidence workstream cleanup suggestions. `src/apiStore.js` switches the UI into FastAPI mode when `VITE_API_BASE_URL` is set; in that mode local fallback/demo tasks, events, notes, profile overrides, and built-in demo accounts must not hydrate into the company runtime. Live company PostgreSQL apply/smoke, deeper role filtering from real users, Teams/realtime/OpenAI/HERmes, production image/OCR storage, and production security hardening remain later phases.
