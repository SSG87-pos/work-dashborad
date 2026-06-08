# AGENTS.md

## Operational Commands

- Install/use package manager through the existing local path: `/Users/seulgi/Library/pnpm/bin/pnpm`.
- Start development server: `/Users/seulgi/Library/pnpm/bin/pnpm run dev`.
- Build verification: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`.
- Preview built app when needed: `./node_modules/.bin/vite preview --host 127.0.0.1 --port 4173`.
- Main browser URL during active development is usually `http://127.0.0.1:5173/`.
- Do not use plain `npm`, `yarn`, or global `pnpm` unless the user explicitly changes the toolchain.

## Project Context

This is a React/Vite prototype for the `연구기획그룹-전략` shared work dashboard. It prioritizes personal daily briefing, public team workflow, task detail/update logs, tag filtering, timeline/calendar, recurring work, archive, shared memo, performance reporting, and later real login/backend persistence.

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
- **[Permission rules](./docs/permission-rules.md)** — Role and permission model reference.
- **[AI agent readiness](./docs/ai-agent-readiness.md)** — Future read-only HERmes/AI answer and report-generation contract.
- **[AI implementation guide](./docs/ai-agent-implementation-guide.md)** — Beginner-friendly starting point for future OpenAI/HERmes/MCP integration.
- **[AI Codex implementation brief](./docs/ai-agent-codex-implementation-brief.md)** — Developer execution checklist for future Codex implementation sessions.
- **[Multi-workspace expansion plan](./docs/multi-workspace-expansion-plan.md)** — Future group/workspace/unit expansion and RLS separation plan.
- **[Personal notification inbox plan](./docs/personal-notification-inbox-plan.md)** — Future Supabase-backed per-user notification inbox, bell badge, RLS, and Teams-notification boundary.

## Maintenance Policy

- If implementation and these rules drift, update the rules or note the drift in `TODO.md`.
- If a future backend is selected, add backend-specific commands and security rules here.
