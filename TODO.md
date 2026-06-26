# TODO

## Now

- [x] Add DB-evidence workstream similarity suggestions.
  - Branch: `codex/llm-wiki-architecture`.
  - Files: `backend/app/api/routes_workstreams.py`, `backend/app/schemas/task.py`, `backend/app/main.py`, `backend/tests/test_workstreams.py`, `src/App.jsx`, `src/apiStore.js`, `src/styles.css`, `scripts/check-api-store.mjs`, `DESIGN.md`, `docs/backend-api-spec.md`, `docs/fastapi-postgres-backend-spec.md`, `AGENTS.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added admin-only FastAPI `GET /api/v1/workstreams/suggestions` for similar `상위 업무흐름` candidates using DB-backed evidence from task title, description, tags, updates, task posts, and attachment OCR/vision text.
  - Done: kept the existing title-based local candidate logic as a fallback, then added a `DB 근거 추천` action in `관리자 > 업무흐름 관리` that shows DB/source badges, score, task count, and common terms before a human chooses a merge label.
  - Done: in FastAPI mode, workstream rename now also PATCHes matched UUID-backed tasks so admin cleanup is reflected in the backend instead of only the screen state.
  - Guardrail: suggestions are review-only; no OpenAI/HERmes call or automatic task rewrite is performed.

- [x] Implement LLM-Wiki backend Phase 1 from the AI database assistant branch.
  - Branch: `codex/llm-wiki-architecture`.
  - Files: `backend/app/models/wiki.py`, `backend/app/schemas/wiki.py`, `backend/app/api/routes_wiki.py`, `backend/alembic/versions/20260625_0011_llm_wiki.py`, `backend/tests/test_ai_wiki.py`, `src/App.jsx`, `src/apiStore.js`, `src/styles.css`, `scripts/check-api-store.mjs`, `docs/llm-wiki-architecture-plan.md`, `docs/backend-api-spec.md`, `docs/fastapi-postgres-backend-spec.md`, `AGENTS.md`, `HANDOFF.md`, `TODO.md`.
  - Done: documented the recommended LLM-Wiki shape for this dashboard: PostgreSQL remains the source of truth, Wiki pages are the agent-readable knowledge layer, source links connect back to task/update/post/report records, revisions are append-only, AI changes stay in drafts until human approval, and repeated answer misses go into `wiki_error_book`.
  - Done: clarified that Obsidian should be optional Markdown export/import later, not the central company sync system.
  - Done: added Alembic migration `20260625_0011_llm_wiki.py` for `wiki_pages`, `wiki_revisions`, `wiki_source_links`, `wiki_links`, `ai_wiki_drafts`, and `wiki_error_book`.
  - Done: added FastAPI routes under `/api/v1/ai/wiki/...` for search, page read, link follow, source read, draft create, dashboard-task draft create, admin approval, and Error Book correction create.
  - Done: added `apiDashboardStore.ai.wiki` helper methods so future UI/OpenAI/HERmes integration can use the existing API-store boundary instead of hardcoding endpoint URLs in view code.
  - Done: added a first task-detail `LLM-Wiki 정리` surface. `Wiki로 정리` creates a pending Wiki draft from the selected FastAPI-backed task while leaving local/sample tasks unsynced with a notice.
  - Done: added admin `Wiki 초안` review surface. Admins can list pending drafts, edit the title/type/summary/body before publishing, and approve/publish or reject them through the FastAPI API.
  - Done: added image-evidence plumbing for 업무 노트. Users can paste an image into the note dialog for local/prototype preview, and `attachment.ocrText` plus `attachment.visionSummary` are now included in AI recent-post evidence and LLM-Wiki draft/source excerpts.
  - Done: added a Highlights `Wiki` tab for searching published workstream Wiki pages and reading the selected page body plus source links through the FastAPI Wiki API.
  - Done: kept model-generated changes behind pending drafts and admin approval; no OpenAI/HERmes direct write behavior was added.
  - Verified: `/private/tmp/work-dashboard-backend-venv312/bin/python -m pytest backend/tests` passed with `35 passed`.
  - Verified: Alembic offline SQL rendered through head, `compileall`, `check:api-store`, production build, and `git diff --check` passed.
  - Next: add production image/file storage, automatic OCR/HERmes/OpenAI Vision extraction into the existing attachment fields, and wrap these endpoints as OpenAI/HERmes/MCP tools.

- [x] Start AI database assistant Phase 1 on `codex/ai-agent-db-assistant`.
  - Files: `src/aiEvidence.js`, `src/aiAssistant.js`, `src/App.jsx`, `src/apiStore.js`, `src/styles.css`, `scripts/check-ai-evidence.mjs`, `scripts/check-ai-assistant.mjs`, `package.json`, `backend/app/api/routes_ai.py`, `backend/app/schemas/ai.py`, `backend/tests/test_ai_read.py`, `docs/backend-api-spec.md`, `docs/fastapi-postgres-backend-spec.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added deterministic AI evidence builders for report evidence, person work status, topic search, workstream issues, and recent updates.
  - Done: evidence output includes source task ids/titles, owner names, status, priority, workstream, tags, due date, progress, recent updates, task posts, open subtasks, and explicit/inferred signals.
  - Done: excluded personal notes and private calendar detail from the evidence output by default.
  - Done: added FastAPI read endpoints under `/api/v1/ai/read/...` for report evidence, person work status, topic search, workstream issues, and recent updates.
  - Done: added first-entry-screen `AI 업무 에이전트` panel inside the existing POSLAB Work Hub entry screen. In FastAPI mode it appears after login, not before authentication; in local fallback it appears on the local entry screen. It can answer from local screen data in fallback mode, call FastAPI AI read endpoints when signed in, show evidence rows, and convert registration-style prompts into a human-reviewed 업무 추가 draft.
  - Done: added a top-bar house icon in the dashboard for returning to the POSLAB entry screen without logging out.
  - Verified: `scripts/check-ai-evidence.mjs`, `scripts/check-ai-assistant.mjs`, and `scripts/check-api-store.mjs` passed through the Node REPL runtime.
  - Verified: production build passed with `PATH=/Users/seulgi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`.
  - Verified: browser/CDP QA on isolated local-mode Vite confirmed entry-screen AI panel visibility, dashboard entry, suggested prompt interaction, answer/evidence rendering, registration-draft opening of the 업무 추가 modal, and top-bar house-icon return to the entry screen. In-app Browser attach failed twice, so QA used local Chrome CDP; headless Chrome logged existing WebGL/lanyard errors unrelated to the AI panel.
  - Verified: latest backend verification used `/private/tmp/work-dashboard-backend-venv312/bin/python -m pytest backend/tests` and passed with `36 passed`.
  - Next: wire OpenAI/HERmes tool-calling around the existing evidence/read endpoints and draft-approval flow after company secrets/runtime boundaries are confirmed.

- [x] Reframe backend implementation from Supabase Docker to FastAPI + PostgreSQL.
  - Files: `docs/fastapi-postgres-backend-spec.md`, `docs/company-fastapi-postgres-beginner-runbook.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `docs/backend-implementation-plan.md`, `docs/backend-decision-brief.md`, `docs/company-demo-readiness-checklist.md`, `docs/supabase-start-guide.md`, `docs/company-self-hosted-supabase-guide.md`, `docs/personal-notification-inbox-plan.md`, `docs/ai-agent-readiness.md`, `docs/ai-agent-codex-implementation-brief.md`, `AGENTS.md`, `HANDOFF.md`, `TODO.md`.
  - Done: documented the current company backend constraint that Supabase Docker/self-hosted Supabase is not available.
  - Done: established `FastAPI + PostgreSQL without Docker` as the new active implementation route.
  - Done: added PostgreSQL DDL, FastAPI endpoint contract, auth/permission rules, project structure, deployment outline, validation checklist, and future Codex prompt in `docs/fastapi-postgres-backend-spec.md`.
  - Done: added `docs/company-fastapi-postgres-beginner-runbook.md`, a step-by-step company Linux manual for someone new to FastAPI/PostgreSQL. It covers existing-folder vs new-folder branch checkout, tool installation, frontend check, PostgreSQL setup, backend-after-implementation commands, env files, systemd, troubleshooting, and the next Codex implementation prompt.
  - Done: changed existing backend docs so Supabase is reference/design history only, while FastAPI/PostgreSQL is the active operating target.
  - Done: implemented the first backend skeleton and expanded it through core operating APIs, then added frontend `VITE_API_BASE_URL` API-store wiring for FastAPI mode.

- [x] Implement FastAPI/PostgreSQL backend Phase 1.
  - Target docs: `docs/fastapi-postgres-backend-spec.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `docs/permission-rules.md`.
  - Done: created `backend/` with FastAPI app factory, CORS config, `/api/v1/health`, `/api/v1/health/db`, SQLAlchemy session setup, Alembic config, `users` and `team_roster` models/migration, `.env.example`, and first-admin seed CLI.
  - Done: documented backend setup commands in `AGENTS.md` and updated the beginner runbook from "backend not implemented" to "Phase 1 skeleton exists".
  - Done: implemented initial Phase 2 backend auth/roster surface: `POST /api/v1/auth/login`, JWT access tokens, `GET /api/v1/me`, admin-only `GET/POST /api/v1/admin/roster`, bcrypt password hashing, and pytest coverage for admin/member access.
  - Done: implemented initial Core Tasks backend surface: `GET/POST/PATCH /api/v1/tasks`, `tasks` Alembic migration, task status/priority/work-kind enums, owner/creator links, progress validation, and manager-only update checks for admin/lead/creator/owner.
  - Done: implemented additional backend operating-verification endpoints: subtasks add/list/update, task update logs add/list/edit/delete, tags add/list/edit/delete, tag groups save/list/delete, calendar events add/list/update/delete, and briefing items add/list/update with Alembic migrations and pytest coverage.
  - Done: implemented task lifecycle endpoints for status history, archive/restore, related links, recurring rule persistence, future recurring instance cleanup, post categories, and task posts with Alembic migrations and pytest coverage.
  - Done: implemented the remaining local-verifiable backend surface for task delete, history note edit/delete, task post edit/delete, Highlights workstream post rollups, and Canvas state read/save with Alembic migration `20260625_0007_canvas_state.py` and pytest coverage.
  - Done: added `src/apiStore.js` and `check:api-store`; when `VITE_API_BASE_URL` is set, the app uses FastAPI for auth, read/write dashboard state, tasks, subtasks, updates, posts, tags/tag groups, calendar, preferences, memos, Canvas, roster, and profile/admin updates while preserving the local/Supabase fallback boundary.
  - Verified: backend pytest `30 passed`, `check:api-store` passed, Alembic offline SQL rendered through head, `git diff --check` passed, frontend production build passed, and earlier live `uvicorn` health smoke returned `{"status":"ok","app":"work-dashboard-api","env":"local"}`.
  - Next: run against a real company PostgreSQL instance and tighten deeper role-specific filtering from real-user feedback.
  - Defer: realtime, Teams push, AI model calls, Canvas simultaneous editing, and multi-workspace separation.

- [x] Replace Today Briefing memo with structured My Desk inbox and Team checklist.
  - Files: `src/App.jsx`, `src/storage.js`, `src/supabaseStore.js`, `src/styles.css`, `supabase/migrations/022_briefing_items.sql`, `DESIGN.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `docs/local-linux-supabase-runbook.md`, `HANDOFF.md`, `TODO.md`.
  - Done: My Desk now shows `업무 인박스` instead of a plain memo textarea, with type, title, body, URL, and status fields for mail/meeting/idea/risk/reference/todo/note capture.
  - Done: `업무 인박스` is personal per selected person. My Desk filters by the item's owner, while `팀 체크` remains shared for Team Flow.
  - Done: Team Flow now shows `팀 체크` as compact todo rows; items can be added and checked done. Checked items stay completed until they are edited or deleted from the larger detail dialog.
  - Done: the small briefing area is now title-first and height-aware. It uses the available `오늘 브리핑` side-panel height to show as many recent rows as fit. Writing, long-form reading, editing, and deletion happen in a larger dialog; older rows open through a compact header `전체` list dialog instead of expanding or scrolling inside the side panel.
  - Done: moved the overflow `전체` control beside `추가/기록` in the capture header, so the row list keeps its vertical space. The preview threshold is based on the briefing-side height instead of a fixed 3/4 row count; in very short briefings it can show only two rows before the `전체` dialog.
  - Done: Team checklist rows no longer show a separate `보기` button or inline edit/delete icons. Clicking the title/text box opens the larger detail dialog; both inbox and checklist titles expose native hover tooltips.
  - Done: added local/export/import persistence through `briefingItems`, Supabase read/write support through `briefing_items`, and self-hosted migration `022_briefing_items.sql`. The migration now treats `scope = 'my'` rows as personal owner/author-visible records, while `scope = 'team'` rows remain shared.
  - Verified: `git diff --check`, `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`, and Browser QA on `http://localhost:5174/` passed. My Desk and Team Flow write dialogs both showed the large form and visible `저장` button; no page-level horizontal overflow; console only showed the existing Three/deprecated-parameter warnings. Follow-up browser check confirmed the capture area no longer clips overflow and no inline edit/delete icons remain in the small list. The current browser state had no saved briefing capture rows, so 5+ row rendering and per-person inbox filtering were verified from the code path/build rather than live seeded rows.

- [x] Unify workflow filters across workflow views.
  - Files: `src/App.jsx`, `src/storage.js`, `src/supabaseStore.js`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: `보드`, `리스트`, `타임라인`, `반복 업무`, `보관함`, and `마인드맵` now share tag, owner, priority, and spot filters.
  - Done: added compact owner filtering, including `미지정`, and reduced toolbar filter control widths.
  - Verified: `git diff --check`, `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`, and Browser QA on `http://localhost:5174/` passed. All six workflow tabs showed the same four filters with compact widths; `사람: 미지정` was available; `사람: 소슬기` plus `스팟만` reduced the list to the one matching spot task; `마인드맵` spot filtering reduced task nodes from 11 to 1.

- [x] Add compact table-style task list view.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added `리스트` between `보드` and `타임라인`, with status sections ordered `검토/대기`, `계획`, `진행중`, `완료`, `보류`.
  - Done: status sections start collapsed by default and expand into a compact, low-color table with task title, owner, tags, period, and progress.
  - Done: removed duplicate row-level status chips, moved priority/spot/repeat/schedule markers beside the task title, changed owner cells to name-only lighter text, and lowered tag-chip contrast.
  - Done: aligned all list-row stickers to the same 20px height, center alignment, and line-height so priority, spot, repeat, and schedule chips no longer look uneven. Sticker groups now start from a fixed left edge inside the task column instead of shifting by title length.
  - Done: clicking a list row opens the same workflow-side task detail, and narrow areas keep any overflow inside the table instead of pushing the page.
  - Verified: `git diff --check`, `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`, and Browser QA on `http://localhost:5174/` passed. `리스트` appears between `보드` and `타임라인`; all five status sections start collapsed; `진행` expands to 6 compact rows; rows show no duplicated `진행` chip; owner avatars are removed; `오늘 마감`, `마감 임박`, and `오늘 시작` markers render beside the title; sticker heights measured consistently at 20px; sticker x positions measured consistently at 455px on desktop; no page-level horizontal overflow.

- [x] Show spot work in the mindmap priority position.
  - Files: `src/MindmapView.jsx`, `src/mindmapData.js`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: card-style mindmap task nodes now replace the priority sticker with the same compact `스팟` chip for spot work, while preserving the task's actual priority data.
  - Verified: `git diff --check`, `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`, and Browser QA on `http://localhost:5174/` passed. The spot sample task `회의 직후 공유자료 빠른 정리` rendered with `priorityText: "스팟"` and `.spot-work-chip` in the mindmap node.

- [x] Make board status lanes collapsible by default.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: `검토/대기`, `계획`, `진행중`, `완료`, `보류` lanes now start collapsed and expand/collapse from the lane header.
  - Done: lanes with more than four visible cards expand across the full board width with a responsive card grid, so busy statuses do not stay trapped in a narrow column.
  - Verified: `git diff --check`, `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`, and Browser QA on `http://localhost:5174/` passed. At 1366px, `진행` 6건 expanded across the full board width with a 4-column card grid and collapsed back to 0 visible cards.

- [x] Add spot-work classification and long-period reporting rule.
  - Files: `src/App.jsx`, `src/storage.js`, `src/supabaseStore.js`, `src/styles.css`, `supabase/migrations/021_task_work_kind.sql`, `DESIGN.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added `업무 성격` with `일반 업무`/`스팟 업무`, persisted it locally and through Supabase `tasks.work_kind`, showed spot cards with a calm teal edge, and added a board-level `스팟만 보기` filter.
  - Done: added local fallback sample task `회의 직후 공유자료 빠른 정리` so the spot card, chip, and filter can be checked immediately in demo data.
  - Done: spot tasks keep their real category/tag data for filtering. Board cards show `스팟` only once in the top chip row and do not duplicate it in the card tag row.
  - Done: timeline renders spot tasks differently by replacing the first visible category/tag slot with `⚡ 스팟`; Highlights renders a compact lightning sticker immediately after the task/workstream title and includes `⚡` in Markdown copy/save.
  - Done: weekly/monthly performance reports keep spot work included; quarterly/yearly summaries exclude spot work by default while `이슈/설명 포함 상세실적 보기` includes spot work again for detailed review.
  - Done: fixed modal layering so opening 업무 추가/edit while a timeline overlay is visible brings the modal above the overlay, and removed the small task-count helper line from `오늘 브리핑` rows.
  - Verified: build passed and browser QA on `http://localhost:5174/` confirmed the spot sample card, teal spot styling, `스팟` top chip, and `스팟만 보기` filter.

- [x] Document future personal notification inbox path.
  - Files: `docs/personal-notification-inbox-plan.md`, `docs/supabase-start-guide.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `docs/permission-rules.md`, `AGENTS.md`, `HANDOFF.md`, `TODO.md`.
  - Done: documented the recommended post-Supabase path for per-user notifications: event types, `notifications` table, RLS, least-privilege grants, unread/read state, top bell badge behavior, click-through task navigation, dedupe, validation, and the Teams integration boundary.
  - Guardrail: implementation is intentionally deferred until company FastAPI/PostgreSQL backend, real users, and shared task/update/post persistence are stable. Teams push, real-time push, mobile push, and user-configurable alert rules remain later scope.

- [x] Document future multi-workspace/group expansion path.
  - Files: `docs/multi-workspace-expansion-plan.md`, `docs/supabase-start-guide.md`, `AGENTS.md`, `HANDOFF.md`, `TODO.md`.
  - Done: documented the recommended path after our-team stabilization: keep the current 10-person team scope first, then expand through `workspace_id`, optional `unit_id`, visibility scopes, workspace-specific tags/workstreams/post categories, workspace admin roles, RLS membership filtering, and performance indexes.
  - Guardrail: multi-workspace UI, RLS migration, system-admin screens, and cross-group reporting remain later scope until the current team usage is stable.

- [x] Add Codex-ready AI agent implementation brief.
  - Files: `docs/ai-agent-codex-implementation-brief.md`, `docs/ai-agent-implementation-guide.md`, `docs/ai-agent-readiness.md`, `AGENTS.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a developer execution brief that future Codex sessions can read first to implement Phase 1 without re-deciding architecture.
  - Done: specified required reading order, first target (`report-evidence`), suggested files/functions, deterministic check script, verification commands, acceptance criteria, non-goals, and a ready-to-use future Codex prompt.
  - Guardrail: Phase 1 should build/test the evidence layer only; no OpenAI calls, MCP server, write-back, or secret handling in the first pass.

- [x] Add beginner-friendly AI agent implementation guide.
  - Files: `docs/ai-agent-implementation-guide.md`, `docs/ai-agent-readiness.md`, `AGENTS.md`, `HANDOFF.md`, `TODO.md`.
  - Done: documented the recommended `read-only API first, MCP Tool second` path for OpenAI/HERmes integration in beginner-friendly terms.
  - Done: explained core terms, architecture, first tools, evidence bundle shape, phased implementation plan, PoC choice, security checklist, and what not to implement first.
  - Guardrail: direct Supabase access by AI, service role exposure, write-back actions, personal-note use, and HR/personnel-style judgment remain out of scope.

- [x] Document future read-only AI agent/report-generation readiness.
  - Files: `docs/ai-agent-readiness.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `docs/permission-rules.md`, `docs/backend-implementation-plan.md`, `AGENTS.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a future HERmes/AI-readiness contract for read-only dashboard Q&A, topic/issue search, workstream summaries, and report draft generation.
  - Done: documented evidence-first answer rules, source citation requirements, personal/private data exclusions, issue-signal rules, recommended query tools, report templates, and implementation phases.
  - Guardrail: AI write access, task mutation, private note access, and HR/personnel-style judgment remain out of initial scope.

- [x] Document company Linux local Supabase setup.
  - Files: `docs/local-linux-supabase-runbook.md`, `docs/supabase-start-guide.md`, `HANDOFF.md`, `TODO.md`.
  - Done: reviewed the current Supabase boundary (`src/supabaseClient.js`, `src/supabaseStore.js`, `.env.example`) and migrations `001` through `020`.
  - Done: added a Korean runbook for a company Linux computer covering prerequisites, clone/pull, pnpm install, Supabase CLI init/start/status, local migrations, `.env.local`, app port `10097`, first-admin promotion, same-machine vs LAN Supabase URL behavior, verification, and troubleshooting.
  - Follow-up: migration `020_task_posts.sql` now covers `업무 노트` posts and post-category management. The runbook now marks only real attachment files and confirmed `tasks.workstream` persistence as future shared-data gaps.

- [x] Add Supabase tables for task-detail 업무 노트 posts.
  - Files: `supabase/migrations/020_task_posts.sql`, `src/supabaseStore.js`, `src/App.jsx`, `docs/backend-api-spec.md`, `docs/data-model.md`, `docs/permission-rules.md`, `docs/local-linux-supabase-runbook.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added `task_post_categories` and `task_posts` migration with RLS, authenticated Data API grants, default category seed rows, and task/author indexes.
  - Done: wired Supabase reads so UUID-backed tasks receive `postItems` from `task_posts`, and admin-managed post categories read from `task_post_categories`.
  - Done: wired Supabase writes for post create/update/delete and category save/deactivate while keeping local fallback `postItems` behavior unchanged.
  - Done after approval: live Supabase migration `020_task_posts` was applied to project `nbefvcrcfwacvnohtsmy`.
  - Verified live DB: migration history shows `20260608140147 020_task_posts`; `task_posts` and `task_post_categories` have RLS enabled; 7 active default post categories exist; authenticated-role rollback smoke created, read, updated, and deleted one task post with URL and attachment metadata, then confirmed 0 QA rows remained.
  - Verified live UI: on `http://127.0.0.1:5188/`, Supabase-connected task detail created a test `업무 노트`, reopened it, confirmed body/URL, updated title/body/URL, deleted it, reloaded the dashboard, and confirmed the deleted note stayed gone. Follow-up DB query confirmed 0 leftover UI QA rows.
  - Scope guard: production uploaded images/files still need internal storage bucket/RLS or equivalent. Current `attachment` can carry pasted-image preview metadata and OCR/vision text, but automatic server-side OCR is not implemented yet.

- [x] Document company self-hosted Supabase operating path.
  - Files: `docs/company-self-hosted-supabase-guide.md`, `docs/supabase-start-guide.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a Korean guide explaining demo branch pull, why `main` only contains the current landing/dashboard features after merge, recommended release branch strategy, the separate clone targets for the dashboard repo and official Supabase Docker repo, self-hosted setup outline, migration application options, app env wiring, and remaining production-readiness work.
  - Done: clarified that if company network policy prevents pushing self-hosted changes back to GitHub, the company internal Git repository can become the actual operating source of truth and its `main` can become the production main, while GitHub `release/company-self-hosted` remains the transfer baseline.
  - Scope guard: this is an operating plan/document. It does not install the company self-hosted server or merge the current branch to `main`.

- [x] Add task-detail posts/workstream-feed mockup.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a compact `게시글` button to task detail that opens a read-only mockup panel.
  - Done: same-task older posts stay collapsed inside task detail, while posts from other tasks in the same workstream are reserved for the Highlights `게시글` tab.
  - Done: follow-up mockup moved long reading/writing into larger dialogs and added image attachment thumbnail enlargement inside the post dialog.
  - Done: follow-up retuned the feature from meeting-note-only to general remembered-context posts. The latest three posts now appear directly below `다음 액션 추천`, with a nearby `작성` action, same-task more/less control, and URL field/card mockup support.
  - Done: converted the visible post surface from read-only sample UI into real local/demo task data. Users can write, read, edit, and delete task posts; posts are stored on the task as `postItems` and persisted through the local dashboard snapshot.
  - Done: added admin `게시글 유형 관리` for post category labels, tone colors, and active/hidden state. Renaming a type updates stored task posts that used the previous label.
  - Done: renamed the task-detail surface to `업무 노트`, removed the extra explanatory summary card, changed the write action to `노트 작성`, made `노트 구분` chips visibly selectable with a checked active state, and added emoji insertion to the body textarea.
  - Done: toned down post-category chips. Kept task-detail note reading in a larger dialog because the detail panel is narrow; moved row expand/collapse reading to the Highlights workstream post rollup instead.
  - Done: moved `업데이트 로그` above `관련 링크` and changed it to latest-three by default with a compact more/less control; edit/delete actions remain behind the separate `관리` toggle.
  - Follow-up: Supabase shared persistence is now prepared in `020_task_posts.sql`; live/local Supabase databases need that migration applied before multi-PC posts are shared.
  - Verified: `git diff --check`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:mindmap-structure`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.
  - Browser QA: `http://127.0.0.1:5177/` local fallback opened the task detail, `게시글` button toggled the mockup panel, 1366px layout kept task detail at 410px and the mockup panel at 380px with no page-level horizontal overflow. Console warnings were existing lanyard/Three deprecation warnings.
  - Superseded Browser QA: earlier cross-task workstream-feed expand/collapse checks no longer apply because task detail now only expands additional posts from the selected task.
  - Browser QA title-list follow-up: task detail now shows title-first post rows only; `작성` opens a larger write dialog; clicking a post title opens a larger read dialog; attachment lightbox opens from the read dialog and closes cleanly; no page-level horizontal overflow was detected. Console warnings remained the existing lanyard/Three warnings.
  - Browser QA remembered-context follow-up: `다음 액션 추천` below the selected task shows exactly 3 recent post rows by default, `작성` dialog includes a URL field, read dialog shows a URL card, `업데이트 로그` appears before `관련 링크`, and no page-level horizontal overflow was detected. Console warnings remained the existing lanyard/Three warnings.

- [x] Add Highlights workstream post rollup tab.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a `게시글` tab inside Highlights next to the existing performance report.
  - Done: grouped remembered-context posts by `상위 업무흐름`; each workstream starts collapsed and expands to show post date, original task title, task owner, and post author.
  - Done: follow-up renamed the visible tab/heading to `업무흐름별 게시글 모음`, sorted workstream groups by the latest post date, and removed the duplicated task-detail cross-task workstream surface so task detail stays focused on the selected task's posts.
  - Done: changed expanded group post reading from a larger dialog to inline row expand/collapse and added short sort controls: `날짜`, `사람`, `구분`, `업무`.
  - Product note: the rollup stays inside Highlights because it is a lookup/review surface. Team Flow can later add a lightweight shortcut, but another dense workflow tab beside mindmap is not recommended yet.
  - Browser QA: `http://127.0.0.1:5177/` showed the Highlights `게시글` tab, 8 collapsed workstream groups, 0 rows visible while collapsed, and 10 rows after expanding the first group. Expanded rows included `게시날짜`, `해당 업무`, `담당`, and `게시` information with no page-level horizontal overflow. Console warnings remained existing lanyard/Three warnings.

- [x] Add Markdown export for generated mindmap work structure.
  - Files: `src/MindmapView.jsx`, `src/mindmapData.js`, `scripts/check-mindmap-structure.mjs`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added `MD 저장` to the mindmap header beside `중앙`/`샘플`.
  - Done: current generated work structure exports as `mindmap-active-YYYY-MM-DD.md` or `mindmap-all-YYYY-MM-DD.md` depending on the selected scope.
  - Done: Markdown includes the scope, generated date, total task count, workstream headings, status summaries, connected tags, and each task's status, owner, due date, priority, progress, tags, and classification context.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:mindmap-structure` and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.
  - Browser QA: `http://127.0.0.1:5177/` rendered `MD 저장` in the mindmap header at 1280px with no page-level horizontal overflow. Codex in-app Browser reported that downloads are not supported, so the actual save event could not be observed there; the app uses a standard Blob + anchor download path for normal browsers.

- [x] Add readable/comfortable dashboard viewing mode.
  - Files: `src/App.jsx`, `src/storage.js`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a compact top-bar `넓게/기본` toggle that keeps the current UI direction but widens task detail panels and improves key text sizes for real demo/desktop environments.
  - Done: default detail panels are wider than the previous compact prototype width; `넓게 보기` expands workflow and calendar task detail to 410px at 1280-1366px and up to 460px on wider screens.
  - Done: display-density preference is persisted through a small local display-preference store so it survives refresh in local fallback and Supabase-login modes without adding a DB migration.
  - Done: follow-up readability pass enlarged Updates log text, Highlights performance summary/detail text, and compact mindmap node labels; compact mindmap node width calculation was widened slightly so larger Korean labels do not truncate more aggressively.
  - Verified: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed. Browser QA on `http://127.0.0.1:5177/` verified local fallback entry, top-bar density toggle, Team Flow detail width changing from 368px to 410px at 1280px, My Desk detail at 410px, Calendar task detail at 410px, 1366px detail at 410px, and no page-level horizontal overflow. Console warnings were existing third-party lanyard/Three deprecation warnings.
  - Verified follow-up: Browser QA on `http://127.0.0.1:5177/` measured Updates log body at 13.5px, Highlights weekly detail rows at 13-13.5px, compact mindmap labels at 12.5px with owner at 11px, compact task node width around 277px, and no page-level horizontal overflow.

- [x] Move history/log correction actions behind management toggles.
  - Files: `src/App.jsx`, `src/supabaseStore.js`, `src/styles.css`, `supabase/migrations/019_task_updates_manage.sql`, `DESIGN.md`, `docs/backend-api-spec.md`, `docs/backend-implementation-plan.md`, `docs/data-model.md`, `docs/permission-rules.md`, `HANDOFF.md`, `TODO.md`.
  - Done: `변경 이력` now defaults to the wider 3-column read layout; row edit/delete icons appear only after clicking the compact `관리` button beside the section title.
  - Done: `업데이트 로그` now also has a compact management toggle; update-log edit/delete icons appear only while management mode is active.
  - Done: Supabase store now supports update-log `body` update and row delete through `tasks.updateLog/deleteLog`.
  - Done after approval: live Supabase migration `019_task_updates_manage` was applied to project `nbefvcrcfwacvnohtsmy`.
  - Verified live DB: rollback rehearsal passed; migration history shows `20260607102154 019_task_updates_manage`; `authenticated` has column-level `UPDATE(body)` and table-level `DELETE`; update/delete RLS policies exist for update authors or task managers; authenticated-role rollback smoke updated 1 update-log row and deleted 1 update-log row, then rolled back.
  - Verified local app: `git diff --check`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:canvas-storage`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed. Browser QA on `http://127.0.0.1:5176/` verified default change-history grid has no `관리` column/actions, clicking management reveals history edit/delete actions, clicking update-log management reveals update-log edit/delete actions, no Vite overlay, and no horizontal overflow.

- [x] Add task change-history correction controls.
  - Files: `src/App.jsx`, `src/supabaseStore.js`, `src/styles.css`, `supabase/migrations/018_task_change_history_manage.sql`, `DESIGN.md`, `docs/backend-api-spec.md`, `docs/backend-implementation-plan.md`, `docs/data-model.md`, `docs/permission-rules.md`, `HANDOFF.md`, `TODO.md`.
  - Done: task detail `변경 이력` rows now show compact edit/delete icon actions only for users who can manage the task.
  - Done: editing changes only the history display memo/note, and deleting a history row does not change the task's current status, completion metadata, or due date.
  - Done: Supabase reads history row ids, exposes `tasks.updateHistory/deleteHistory` through the store boundary, and applies update/delete to `task_change_history` rows when the app is signed in.
  - Done after approval: live Supabase migration `018_task_change_history_manage` was applied to project `nbefvcrcfwacvnohtsmy`.
  - Verified live DB: rollback rehearsal passed; migration history shows `20260607100934 018_task_change_history_manage`; `authenticated` has column-level `UPDATE(note)` and table-level `DELETE`; update/delete RLS policies exist and use `private.can_manage_task`; authenticated-role rollback smoke updated 1 history note row and deleted 1 history row, then rolled back.
  - Advisor note: security advisor still reports only leaked password protection disabled; performance advisor reports existing INFO items around Canvas FK indexes and unused indexes, not a new task-history blocker.
  - Verified local app: `git diff --check`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:canvas-storage`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed. Browser QA on `http://127.0.0.1:5176/` verified board and calendar task details show `변경 이력` edit/delete actions after a local status change creates a history row, no Vite overlay, no horizontal overflow, and only existing lanyard/Three deprecation warnings.

- [x] Add selected small animation points 1+3+5.
  - Files: `src/App.jsx`, `src/styles.css`, `docs/mockups/small-animation-point-examples.html`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added one-shot task-card soft pulse on workflow card selection, one-shot status-chip pop on task status changes, and a desktop sidebar active-indicator glide for navigation changes.
  - Guardrail: graph-style additions were intentionally skipped; motion remains tied to user actions and reduced-motion settings disable animation/transition behavior.
  - Verified: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, and `git diff --check` passed. Browser QA on `http://127.0.0.1:5176/` verified nav offset changes, task-card pulse attaches then clears, status-chip pop attaches then clears, no Vite overlay, and board task/status counts render.

- [x] Prototype restrained Animata-style point motion.
  - Files: `src/SharedCanvasView.jsx`, `src/App.jsx`, `src/styles.css`, `docs/mockups/animata-point-motion.html`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added short functional point motion only: Canvas direct-link beam runs once on newly created links, Canvas shared save pill animates only while saving, and Team Members selection gets a one-shot sweep on click.
  - Done: updated the standalone mockup so the Canvas beam visibly travels on the SVG line instead of relying on less reliable CSS offset-path behavior.
  - Guardrail: point motion respects `prefers-reduced-motion` and should stay limited to feedback moments, not looping decorative UI.

- [x] Align local fallback roster with live team-member visibility.
  - Files: `src/data.js`, `HANDOFF.md`, `TODO.md`.
  - Done: changed the local fallback/default `소슬기` profile to `isTeamMember: true` so local prototype/demo mode matches the live Supabase roster where 슬기님 is visible in Team members.
  - Note: local fallback means the built-in prototype/demo state used when Supabase is not configured or not connected.

- [x] Add Canvas todo-list node MVP.
  - Files: `src/SharedCanvasView.jsx`, `src/canvasModel.js`, `src/supabaseStore.js`, `src/styles.css`, `supabase/migrations/017_canvas_node_todos.sql`, `scripts/check-canvas-storage.mjs`, `DESIGN.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a `투두` Canvas template with card-mode checklist rows, item add/delete, editable item text, and completion toggles.
  - Done: checklist items are stored as structured `todoItems` on Canvas nodes and exported to Markdown as checkbox lines.
  - Done: added `canvas_nodes.data jsonb` migration for shared Supabase persistence and future task-detail checklist linking.
  - Done after implementation: live Supabase migration `017_canvas_node_todos` applied successfully.
  - Verified live DB: `canvas_nodes.data` is `jsonb not null default '{}'::jsonb` with `canvas_nodes_data_is_object`; authenticated rollback smoke inserted, updated, and selected `data.todoItems`, then returned QA row counts to zero.
  - Remaining later scope: convert/link Canvas todo items into real task `상세 업무 내용` checklist items.

- [x] Apply live Supabase Canvas shared-storage migration after explicit approval.
  - Files: `src/SharedCanvasView.jsx`, `src/canvasModel.js`, `src/supabaseStore.js`, `src/App.jsx`, `src/styles.css`, `supabase/migrations/016_canvas_shared_storage.sql`, `scripts/check-canvas-storage.mjs`, `DESIGN.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `HANDOFF.md`, `TODO.md`.
  - Done: prepared the shared Canvas storage MVP in code. Signed-in Supabase mode now calls `supabaseDashboardStore.canvas.read/save`; local/offline mode remains `로컬 초안`.
  - Done: added `canvas_tabs`, `canvas_nodes`, and `canvas_links` migration with active-user RLS, manual authenticated Data API grants, audit fields, and reserved `version` fields for later conflict/history work.
  - Done: moved Canvas seed/normalization/Markdown export logic into `src/canvasModel.js` and added `pnpm run check:canvas-storage`.
  - Verified: `pnpm run check:canvas-storage`, `pnpm run check:demo-readiness`, `pnpm run check:import-plan`, `pnpm run check:summary-filter`, `git diff --check`, and `CI=true pnpm run build` passed. The latest build completed in 4.87s with the existing large lanyard vendor chunk warning.
  - Verified: live Supabase `BEGIN ... ROLLBACK` rehearsal for `016_canvas_shared_storage.sql` passed.
  - Done after explicit approval: live Supabase now has `canvas_tabs`, `canvas_nodes`, and `canvas_links`, all with RLS enabled.
  - Done: after the first grant check showed CRUD plus extra table privileges, privileges were narrowed with `revoke all` and re-granted to authenticated as `select, insert, update, delete` only. The local migration file was updated to match this stricter live state.
  - Verified live policies: each Canvas table has active-user SELECT/INSERT/UPDATE/DELETE policies.
  - Verified live grants: authenticated now has only DELETE, INSERT, SELECT, and UPDATE on each Canvas table.
  - Verified live RLS smoke: with `role authenticated` and 슬기님 auth UID, rollback test inserted a tab, two nodes, and a link; updated a node; deleted the link; selected visible rows; and rolled back cleanly.
  - Verified cleanup: post-rollback row counts are `canvas_tabs 0`, `canvas_nodes 0`, `canvas_links 0`.
  - Browser QA note: Supabase-mode browser opened the POSLAB/login screen and had no stored login session, so signed-in shared Canvas click-through could not be tested without entering credentials. Existing console warnings were third-party lanyard/Three deprecation warnings.
  - Browser QA fallback: local fallback mode opened on `http://127.0.0.1:5175/`; POSLAB entry worked, Canvas rendered with `로컬 초안`, 3 starter nodes, no Vite/React error overlay, no horizontal overflow, and adding `QA 공유 저장 확인` increased editable nodes to 4.
  - Company clone prep check: `pnpm run demo:urls` printed current candidates `http://127.0.0.1:5173/`, `http://192.168.45.109:5173/`, and `http://192.168.55.223:5173/`; remote remains `https://github.com/SSG87-pos/work-dashborad.git`.
  - Remaining later scope: live cursors, simultaneous-edit conflict handling, per-node locking, task-linking, and visible change history.

- [x] Document temporary internet URL demo procedure.
  - Files: `docs/internal-port-demo-runbook.md`, `docs/company-demo-readiness-checklist.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a `Temporary Internet URL Demo Option` to the runbook covering Cloudflare Quick Tunnel, ngrok, and Vercel Hobby preview choices.
  - Done: clarified that the default demo path remains internal port/local-network access, while temporary internet URLs can be used for short internal meetings only with example data, no real work data, no sensitive links, and shutdown after the demo.
  - Done: updated the company checklist so internal-port, short tunnel URL, Vercel preview, IT/security review, and real operation are separated by risk and approval level.

- [x] Run current POSLAB/mindmap branch demo-readiness QA.
  - Files: `TODO.md`, `HANDOFF.md`.
  - Done: rechecked the current `codex/poslab-entry-landing` branch after the compact mindmap adjustment.
  - Verified scripts: `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `git diff --check`, and `/Users/seulgi/Library/pnpm/bin/pnpm run demo:urls` passed. Current local URL is `http://127.0.0.1:5173/`; current network candidates are `http://192.168.45.109:5173/` and `http://192.168.55.223:5173/`.
  - Verified browser desktop QA at 1366px: POSLAB entry restored the signed-in session, `Supabase 연결` rendered, real roster showed 6 visible members, Team Flow board, compact mindmap, Canvas, Calendar, Updates, Highlights, and admin management surfaces rendered without horizontal overflow. Admin `사람 관리`, `태그 관리`, and `업무흐름 관리` were verified through a scoped sidebar nav click.
  - Verified browser narrow QA at 820px: Team Flow board, compact mindmap, Canvas, Calendar, and Admin all rendered with no horizontal overflow and no console errors. Console warnings observed during the broader session were existing third-party 3D/lanyard deprecation warnings, not app errors.

- [x] Tighten compact mindmap layout for wider one-line task nodes.
  - Files: `src/MindmapView.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: compact task nodes now render status dot, task title, and owner in one horizontal row; task/group widths grow from title length within a capped range instead of staying at the old narrow fixed width or a too-large fixed minimum.
  - Done: owner/count metadata is right-aligned inside each compact box, while column left edges stay aligned so the map remains orderly.
  - Done: compact layout uses shorter row gaps and tighter column gaps so generated workstreams are easier to scan at once.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:mindmap-structure`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:workstreams`, `git diff --check`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed. Browser QA on `http://127.0.0.1:5173/` verified compact mode rendered the current live workstream node at about 196px and task node at about 293px, kept `nowrap` title behavior without title overflow, right-aligned count/owner metadata, aligned the workstream/task column left edges, and had no horizontal overflow.

- [x] Add a POSLAB entry landing before the dashboard.
  - Files: `src/App.jsx`, `src/PoslabLanyard.jsx`, `src/styles.css`, `vite.config.js`, `package.json`, `pnpm-lock.yaml`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: created branch `codex/poslab-entry-landing` for the entry experiment.
  - Done: added a bright POSCO-inspired radial background, POSLAB/Work Hub heading using the dashboard title-gradient grammar, and a `대시보드로 들어가기` gate before the dashboard body.
  - Done: updated the title kicker to `POSCO`, changed the supporting copy to `함께 보는 업무, 함께 만드는 흐름, 함께 성장하는 팀`, and enlarged the left `연구기획그룹-전략` mark for better visibility.
  - Done: added a lazy-loaded React Bits-style WebGL lanyard card using the original `card.glb` card/clip/clamp structure, with the strap rendered as a logo-free POSCO-blue line and the card face set to the selected `Executive Blue` POSLAB badge direction.
  - Done: kept existing Supabase email/password auth path available when configured; already authenticated users still see the entry gate first and enter the dashboard by click.
  - Done: split the lanyard runtime (`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, `meshline`) into a `lanyard-vendor` Vite chunk.
  - Verified: `git diff --check` and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed. Browser QA on `http://localhost:5174/` verified the entry page appears before the dashboard, the original-model POSLAB lanyard card uses a farther camera distance, keeps a visible sway animation, removes the original strap logo marks, removes the malformed fake border stroke, applies the selected `Executive Blue` card face with restrained text effects, the mobile layout has no horizontal overflow, the auth mode tabs switch correctly, and console errors were 0.

- [x] Add an admin-only management tab for people, tags, and workstreams.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added a sidebar `관리자` tab visible only to admin users and guarded stale non-admin access back to the normal board.
  - Done: moved roster/permission/team-display management into `관리자 > 사람 관리` so the account modal can stay focused on account switching and personal profile edits.
  - Done: added `관리자 > 태그 관리` as a compact Category-folder/tag-file tree with a selected-item editor, task counts, uncategorized tag visibility, add/rename/delete controls, and drag/drop tag movement between Category folders.
  - Done: added Category folder collapse/expand behavior to `태그 관리` so large tag dictionaries can be scanned without every tag row staying open.
  - Done: added `관리자 > 업무흐름 관리` as a compact flow list plus selected-flow editor with status/source-task evidence, included-task rows, similar-flow candidates, and rename-based flow merging.
  - Note: workstream rename is reflected in local/app state now; signed-in shared persistence still needs the future `tasks.workstream` Supabase migration.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:workstreams`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:mindmap-structure`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `git diff --check`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.
  - Browser QA on `http://127.0.0.1:5178/` verified: non-admin 류강묵 cannot see the `관리자` nav and is returned to Team Flow board; admin 소슬기 sees the `관리자` nav; account modal no longer contains the old admin roster section; `사람 관리`, `태그 관리`, and `업무흐름 관리` render; tag/workstream management has no horizontal overflow; monthly Highlights includes the `혁신아이디어` workstream and workstream grouping; 820px admin layout has no horizontal overflow; console errors/warnings were 0.
  - 2026-06-06 follow-up verified on `http://127.0.0.1:5178/`: `태그 관리` renders the new tree/editor UI with 14 draggable tag-file rows and no old `.admin-tag-row` table rows; `업무흐름 관리` renders 8 compact tree rows, shows `포함 업무`, has no old `.admin-workstream-row` card rows, no clipped workstream/task text, no horizontal overflow at 1366px or 820px, and console errors/warnings were 0.
  - 2026-06-06 tag-folder follow-up verified on `http://127.0.0.1:5178/`: first Category folder toggled from `aria-expanded=true` to `false`, visible tag rows changed from 14 to 12, one `.is-collapsed` folder appeared, toggling again restored 14 visible tag rows, no horizontal overflow, and console errors/warnings were 0.
  - 2026-06-06 final tag-tree fix: aligned the `미분류` folder with the same arrow/folder/count grid as normal Category folders so the label no longer truncates and the count pill no longer stretches.

- [x] Clarify workstream grouping in performance reports and remove duplicate task nodes in mindmap.
  - Files: `src/App.jsx`, `src/MindmapView.jsx`, `src/mindmapData.js`, `src/styles.css`, `scripts/check-mindmap-structure.mjs`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: changed long-period performance badge copy from `상위흐름 N건` to `묶인 업무 N건` and added a `포함 업무` line listing the source task titles under each workstream.
  - Done: quarterly/yearly performance cards now hide checklist/detail rows by default and keep the workstream source-task summary as the main evidence. The detailed rows can still be included when `이슈/설명 포함 상세실적 보기` is enabled.
  - Done: changed mindmap rendering to remove the Category bucket layer entirely. The structure is now root → `상위 업무흐름` → individual task nodes, and multi-Category context is kept out of visible node badges.
  - Done: retuned mindmap task chips to use the timeline/status color meaning, restored the existing square priority sticker style for importance, and added compact-mode status dots plus owner names without widening the nodes.
  - Verified: `check:mindmap-structure`, `check:workstreams`, `check:summary-filter`, `git diff --check`, and production build passed. Browser QA on `http://127.0.0.1:5178/` confirmed monthly performance shows `묶인 업무` plus `포함 업무`, no old `상위흐름` label remains, `혁신아이디어 행사 기획` renders as one mindmap task node, console errors/warnings were 0, and horizontal overflow was false.
  - 2026-06-06 chip follow-up verified on `http://127.0.0.1:5178/`: card mode renders status chips such as `status-진행중`, importance as `.priority-square-높음`, no visible `분류` text, 10 task nodes, 222px task-card width, no horizontal overflow, and console errors/warnings 0. Compact mode renders 10 compact task nodes with status dots such as `status-진행중`, owner text such as `류강묵`, 166px width, 42px height, and no horizontal overflow.
  - 2026-06-06 status-dot follow-up verified on `http://127.0.0.1:5178/`: mindmap header shows 5 status legend items (`진행중`, `계획`, `검토/대기`, `완료`, `보류`), legend/status dots render at 8x8, compact mode keeps owner text and no horizontal overflow, and console errors/warnings were 0.
  - 2026-06-06 legend layout follow-up verified on `http://127.0.0.1:5178/`: mindmap controls and status legend are separated into two rows, the legend appears below the controls, 5 legend items render, no horizontal overflow, and console errors/warnings were 0.
  - 2026-06-06 follow-up verified on `http://127.0.0.1:5178/`: mindmap renders 0 Category/tag bucket nodes, 8 workstream nodes, 10 task nodes, includes `혁신아이디어 행사 기획`, and no longer surfaces Category bucket labels as visual nodes. Quarterly performance shows `포함 업무` and `묶인 업무` while rendering 0 checklist/detail rows and 0 description rows by default.

- [x] Add first-pass `상위 업무흐름` grouping for registration, mindmap, and performance reports.
  - Files: `src/App.jsx`, `src/MindmapView.jsx`, `src/mindmapData.js`, `src/workstreams.js`, `scripts/check-workstreams.mjs`, `scripts/check-mindmap-structure.mjs`, `package.json`, `docs/superpowers/plans/2026-06-06-workstreams.md`, `DESIGN.md`, `docs/backend-api-spec.md`, `docs/data-model.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added deterministic title-first workstream recommendation; task registration/editing now shows `상위 업무흐름` and refreshes the suggestion while the user has not manually overridden it.
  - Done: task detail shows compact `상위 업무흐름` metadata; monthly/quarterly/yearly performance reports now summarize work by workstream while preserving source task evidence in Markdown export.
  - Done: workflow mindmap now branches from `상위 업무흐름` first, then Category/tag buckets, while group/tag node clicks still apply existing tag filters.
  - Done: added workflow-shaped mindmap samples, including the `혁신아이디어` flow across completed/current/future tasks, and added a small `샘플` action in the mindmap header for existing saved/live data states.
  - Follow-up: prevented short IME/roman fragments such as `g` from becoming `g 추진`, stopped auto-appending generic suffixes such as `추진` to new title-derived workstreams, changed recommendation timing to run after the 업무명 field loses focus, and moved the explanation into an inline badge beside `상위 업무흐름` with direct-edit guidance.
  - Follow-up: future admin cleanup should be added as `업무흐름 관리` near tag/Category governance, with similar-label review, merge, rename, and ignore actions.
  - Note: Supabase shared persistence for a confirmed custom `workstream` value needs the backend `tasks.workstream` column/migration before it is reliable across reloads in signed-in mode. Local/prototype mode and derived display work now.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:workstreams`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:mindmap-structure`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `git diff --check`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.
  - Browser QA on `http://127.0.0.1:5177/` in local mode verified: app loaded without framework overlay; Team Flow `마인드맵` rendered workstream-first nodes; the `샘플` button was visible and prevented duplicate sample insertion; `혁신아이디어` grouped active sample work as `2건` with deduped `진행중 1 / 계획 1`; console errors/warnings were 0; page-level horizontal overflow was false at 1280px and 820px widths.
  - Browser follow-up on `http://127.0.0.1:5175/` verified the task modal renders inline `상위 업무흐름` help beside the label with the old below-field help removed. Browser text-entry automation hit the in-app Browser virtual-clipboard limitation, so the `g` fragment fix is covered by `check:workstreams`.

- [x] Add an automatic workflow mindmap tab without disturbing existing workflow UI.
  - Files: `src/App.jsx`, `src/MindmapView.jsx`, `src/SharedCanvasView.jsx`, `src/mindmapData.js`, `src/styles.css`, `src/styles/foundation.css`, `vite.config.js`, `scripts/check-mindmap-structure.mjs`, `package.json`, `pnpm-lock.yaml`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added `마인드맵` as a Team Flow workflow tab with a lazy-loaded React Flow `업무 구조` canvas, generated from the current top-level workflow, Category presets, tags, and currently visible tasks.
  - Note: keep the center node compatible with a future `상위 업무흐름` model; Category should remain a branching/filtering axis rather than the only possible conceptual root.
  - Done: split mindmap scope into `현재 진행업무` and `전체 진행업무`. Active work can switch between richer cards and compact boxes; all/historical work uses compact title-first nodes to handle completed/archived volume. Mindmap layout is generated from the current My/Team-visible task list and its container height follows the generated layout so the page grows vertically rather than adding an internal mindmap scrollbar.
  - Done: moved `Canvas` to a separate main sidebar tab below `Highlights`, with internal tabs for multiple freeform thinking/collaboration spaces.
  - Done: tasks that belong to 2+ Category branches can appear in each relevant branch while global counts dedupe by task id; multi-branch task nodes show `공유 N곳`.
  - Done: clicking a group/tag node applies the existing multi-tag filter and returns to the board; clicking a task node opens the same workflow-side `업무 상세` panel without reserving empty detail space before selection.
  - Done: Canvas now starts with only `생각 정리` and supports local draft editing: add local tabs, switch `카드/작게` node size, add compact template nodes, edit node text, delete nodes, drag nodes on a scrollable plane, create child nodes, directly connect existing nodes, show connector lines, auto-arrange the node tree, and export the current tab to Markdown by copy or download.
  - Done: Canvas compact mode is title-only with node action buttons hidden until hover/focus, card mode keeps action buttons visible for easier editing, decorative node icons are removed, parent-child connector lines use a solid style, direct related-node connector lines use a dashed style, and auto-arrange measures the current node-size mode plus subtree height before placing nodes.
  - Done: changed the visible label from `공유 캔버스` to `Canvas` and moved Vite JSX handling to esbuild automatic mode so the local dev server no longer depends on the corrupted Babel package cache.
  - Note: Canvas persistence, task-linking, multi-user collaboration, and backend storage need approval before implementation.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:mindmap-structure`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `git diff --check`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed; browser QA on `http://127.0.0.1:5176/` verified mindmap current/all scope rendering, compact all-work nodes, sidebar Canvas tab, internal Canvas tab switching, node add/edit/drag/delete, no Korean `공유 캔버스` label in the rendered app, no framework overlay, no console errors/warnings, and no horizontal overflow at desktop and 820px.
  - Verified follow-up: Canvas child-node QA on `http://127.0.0.1:5176/` increased editable nodes from 3 to 4, drew one connector path, created `하위 노드`, and `자동 정렬` arranged the child to the right of its parent with no console errors/warnings or horizontal overflow.
  - Verified follow-up: browser QA on `http://127.0.0.1:5176/` confirmed compact Canvas header, scrollable Canvas plane, six template options, smaller node cards, successful `리스크` template node insertion, Markdown copy status/clipboard content, two Markdown export controls, no console errors/warnings, and no page-level horizontal overflow at desktop and `820x720` mobile width. Codex in-app Browser does not support observing download events, so `MD 저장` was not event-verified there.
  - Verified follow-up: browser QA on `http://127.0.0.1:5176/` confirmed Canvas local tab creation, direct existing-node connection, Markdown export including `연결:` metadata, mindmap `작게` node-size mode in `현재 진행업무`, no page-level horizontal overflow, and no console errors/warnings.
  - Verified follow-up: browser QA on `http://127.0.0.1:5176/` confirmed Canvas default tab list contains only `생각 정리`, Canvas `작게` reduces node width from `182px` to `142px`, Team Flow mindmap renders from the visible task list with data-driven `1486px` canvas height and no internal mindmap scrollbar, no page-level horizontal overflow, and no console errors/warnings. My Desk follows the same visible-task path; current demo/filter state had no My Desk mindmap nodes.
  - Superseded follow-up: earlier hidden Canvas node actions were later changed to always-visible actions for easier direct editing; title-only compact mode, restored body/title in card mode, generated mindmap `중앙` return action, no internal mindmap scrollbar, no page-level horizontal overflow, and no console errors/warnings were verified.
  - Superseded follow-up: earlier browser QA confirmed overlap-safe Canvas auto-arrange in both `카드` and `작게` using rendered node-size measurements (`카드` 182x128, earlier `작게` 190x60), 6 editable nodes with 0 overlaps after arrange, solid connector lines, and removal of the decorative top-left node icon. The next QA supersedes the compact width/action policy with `160x40` title-only nodes and hidden actions until hover/focus.
  - Verified follow-up: direct existing-node connection now participates in Canvas auto-arrange as a layout hint without changing parent-child data. Browser QA on `http://127.0.0.1:5176/` connected `상위 업무흐름 후보` to `보고서 관점`, auto-arranged card mode to a 52px horizontal gap with 0 vertical delta and 0 overlaps, then compact mode to title-only `160x40` nodes with hidden actions (`opacity: 0`, `pointer-events: none`) until focus reveals them (`opacity: 1`, `pointer-events: auto`). Parent-child links stay solid and direct related-node links are dashed. Console errors/warnings were 0.
  - Verified follow-up: browser QA on `http://127.0.0.1:5176/` confirmed direct related-node links render dashed (`stroke-dasharray: 6px, 6px`) while parent-child links remain solid (`stroke-dasharray: 0px`), with no body-level horizontal overflow and no console errors/warnings.

- [x] Create project design and agent governance Markdown.
  - Files: `AGENTS.md`, `src/AGENTS.md`, `CLAUDE.md`, `src/CLAUDE.md`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added root agent rules with operational commands, golden rules, design governance, coding rules, and context map; added `src/AGENTS.md` for React/CSS-specific guardrails; added `CLAUDE.md` links; added `DESIGN.md` with approved layout, typography, chip, task-detail, briefing, board, timeline, calendar, updates, performance, tag, and regression rules.
  - Verified: root and nested `AGENTS.md` are under the 500-line limit, `CLAUDE.md` files link `@AGENTS.md`, and the design document consolidates the project decisions currently spread across handoff/TODO and UI iteration notes.

- [x] Refresh design guardrails after final visual polish.
  - Files: `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: documented the latest anti-regression rules for the HOME-like `전체` tag filter, Category filter/edit separation, empty timeline rounded-card styling, multi-day agenda date placement, and calendar event edit form sizing/order.
  - Purpose: prevent future broad style passes from undoing the small design details already approved through iteration.

- [x] Apply a modern UI detail pass without reinstalling the stack.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: added a final design-token/detail-pass layer for calmer surfaces, shared chip styling, clearer board cards, softer detail panel hierarchy, compact tag dictionary, and view-change scroll reset.
  - Fixed: board grid no longer expands underneath the right detail panel; it stays inside the main column and scrolls horizontally.
  - Verified in browser on `http://localhost:5173/`: team board containment, tag area compactness, timeline header/legend/bar visibility, and performance page top alignment.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

- [x] Tighten workflow filter labels and active filter visibility.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: removed repeated `Category:`/`태그:` prefixes from grouped tag filter options, narrowed the tag filter select, and added distinct active styling for tag and importance filters when the value is not `전체`.
  - Verified in browser on `http://127.0.0.1:5191/` at 1366x768: tag options rendered as `전체`, `기획/임원보고`, `KPI` style labels with no repeated prefixes; tag select measured 106px; selecting `기획/임원보고` and `중요도: 높음` applied visible blue/yellow active states, reduced the visible board to 2 matching cards, produced no horizontal overflow, and console errors/warnings were 0.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.52s`).

- [x] Collapse the workflow tag library by default.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: changed the tag library below workflow filters into a compact collapsed panel with Category/tag counts, selected-filter context, and a visible `펼치기`/`접기` control; full Category chips, tag chips, and admin add/edit controls render only when expanded.
  - Verified in browser on `http://127.0.0.1:5191/` at 1366x768: initial tag library rendered collapsed at 52px height with `aria-expanded=false`, no Category/tag chip buttons mounted while collapsed, selected filter context remained visible in the header, clicking `펼치기` expanded to 166px with Category 4 and tag chips 15 visible, clicking `접기` returned to the 52px collapsed state, no horizontal overflow, and console errors/warnings were 0.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.38s`).

- [x] Convert expanded tag library to a Category tag map.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: replaced the expanded tag chip cloud with compact Category rows. Each row shows the Category name, tag count, representative tags, and only shows `+N개/더보기` when a row has more tags than the preview can show.
  - Follow-up: reduced the Category button footprint inside each row and restored the previous visual rule that tags inside a Category carry the same subtle border-color family as their Category.
  - Done: Category row clicks still filter by the Category preset, individual tag clicks filter by that tag, and admin add/edit controls remain available without dominating the first page.
  - Verified in browser on `http://127.0.0.1:5173/`: collapsed tag library stayed compact; clicking `펼치기` showed 4 Category rows (`기획/임원보고`, `전략/투자`, `조사/근거`, `운영/KPI`) with grouped tags; current short rows did not show unnecessary `더보기`; scoped `월간보고` click set the tag filter to `월간보고`; reset to `전체`; no horizontal overflow; console errors/warnings were 0.
  - Verified follow-up in browser on `http://127.0.0.1:5173/`: Category buttons measured 120x27px, rows measured 71px high, no horizontal overflow, console errors/warnings 0, and each Category/tag pair kept matching color-family borders.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.63s`).
  - Verified follow-up: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.60s`) and `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter` passed.

- [x] Change tag filtering to multi-select from the expanded tag map.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`, `docs/backend-api-spec.md`.
  - Done: changed the compact top tag filter from a single-select menu into an opener/status button showing `태그: 전체` or `태그: 선택됨 N개`.
  - Done: expanded tag library clicks now toggle multiple tags; Category buttons toggle all tags in that Category, individual tag chips toggle one tag, partial Category selection is visually distinct, and `전체` clears all selected tags.
  - Done: selected tags use OR filtering so users can broaden the board/timeline/recurring/archive view by clicking several relevant tags.
  - Follow-up: separated admin tag editing from tag selection. Clicking a single tag now only applies the filter and shows a `태그 수정` action; the rename/delete panel opens only after that explicit action.
  - Verified in browser on `http://127.0.0.1:5173/`: opening the tag filter revealed the tag map, selecting `월간보고` and `KPI` changed the top control to `태그: 선택됨 2개`, active chips and a partial Category state rendered, `전체` reset the control to `태그: 전체`, no console errors/warnings appeared, and horizontal overflow stayed false.
  - Verified follow-up in browser on `http://127.0.0.1:5173/`: clicking `월간보고` produced `태그: 선택됨 1개` with active chip and `태그 수정` button, edit panel count stayed 0 until `태그 수정` was clicked, then one edit panel opened with `월간보고 태그 이름 수정`; `전체` cleared active tags and closed the edit panel; no horizontal overflow, console errors/warnings 0.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.60s`).

- [x] Simplify the common top header.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: removed the repeated page subtitle below `Strategy Work Hub` across all tabs and increased the title to a compact 24px header.
  - Verified in browser on `http://127.0.0.1:5191/` at 1366x768: topbar title rendered as `Strategy Work Hub` at 24px with 48px topbar height, subtitle `<p>` was absent, old My/Team explanatory strings were absent after switching through My Desk, Team Flow, Calendar, Updates, and Highlights, no horizontal overflow, and console errors/warnings were 0.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.43s`).

- [x] Turn top insight cards into compact action filters.
  - Files: `src/App.jsx`, `src/styles.css`, `src/summaryFilters.js`, `scripts/check-summary-filter.mjs`, `package.json`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: kept the number-first card structure, added quieter zero-card styling, added small `보기 →` actions for nonzero cards, wired card clicks to reset tag/priority/search filters, switch to board, and apply the matching summary cohort (`진행/3일 내 마감/지연/완료`), then tightened the card grid so status copy/action text uses the right-side empty space instead of increasing card height.
  - Verified with `pnpm run check:summary-filter`: open, soon, overdue, and completed helper criteria passed.
  - Verified in browser on `http://127.0.0.1:5191/` at 1366x768: Team Flow rendered 4 action cards with `보기 →`; clicking `지연 업무` showed `요약: 지연 업무`, reset tag/priority/search to `전체/전체/""`, and filtered board to 2 delayed cards; clearing the summary pill restored 9 cards; My Desk showed 0-count cards as quiet `aria-disabled=true` cards while nonzero cards kept `보기 →`; no horizontal overflow, and console errors/warnings were 0.
  - Follow-up density QA: at 1366x768 and 1280x720, all four insight cards measured 68px tall with no internal overflow and no horizontal overflow; `지연 업무` click still showed `요약: 지연 업무` and filtered to one visible task in the current local fallback data.
  - Follow-up hover copy QA: insight hover panels now omit repeated summary titles such as `팀 진행 업무` and show only relevant task rows; Team Flow focus/hover rendered 5 task rows with no hover-title `strong`.
  - Follow-up label/scroll QA: label weight under the insight number is now `680` instead of black-weight bold, and clicking `팀 진행 업무` auto-scrolled the board from `top=684px` to `top=12px` while preserving the `요약: 진행 업무` filter and 8 visible board cards.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.54s`).

- [x] Reduce excessive timeline bottom space from tooltip handling.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: moved timeline task hover/focus preview out of the scroll grid into a fixed floating overlay and reduced timeline grid bottom padding to 8px.
  - Verified in browser on `http://127.0.0.1:5191/` at 1366x768: timeline grid bottom padding measured 8px, blank space below the last row measured 8px, inline `.timeline-tooltip` count was 0, fixed `.timeline-floating-tooltip` appeared on row focus with z-index 999, no horizontal overflow, and console errors/warnings were 0.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.35s`).

- [x] Convert archive view to sectioned table/list for accumulated records.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: replaced archive card rows with sectioned tables, separated `완료 업무` and `보류 업무`, kept empty section guidance, and made held-task copy explicit that restore returns it to the main `보류` column before any later status change.
  - Done: added a local prototype `데모 데이터 채우기` control so accumulated archive tables can be reviewed with demo completed/held records.
  - Done: added category as a compact table column, removed the redundant status column, made archive rows denser, added collapsed owner/period filters for Team Flow, and made completed/held sections start collapsed by default.
  - Verified in browser on `http://127.0.0.1:5191/`: Team Flow showed `보관함 21`, completed/held sections defaulted to 0 visible tables, clicking completed opened one 13-row table, status column stayed removed, category column stayed present, table width stayed inside the page with no horizontal overflow, and console errors/warnings were 0.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.45s`).

- [x] Re-check and stabilize the task-detail header/action layout.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: widened the right detail column, removed absolute action positioning, stretched the detail header/title grid, wired `body[data-page]`/`body[data-view]`, and changed task selection scroll to show the detail header instead of landing mid-card.
  - Verified in browser on `http://localhost:5173/`: 진행중 detail action alignment, 완료/read-only detail alignment, header visibility after card selection, and removal of board recurring suffix text.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

- [x] Restore user-approved visual intent after the broad modern UI pass.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: softened timeline bars to match the status legend, added square priority stickers to task detail, tightened detail title/tag spacing, made detail progress/subtasks/links/logs more readable, reduced the quick update submit button, moved the tag permission note next to the tag title, changed performance roles to plain text, added a person filter to performance reports, unified status labels with small emoji stickers, and made calendar task clicks reuse the common `업무 상세` component.
  - Verified in browser on `http://localhost:5173/`: calendar task opens common `업무 상세`, selected board task scrolls the right task detail to top, detail progress is 13px with visible percent, quick update button is 58x34, timeline bars use soft status colors, weekly performance status labels are compact square chips, timeline date axis sits above the first row, timeline legend-to-axis gap is 0, performance person filter is present, and board/detail/performance status labels use `⏳ 검토`, `📝 계획`, `⚙️ 진행`, `✅ 완료`, `⏸ 보류`.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

- [x] Tighten board card chips and permission-only actions.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: removed board card description text, matched board card sticker heights to tag chips, hid the status-change footer for tasks the signed-in user cannot manage, and grouped archive/edit icons tightly on the right.
  - Verified in browser on `http://localhost:5173/`: card chip and tag heights are both 21px, non-manageable cards have no disabled status selector/footer, and manageable card action buttons sit together with a 6px gap.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

- [x] Finish remaining task-detail visual QA.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Verified in browser on `http://localhost:5173/`: `검토/대기`, `계획`, `진행중`, `완료`, `보류`, and archived task detail states.
  - Result: `업무 상세` label stayed left, action icons aligned to the card right edge, stickers did not overlap actions, titles used available width, and Korean titles kept `word-break: keep-all`.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

- [x] Decide contextual task-detail placement instead of one global sticky panel.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Decision: briefing selections keep the right detail panel beside the `오늘 브리핑`; workflow selections move the detail panel into the selected work area.
  - Done: added `detailContext`, kept briefing detail in the original right column, rendered board detail beside the board in a sticky workflow column, and rendered timeline/recurring/archive details below their view.
  - Verified in browser on `http://localhost:5173/`: briefing group detail top aligns with briefing panel, board card detail top aligns with board view and uses sticky positioning, and returning to `오늘 브리핑` resets to the briefing-side detail.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

- [x] Continue local accessibility/keyboard QA.
  - Files: `src/App.jsx`.
  - Checked: unnamed visible buttons/inputs, task modal controls, update forms, and performance export controls.
  - Fixed: added dialog metadata to the task modal, aria labels for detail checklist checkboxes, and aria labels for performance option checkboxes.
  - Verified: visible unnamed controls are 0 in audited surfaces, `:focus-visible` styling exists, update cards expose current status badges, and build passed.
  - Note: automated Tab traversal in the in-app browser did not move focus reliably; the later Chrome keyboard walkthrough covered the required real-browser pass.

## Next

- [x] Run one keyboard-only walkthrough in a real browser before production handoff.
  - Check Tab/Shift+Tab order through sidebar, board cards, task detail actions, task modal, tag controls, calendar details, update forms, and performance copy/save controls.
  - Expected: focus indicator is visible, no focus trap except intentional modal behavior, and Enter/Space operate buttons/selects predictably.
  - 2026-06-06 automated pre-check: verified rendered app identity, no console warnings/errors, visible focusable controls, sidebar/page switching, task modal open/close, calendar legend, updates scope controls, and performance copy/save surface in the in-app browser.
  - Fixed during pre-check: task modal now moves initial focus to the `업무명` input when opened.
  - 2026-06-06 Chrome walkthrough: actual Chrome key events moved focus through tag controls with visible focus rings; Shift+Tab moved backward; Enter activated `Team Flow`, `업무 추가`, first board card, `Calendar`, first calendar event, `Updates`, `Team`, and `Highlights`.
  - Verified: task modal initial focus landed on `업무명`; Tab moved to the next modal control; board card opened contextual detail; calendar event opened common task detail in the calendar panel; updates showed 6 cards; performance view showed weekly report with copy/save controls; console errors/warnings were 0.
  - Note: Safari was not separately checked; Chrome satisfies the one real-browser walkthrough requirement.

- [x] Clean up `src/styles.css` layering.
  - Current risk: many late override blocks make small layout changes easy to regress.
  - Update: final UI detail and contextual detail layers now stabilize the visible surface, and the first cleanup pass grouped the context-detail, calendar-detail, weekly-performance, and final timeline-scroll layers while removing a duplicate `timeline-grid` declaration.
  - 2026-06-06 cleanup pass: removed unused legacy calendar mini task-detail selectors (`calendar-task-detail-card`, `calendar-mini-section`, `calendar-log-row`, related tag/link rules), unused recurring sticker remnants (`recurring-mini`, `detail-recurring-chip`), and duplicate earlier calendar legend/holiday declarations now covered by the later calendar layer.
  - 2026-06-06 follow-up cleanup: removed unused legacy assignment/leader panel selectors, old updates feed/owner-chip styles, stale profile emoji row styles, and dead detail/timeline/filter helper selectors that no longer appear in JSX.
  - 2026-06-06 second follow-up cleanup: removed stale tag preset member, agenda task meta, recurring badge, status-select, and timeline legend text-only remnants; remaining unmatched class names are mostly dynamic report/tag/status classes.
  - 2026-06-06 third follow-up cleanup: removed stale `recurring-rule-grid`, `selected-tag-list`, `tag-name-button`, and `tag-filter-chip.editable` selectors after confirming current JSX uses `recurring-config-card` and `tag-option-grid`.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.
  - Browser QA on `http://127.0.0.1:5191/`: board rendered 9 task cards with legacy nodes 0, updates rendered 2 columns and 6 update cards with legacy feed nodes 0, calendar rendered legend/detail panel with console errors/warnings 0.
  - Browser QA on `http://127.0.0.1:5191/`: task modal rendered 14 tag option buttons, no `selected-tag-list`, weekly recurrence showed `recurring-config-card` with 7 weekday buttons, no `recurring-rule-grid`, and console errors/warnings were 0.
  - 2026-06-06 structural split: moved Tailwind/theme/focus setup into `src/styles/foundation.css` and pre-base interaction/legacy override rules into `src/styles/pre-base-overrides.css`; `src/main.jsx` now imports CSS in the preserved cascade order (`foundation`, `pre-base-overrides`, then `styles.css`), reducing `src/styles.css` by 1,174 lines without reordering visual rules.
  - Audit result: exact duplicate rule blocks and duplicate declarations inside the same rule are 0; remaining repeated selectors are intentional cascade overrides or dynamic status/tag/report classes, so further feature-by-feature splitting should be treated as a larger refactor rather than a safe cleanup pass.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.43s`).
  - Browser QA on `http://127.0.0.1:5191/`: app identity loaded, board rendered 9 task cards, briefing rendered 5 rows, tag chips rendered, legacy nodes remained 0, and console errors/warnings were 0.
  - Browser interaction QA on `http://127.0.0.1:5191/`: board task click opened workflow-side `업무 상세`, timeline had no reserved detail before selection, calendar legend/order stayed `팀 일정 > 개인 일정 > 업무 일정`, calendar task click opened common task detail with no legacy mini-card, updates rendered 2 columns and 6 cards, performance weekly report rendered 9 cards with copy/save controls, and console errors/warnings were 0.
  - Responsive QA at 820px viewport: no horizontal overflow, legacy nodes remained 0, and console errors/warnings were 0; viewport was reset after testing.
  - Verified in browser on `http://localhost:5173/`: briefing detail stays beside briefing, board card detail moves beside the board with sticky positioning, timeline detail renders below the timeline, and console errors/warnings are 0.

- [x] Make task-detail next-action rules configurable.
  - Current helper: `nextActionForTask(task)` in `src/App.jsx`.
  - Done: split recommendation context from a `nextActionPolicies` policy/template list so phrasing can be tuned by state without editing the detail view.
  - Verified: build passed, detail callout still renders `다음 액션 추천`, and console errors/warnings are 0.

- [x] Add richer saved filter/group presets using tags.
  - Examples: `기획보고`, `임원보고`, `자료조사`, `전략과제`, `KPI`.
  - Done: added tag filter presets for `기획/임원보고`, `전략/투자 묶음`, `조사/근거 묶음`, and `운영/KPI 묶음`; presets work in both the filter select and tag panel without becoming editable tags.
  - Verified in browser: `기획/임원보고` reduced the board from 9 cards to 3 relevant report cards, showed `기획보고 · 임원보고`, and console errors/warnings were 0.

- [x] Prepare the backend approval boundary.
  - Files: `docs/backend-decision-brief.md`, `docs/backend-api-spec.md`, `docs/backend-implementation-plan.md`, `docs/data-model.md`, `docs/permission-rules.md`, `src/storage.js`, `src/App.jsx`.
  - Done: added a backend decision brief, aligned tag permission rules across docs, and introduced `localDashboardStore` as the local storage boundary for a future API-backed store.
  - Verified: conflicting tag-permission wording no longer appears in docs, app load/performance page buttons render in browser, console errors/warnings are 0, and build passed.

- [x] Add update scope switching.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: updates tab now has `My` and `Team` controls; `My` includes tasks assigned to the selected person or logs written by that person, while `Team` shows all non-completed, non-archived tasks with logs from the last 7 days.
  - Verified in browser: `Team` showed 6 cards, `My` showed 2 cards, help text changed by scope, console errors/warnings were 0, and build passed.

- [x] Polish explanatory text weight and briefing alignment.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: aligned briefing due labels to one fixed start point, removed empty due cells, softened explanatory/help text weights, added a shared info marker to the calendar helper, softened task-detail description/next-action text, and gave tag bundle presets subtle border-color grouping.
  - Verified in browser: briefing due labels all started at the same x-position, empty due cells were 0, tag note weight was 650, task description weight was 600, calendar helper showed `ⓘ`, console errors/warnings were 0, and build passed.

- [x] Restore briefing content width and calm down dense typography.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: gave the briefing list priority width before the side widgets, narrowed the due-label column to 34px, rendered selected tag-bundle members as the same chip format as normal tags, softened update/performance/timeline helper text weights, lowered board-card date weight, and retuned `상세 업무 내용` heading with a compact checkbox emoji marker.
  - Verified in browser: team briefing task titles no longer collapsed, due labels aligned at one right column, tag bundle member chips matched individual tag chips, update/performance/timeline text weights were calmer, board dates were non-bold, task-detail subtask heading rendered at 13.5px/680, console errors/warnings were 0, and build passed.

- [x] Tighten detail metadata, briefing density, update headers, and in-flow tab scrolling.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: reduced task-detail metadata row height and typography, made 1-item briefing rows shorter than 2-item rows, restored the today queue/agenda/memo widgets to compact sizing, moved update tags beside status in the title row, removed duplicated active-preset member tags from the bundle row, and stopped board/timeline/recurring/archive tab switches from forcing page scroll to top.
  - Verified in browser: 2-item briefing rows measured 61px and 1-item rows 54px, memo textarea measured 64px, update status and tags shared one row, active bundle member duplicates were 0, detail metadata rows measured 28px with 10.5/11.5px text, board-to-timeline switching preserved scroll instead of resetting to top, console errors/warnings were 0, and build passed.

- [x] Unify tag chip grammar and resize briefing side widgets.
  - Files: `src/styles.css`.
  - Done: doubled the compact briefing-side columns to 400px each in the tested desktop layout, fixed the red briefing due-label column to 44px, added a final shared tag-chip contract for briefing, board, detail, update, tag dictionary, and task form chips, and lowered board status/tag chip font weights.
  - Verified in browser: briefing-side columns measured `400px 400px 400px`, all red due labels shared one left and right edge, tag chips across briefing/board/detail/tag dictionary measured 22px high with 999px radius and 520 font weight, task status chips were non-bold, console errors/warnings were 0, and build passed.

- [x] Fix wide-screen briefing side widget sizing.
  - Files: `src/styles.css`.
  - Done: corrected the wide-screen briefing grid so `오늘 업무 큐`, `오늘 일정`, and `내 메모` receive a larger right-side area instead of being squeezed into a narrow 300px column.
  - Verified in a 1920px-wide browser viewport: briefing content columns measured `460px 900px`, side widget columns measured `289px 289px 289px`, each queue/agenda card measured 289px wide, console errors/warnings were 0, viewport was reset after testing, and build passed.

- [x] Rebalance briefing as exact half-and-half layout for desktop/tablet.
  - Files: `src/styles.css`.
  - Done: replaced the oversized wide-screen exception with a stable desktop/tablet rule: the briefing block is split into two equal columns, and the right half is split into three equal columns for `오늘 업무 큐`, `오늘 일정`, and `내 메모`.
  - Verified in browser: at 1920px, briefing columns measured `641.5px 641.5px` and side columns `202.8px` each; at 1180px, briefing columns measured `447.5px 447.5px` and side columns `137.5px` each; memo textarea stayed inside its parent; D labels shared one left/right edge in both viewports; viewport was reset and build passed.

- [x] Clarify briefing meanings and set 55/45 briefing balance.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: changed `오늘 시작할 업무` caption to `오늘이 시작일인 업무`, changed `오늘 집중 업무` caption to `중요도 높은 업무`, added `우선순위·마감 기준 자동 추천` under `오늘 업무 큐`, made the left briefing list 10% wider than the right side, and let the memo textarea stretch vertically inside its column.
  - Verified in browser at 1920px: briefing columns measured `705.6px 577.4px`, D labels shared one left/right edge, all briefing captions were unclipped, memo textarea height expanded to 226px and stayed inside its parent, console errors/warnings were 0, viewport was reset, and build passed.

- [x] Remove today queue and set briefing to 65/35 layout.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: removed `오늘 업무 큐`, changed the briefing split to left 65% and right 35%, split the right side into `오늘 일정` 15% and `내 메모` 20%, and moved task assignee into the agenda first line as `업무/장형민`.
  - Verified in browser at 1920px: briefing columns measured `833.9px 449.1px`, right columns measured `182.6px 243.5px`, `오늘 업무 큐` text was absent, agenda first line was `업무/장형민`, agenda meta was `진행중 · 67%`, D labels shared one left/right edge, console errors/warnings were 0, viewport was reset, and build passed.

- [x] Add board priority filter and retune dense dashboard typography.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: added a board-only importance filter (`중요도: 전체/높음/보통/낮음`), persisted it with dashboard state, showed task status as a small chip in `오늘 일정`, fixed the briefing due-label rail, widened the account button enough for one-line name/role display, and softened board guide/card/detail metadata font weights.
  - Verified in browser at 1920px: team briefing due labels all shared right edge `1057`, priority filter reduced 9 cards to 3 `높음` cards and restored to 9 on `전체`, today agenda showed `업무/장형민` with `⚙️ 진행`, account identity had no horizontal clipping (`scrollWidth === clientWidth`), and build passed.

- [x] Fix shared memo, repeat markers, card chip density, and briefing due alignment.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: renamed `내 메모` to `메모`, first moved memo storage into a shared memo model, made the memo textarea grow with content, capped `오늘 일정` with internal scrolling, added a recurring task count beside `반복 업무`, removed the orange repeat sticker box across board/detail/timeline/legend, reduced board chip/initial badge density, and softened status-history typography. Memo storage was later refined to page-scoped `memoByPage` in the next item.
  - Verified in browser: 1920px and 1180px team briefing due labels shared one left/right rail, recurring tab showed `반복 업무 4`, memo label was `메모` with `field-sizing: content`, long memo input increased textarea height, today agenda had internal scrolling, repeat markers had transparent background and 0px border, board chips measured 19px high with 520 weight, status-history rows used 11.5px/520-560, console errors/warnings were 0, and build passed.

- [x] Retune briefing side panel, page-scoped memo, agenda status, and board filters.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: changed memo storage to `memoByPage` so `오늘 브리핑` and `전체 업무흐름` each have an independent shared memo, split the briefing area into 60% task flow and 40% side panel with `오늘 일정`/`메모` at equal width, let agenda/memo height follow briefing content before internal scrolling, moved agenda status to the first line with no progress percentage, showed overdue due-day tasks as `계획대비 지연`, moved board repeat markers to the task-title row, removed the confusing priority-filter square icon, tightened tag/priority filter spacing, reduced lane-title weight, and fixed the visible D-label rail by left-aligning the text inside a fixed-width due column.
  - Verified in browser at 1920px: account identity did not clip, briefing columns measured `769.8px 513.2px`, side columns measured `244.1px 244.1px`, due labels (`D-1`, `D-14`, `오늘`, `D+2`, `D+1`, `D-3`, `D-6`) all started at the same x-position in a 48px rail, agenda status rendered as `계획대비 지연` without progress text, memo values stayed independent between the personal and team pages, board repeat markers appeared in card titles only, priority icon was absent, filter gap measured 8px, lane title weight measured 560, and build passed.

- [x] Clarify agenda density, calendar due semantics, detail risk stickers, and performance controls.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: reduced `오늘 일정` item height after removing the old third-line progress text, labeled calendar task entries as `업무 종료일` with a note that they represent planned task end dates, added task-detail schedule stickers such as `계획대비 지연`, tightened calendar task-detail status-history columns, renamed the performance export option from `근거 업무 포함` to `원문 근거 줄 포함` with a tooltip explaining that it only affects copied/saved Markdown source lines, and aligned monthly/quarterly/yearly performance detail labels with compact icon labels.
  - Verified in browser preview at 1920px: team briefing agenda item measured about `44.6px` high, all due labels shared the same `left 944.8px / width 48px` rail, calendar legend read `업무 종료일` plus `ⓘ 업무 일정은 계획된 업무 종료일 기준입니다.`, task detail showed `계획대비 지연` for the active due-day task, monthly performance labels measured 48px wide with flex alignment, viewport was reset, and build passed.

- [x] Improve sticker/readability wording and calendar history layout.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: reduced sticker font weights across task/detail/tag/calendar/performance chips, changed the calendar legend order to `팀 일정 -> 개인 일정 -> 업무 일정` and renamed the task legend from `업무 종료일` to `업무 일정`, made the personal briefing greeting time-aware, improved sidebar nav text contrast/weight, softened team-role text, increased account-button vertical breathing room to avoid top clipping, renamed the performance export option to `저장/복사용 전체 데이터 포함`, removed update-log `진행` rows from performance detail output, and tightened calendar task-detail history columns so `처리내용` stays inside the table.
  - Verified in browser preview at 1920px: calendar legend order and note rendered correctly, calendar legend chip weight measured 540, sidebar nav text measured 560/620 active, team-role text measured 500, account identity measured `clientHeight === scrollHeight === 20`, performance export option showed `저장/복사용 전체 데이터 포함`, performance rows no longer included `진행`, and a May completed task's calendar-side history row used columns `58px 38px 161px` with `완료 처리` in column 3. Build passed and the preview server was stopped.

- [x] Make task detail open only from explicit task/briefing selection.
  - Files: `src/App.jsx`.
  - Done: separated `isDetailOpen` from `selectedTaskId`, added close buttons to task detail and briefing bundle panels, closed task detail on workflow/full-page tab changes, kept timeline task details below the timeline, moved recurring/archive task details into the same right-side sticky column behavior as board cards, and made briefing clicks return to `board` before opening the briefing-side detail panel.
  - Done: adjusted work-hour greeting logic around the 07:00-18:00 workday, renamed `저장/복사용 전체 데이터 포함` to `저장/복사 시 전체 데이터 포함`, and renamed `긴 기간 이슈/내용` to `이슈/설명 포함 상세실적 보기`.
  - Verified in browser preview: recurring view showed no detail before click, recurring task click opened a right sticky detail with close button, close hid it, timeline view showed no detail before click and opened a below-timeline wide detail after task click, clicking a briefing card while on timeline switched back to `board` and opened the right briefing detail, board card click opened the right sticky detail, viewport was reset, preview server was stopped, and build passed.

- [x] Remove reserved empty detail space and align timeline detail with workflow detail.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: made the main dashboard grid full-width by default, added `briefing-detail-mode` only when briefing-side detail is open, wrapped the timeline view in the same workflow context grid used by board/recurring/archive, and removed the below-timeline wide detail rendering path.
  - Done: updated personal greeting copy so 07:00-09:59 keeps a warm morning greeting, 17:00 onward uses a wrap-up tone, and personal greetings can include overdue/due/start/focus hints from the current briefing.
  - Done: increased calendar-side change-history typography from the overly small compact style to `11.5px` while keeping the table narrow enough for the side panel.
  - Verified in browser preview on `http://127.0.0.1:4174/`: board and timeline initial states used one full-width grid column, timeline task click created a `1325px 340px` workflow grid with right-side task detail, `.workflow-detail-wide` was absent, calendar history rows measured `11.5px`, browser console errors/warnings were 0, and build passed.

- [x] Restore approved detail/briefing typography and add inline link creation.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: added 1-emoticon friendly greeting variants, restored today briefing task-title weight, softened task-detail section headings/log text, made the quick update textarea larger with a smaller `남기기` button, added inline related-link creation inside common task detail, and extended the importance filter to board/timeline/recurring/archive.
  - Done: removed calendar-specific visual drift by making calendar task detail use the same common detail card border/radius/shadow and the same link/update form styling.
  - Verified in browser on `http://127.0.0.1:5173/`: briefing task title weight measured `660`, search input font size `12.5px`, detail `관련 링크`/`업데이트 로그` headings measured `12.5px/620`, update textarea measured `58px`, `남기기` button measured `47x28`, priority filter appeared on timeline, inline link form appeared in both board and calendar task detail, personal greeting included an emoji, console errors/warnings were 0, and build passed.

- [x] Add shared emoji picker and install full emoji library.
  - Files: `src/App.jsx`, `src/styles.css`, `vite.config.js`, `package.json`, `pnpm-lock.yaml`, `DESIGN.md`, `TODO.md`, `HANDOFF.md`.
  - Done: added a shared searchable emoji popover for profile emoji, memo, calendar note, common task-detail update logs, and task-modal update logs; simplified visible emoji options to emoji-only; rendered the popover through a portal so it is not clipped by cards or scroll panels.
  - Done: compacted calendar-side task-detail actions only, leaving the common task-detail sizing unchanged elsewhere.
  - Done: installed `emoji-picker-react`, replaced the lightweight prototype grid inside the existing shared `EmojiPopover`, kept native emoji rendering for company-network reliability, and lazy-loaded the picker when opened.
  - Done: split `emoji-picker-react` and `flairup` into an `emoji-picker` build chunk so the existing vendor chunk stays near its previous size.
  - Done: added a graceful lazy-load failure state with a `다시 시도` button and marked the emoji trigger as `aria-haspopup="dialog"`.
  - Verified in browser on `http://127.0.0.1:5175/`: signup profile emoji picker opened with `이모지 검색`, rendered 49 visible emoji buttons, searching `rocket` narrowed results to 4, selecting `rocket` changed the trigger to `🚀`, closed the popover, kept horizontal overflow false, and console errors/warnings were 0.
  - Verified follow-up in browser on `http://127.0.0.1:5175/`: signup profile emoji picker still opened after load-failure guardrail changes, search placeholder stayed `이모지 검색`, `aria-haspopup` was `dialog`, 37 emoji buttons rendered in the initial viewport, retry button was not shown on the normal path, horizontal overflow was false, and console errors/warnings were 0.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.49s` after chunk split).
  - Verified follow-up: `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `git diff --check`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.46s`).
  - Note: `/Users/seulgi/Library/pnpm/bin/pnpm peers check` still reports the pre-existing `@tailwindcss/vite` peer expectation for Vite 5+, unrelated to `emoji-picker-react`.

- [x] Approve Supabase-first backend direction and draft initial schema.
  - Files: `.env.example`, `supabase/migrations/001_initial_dashboard_schema.sql`, `docs/supabase-start-guide.md`, `docs/backend-decision-brief.md`, `docs/backend-implementation-plan.md`, `docs/data-model.md`, `TODO.md`, `HANDOFF.md`.
  - Decision: start with Supabase/Postgres and email/password signup/login. New signups default to `member`; admin rights are assigned separately. Future company internal login/SSO should map into the same `public.users` profile model.
  - Done: drafted the initial Supabase schema with auth-linked users, role enums, tasks, subtasks, updates, links, tags, calendar events, shared dashboard memos, personal notes, recurring templates, user preferences, indexes, auth trigger, and RLS policies.
  - Done: added setup guidance for first admin promotion and future frontend environment variables.
  - Verification note: SQL is drafted but not executed against a Supabase project yet; project URL/anon key and a Supabase SQL run are still needed before frontend integration.

- [x] Start Supabase client integration.
  - Files: `package.json`, `pnpm-lock.yaml`, `.env.example`, `src/supabaseClient.js`, `src/supabaseStore.js`, `src/storage.js`, `src/App.jsx`, `src/styles.css`, `vite.config.js`, `docs/backend-implementation-plan.md`.
  - Done: installed `@supabase/supabase-js`, added a Supabase client that only activates when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist, added first auth/read/preference store scaffolding, kept localStorage as the active fallback, added a top-bar local/Supabase status pill, and split Supabase/vendor bundles in Vite.
  - Verification: build passed on `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`; no actual secret values were added.

- [x] Connect the local app to the real Supabase project and apply initial DB schema.
  - Project: `work-dashboard` at `https://nbefvcrcfwacvnohtsmy.supabase.co`.
  - Done: added `.env.local` locally and excluded env files in `.gitignore`; applied Supabase migrations `initial_dashboard_core_schema` and `initial_dashboard_rls_policies`; added real email/password login and signup UI when Supabase env values are present.
  - Verification: Supabase migration list shows both migrations; browser showed the real login/signup form without a missing-session error; build passed.

- [x] Fix Supabase Data API grants after disabling automatic table exposure.
  - Issue: signup/login reached `permission denied for table users` because RLS policies existed but the `authenticated` API role had not been granted table privileges.
  - Done: applied live migration `grant_data_api_table_access` and added the same grant section to the local migration file.
  - Note: RLS still controls row access; the grants only allow the Data API role to reach the tables.

- [x] Promote the first administrator after signup.
  - First admin email: `seulgis@posco.com`.
  - Done: applied live migration `promote_first_admin`, setting `permission_role = 'admin'`.
  - 2026-06-06 update: 소슬기 is also a visible team member, so the live auth profile is now `소슬기 / 수석 / is_team_member = true` while keeping `permission_role = 'admin'` until another administrator exists.
  - Verification: Supabase migration list includes `promote_first_admin`.

- [x] Start real Supabase dashboard data sync.
  - Files: `src/App.jsx`, `src/supabaseStore.js`, `src/styles.css`.
  - Done: login/session restore now reads `supabaseDashboardStore.read()` and hydrates profile/preferences/memos/tags/events/tasks when DB data exists; empty task DB keeps the existing prototype data visible during transition.
  - Done: page/view/tag/timeline preferences and page-scoped shared memos write back to Supabase after login.
  - Done: shared tag add/rename/delete calls Supabase with the product rule preserved: everyone can add, admin can rename/delete.
  - Done: actual UUID-backed tasks can be saved to Supabase with subtasks, links, and tag joins; status changes, update logs, related links, archive/delete, and subtask check progress have first DB write paths.
  - Done: due-date edits on UUID-backed tasks append Supabase change-history rows.
  - Done: team/personal calendar event creation, edit, and delete write to Supabase, with personal events tied to a real user when available.
  - Done: profile name/title/emoji editing writes to Supabase when the current person is a real auth user.
  - Done: admin user-management UI can change permission role, team-list visibility, and active state; local migration `002_admin_user_management.sql` grants the required update columns.
  - Done: applied live Supabase migration `admin_user_management_grants`, so admin permission/team/active updates can persist through the Data API.
  - Done: added a short in-app sync notice for Supabase write failures and prototype-only local saves across task, tag, calendar, profile, and admin update paths.
  - Done: applied live Supabase migration `task_recurring_columns` and wired `src/supabaseStore.js` so visible recurring source tasks can save/read interval, weekdays, start/end, no-end, rule detail, and duration.
  - Done: applied live Supabase migration `team_roster_pre_auth`; admins can maintain pre-signup assignee roster rows with expected signup emails, and tasks/calendar events can save against those roster assignees before teammates create login accounts.
  - Done: applied live Supabase migration `roster_task_permissions`; after a signup email links to a roster row, that teammate can manage tasks pre-created for their roster identity.
  - Guardrail: roster-assigned tasks use the signed-in admin/lead as the auth owner for RLS while displaying and filtering by `owner_roster_id`; future signup with matching email links the roster row to the real auth user.
  - 2026-06-06 logged-in Supabase QA: verified the real Supabase login path on `http://127.0.0.1:5173/`; session restored after reload, top status now reads `Supabase 연결` after sign-in, Team Flow showed real DB summary/briefing data, `태그: 전체` rendered the one live board card, board detail opened in the workflow-side common detail panel, calendar rendered 6 live events, updates rendered the live new-assignment section, performance rendered 1 weekly work card with copy/save controls, and console errors/warnings were 0.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

## Later

- [x] Connect to an actual Supabase project.
  - Read first: `docs/supabase-start-guide.md`, `supabase/migrations/001_initial_dashboard_schema.sql`, `docs/backend-api-spec.md`, `docs/permission-rules.md`.
  - Done: project URL and publishable key were configured in ignored `.env.local`; initial schema/RLS migration applied.
  - Done: 슬기님 signed in with `seulgis@posco.com`; the profile is promoted to admin and also shown as visible team member `소슬기 / 수석`.

- [x] Implement initial server-side permission enforcement after backend choice.
  - UI-only restrictions currently exist but are not secure.
  - Done: Supabase RLS policies and Data API grants are applied for users, tags, tasks, task relations, calendar events, memos, recurring templates, and preferences.
  - Remaining: broaden audit handling for every edit path and validate lead/member edge cases with multiple real accounts.

- [x] Convert localStorage JSON data to backend migration/import flow.
  - Current adapter: `src/storage.js`.
  - Target: replace storage boundary without mixing network calls directly into view components.
  - 2026-06-06 progress: added a Supabase import dry-run planner (`src/supabaseImportPlan.js`) plus `check:import-plan` verification so exported prototype JSON can be summarized before any live DB writes.
  - 2026-06-06 guardrail: when Supabase is configured and the user is signed in, `JSON 가져오기` shows the backend import summary and requires admin confirmation before mutating live Supabase data.
  - 2026-06-06 progress after approval: added the live Supabase import executor behind administrator confirmation. It reuses the Supabase store boundary to upsert roster/profile hints, tags, categories, tasks, subtasks, links, initial updates, calendar events, and page memos.
  - Guardrail: local-id tasks/events are inserted as new live rows, while same UUID rows can update. Re-running the same legacy local-id JSON can add duplicates, so import should be run once per approved source file.
  - 2026-06-06 guardrail: successful Supabase imports now record a local JSON fingerprint, and selecting the same JSON again shows an additional duplicate-risk confirmation before any DB write.
  - 2026-06-06 guardrail: Supabase import now blocks files that reference local 담당자 IDs missing from the current people directory/team roster, so unknown IDs are not auto-created as operational roster rows.
  - 2026-06-06 clarity pass: unknown-roster import blocks now show where each unmapped local ID appears (`업무 담당자`, `업무 작성자`, `업무 배정자`, `일정 담당자`, `프로필 보정`) and the direct Supabase store fallback alert names `unknown-roster-ids` separately from admin/login failures.
  - 2026-06-06 decision: 슬기님 confirmed old local prototype data does not need to be migrated because the team will start writing fresh data in Supabase. Keep JSON export/import as an admin backup and future migration tool, but do not treat a one-time legacy import as a current launch blocker.
  - Verified: `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan` passed, build passed, and local fallback browser QA showed the data menu/import input with console errors/warnings 0.
  - Verified: after import executor wiring, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and build passed (`✓ built in 1.46s`); browser QA on `http://127.0.0.1:5191/` showed the data menu with `JSON 내보내기/JSON 가져오기/데이터 초기화`, no horizontal overflow, and console errors/warnings 0. Live import was not run because no source JSON file was selected in QA.
  - Verified: after duplicate-import fingerprint guard, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, direct import-history storage check, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.46s`). Browser QA on `http://127.0.0.1:5191/` verified the data menu still shows export/import/reset, the JSON file input accepts `.json`, no horizontal overflow, and console errors/warnings 0.
  - Verified unknown-roster guard: `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.38s`). Browser QA on `http://127.0.0.1:5173/` verified `Supabase 연결`, data menu buttons `JSON 내보내기/JSON 가져오기/데이터 초기화`, import input accepting `application/json,.json`, no horizontal overflow, and console errors/warnings 0.
  - Verified clarity pass: `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.44s`). Browser QA on `http://127.0.0.1:5173/` was limited to the current login screen; it rendered without horizontal overflow and console errors/warnings were 0.

- [x] Prepare company approval demo readiness checklist.
  - Files: `docs/company-demo-readiness-checklist.md`, `docs/company-supabase-review-brief.md`, `docs/internal-port-demo-runbook.md`, `docs/company-clone-runbook.md`, `docs/supabase-start-guide.md`, `scripts/check-demo-readiness.mjs`, `package.json`, `TODO.md`, `HANDOFF.md`.
  - Done: documented the recommended pre-approval stop point, Supabase approval questions, internal port demo decision, demo data policy, data storage scope, security boundaries, and company review questions.
  - Decision: current default demo data uses the real visible roster names (`소슬기`, `박경수`, `류강묵`, `장형민`, `박관욱`, `조원태`) because local fallback/demo IDs were already aligned to the real roster. For wider sharing or security review, prepare an anonymized demo roster before any broader URL-based sharing.
  - 2026-06-06 decision: internal first demo can stay real-name. Keep the anonymized demo option documented for broader sharing/security review.
  - 2026-06-06 decision: temporary URL is excluded for now. Company review will start through port/local-network access instead of a deployed URL.
  - Cleanup note: current app supports individual task deletion and local `데이터 초기화`; it does not yet have a dedicated one-click `예시 데이터만 삭제` admin action. Add that only if demo data is seeded into a shared Supabase demo DB or if cleanup becomes a repeated workflow.
  - 2026-06-06 follow-up: added `docs/company-supabase-review-brief.md` as a company-facing one-page review brief covering app purpose, demo data stance, Supabase data inventory, current security state, approval-bound work, permission model, internal port demo decision, and IT/security questions.
  - 2026-06-06 follow-up: added `docs/internal-port-demo-runbook.md` with the exact pnpm command, local/network URL pattern, Mac IP checks, demo login cautions, recommended demo flow, and troubleshooting for company port/local-network review.
  - 2026-06-06 follow-up: added `scripts/print-demo-urls.mjs` and `pnpm run demo:urls` to print local/network URL candidates for the current Mac before an internal port demo.
  - 2026-06-06 follow-up: added `docs/company-clone-runbook.md` for later Windows/Linux company PC clone execution, pinned `packageManager` to `pnpm@11.5.1`, and added `scripts/check-demo-readiness.mjs` plus `pnpm run check:demo-readiness` so a cloned machine can verify required scripts/docs/env key presence without printing secrets.
  - 2026-06-06 follow-up: connected the existing secret-free `.env.example` template to the clone/internal-port docs and made `check:demo-readiness` verify that `.env.example` includes the required Supabase frontend keys.
  - Verified company-clone prep: `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, `git diff --check`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.35s`). Browser QA was not rerun because this pass only changed docs, package metadata, and Node check scripts.
  - Verified internal-port docs pass: `/Users/seulgi/Library/pnpm/bin/pnpm run demo:urls`, `git diff --check`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.39s`).

- [ ] Finish remaining Supabase CRUD parity.
  - Done already: auth/session, pre-signup team roster, profile name/title/emoji, preferences, page memos, tags, first task writes, recurring rule persistence on visible source tasks, status/log/link/archive/delete/subtask progress, calendar event create/edit/delete, admin user-management UI, live admin-management grants, and user-facing sync feedback.
  - 2026-06-06 onboarding prep: added `docs/team-onboarding-checklist.md` and `docs/team-roster-template.csv` so real-user setup only needs name, title, permission role, expected signup email, and team-list visibility.
  - 2026-06-06 current user update: live `public.users` for `seulgis@posco.com` is now `소슬기 / 수석 / is_team_member = true`; app management permission remains `admin` as a temporary safety guard until a second admin is available.
  - 2026-06-06 current roster check: live `team_roster` now has visible real-member rows for 박경수/팀장/lead (`lead`, `kyongsupark@posco.com`), 류강묵/수석/member (`kmryu`, `kmryu@posco.com`), 장형민/차장/member (`junho`, `hyungmin.jang@posco.com`), 박관욱/수석/member (`minji`, `kwanwuk@posco.com`), and 조원태/수석/member (`sugu05`, `sugu05@posco.com`). None of these non-admin roster rows is linked to an auth user yet.
  - 2026-06-06 local roster cleanup: default local sample people, fallback selected-person defaults, and archive demo generation were retuned to the same real-member roster IDs so offline/demo screens no longer surface the old placeholder team names or duplicate live roster rows.
  - 2026-06-06 browser follow-up: after making 소슬기 visible as a team member, the local fallback `admin` seed was kept hidden to avoid duplicating the signed-in auth profile. Browser DOM snapshot on `http://127.0.0.1:5173/` showed `Supabase 연결`, the account button as `소슬기 수석 관리자`, and a single squirrel member icon in Team Members.
  - Verified: live SQL query returned the five real visible roster rows with expected emails; old placeholder display-name search returned no code/docs matches; roster CSV parse passed with 6 rows including admin; `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.64s`). Later signed-in browser QA closed the earlier visible-roster reload gap.
  - Verified follow-up: live SQL confirmed `seulgis@posco.com` is `소슬기 / 수석 / admin / is_team_member = true`; CSV parse passed; `check:import-plan` passed; `check:summary-filter` passed; build passed (`✓ built in 1.51s`); browser snapshot showed no duplicate 소슬기 team-member entry.
  - Verified final signed-in roster QA on `http://127.0.0.1:5173/`: sidebar showed 6 visible team members in the expected real roster (`박경수`, `류강묵`, `박관욱`, `소슬기`, `장형민`, `조원태`), account button showed `소슬기 수석 관리자`, duplicate visible names were 0, top status showed `Supabase 연결`, no horizontal overflow appeared, and console errors/warnings were 0.
  - 2026-06-06 no-approval prep: added `docs/role-rls-validation-checklist.md` and linked it from `docs/team-onboarding-checklist.md` so the first lead/member signup can be followed by a concrete admin/lead/member role and RLS walkthrough.
  - Verified role/RLS prep: `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.43s`), and `git diff --check` passed for the touched docs.
  - 2026-06-06 progress: account-modal admin roster management now has a compact pre-signup roster add form and editable roster name/title fields, while keeping expected email, permission, team display, and active toggles.
  - 2026-06-06 progress: calendar event edit/delete UI now follows the shared calendar permission nuance. Team/personal calendar entries remain visible for coordination, but edit/delete controls and App-level update/delete handlers are limited to owner, creator, lead, or admin.
  - 2026-06-06 progress: recurring future occurrence chips now explicitly say `회차 생성`, include an accessible action label, and show feedback after converting the occurrence into an independent task through the existing Supabase-aware task save path.
  - 2026-06-06 progress: manual recurring occurrence creation now persists its initial `recurring` change-history row to Supabase `task_change_history` for newly materialized task rows.
  - 2026-06-06 progress after approval: automatic recurring generation is now bounded to unsaved occurrences whose start date has arrived (`startDate <= TODAY`) and skips existing `recurringTemplateId + dueDate` pairs to prevent duplicate task rows.
  - Verified: roster add draft typing works without submitting data, existing roster edit fields render, modal horizontal overflow is false, console errors/warnings were 0, `check:summary-filter` passed, and build passed (`✓ built in 1.42s`).
  - Verified: calendar permission QA on `http://127.0.0.1:5191/` showed admin event detail with edit/delete controls, a regular member event detail with `읽기 전용` and no edit/delete controls, no horizontal overflow, console errors/warnings 0, `check:summary-filter` passed, and build passed (`✓ built in 1.51s`).
  - Verified: recurring manual occurrence QA on `http://127.0.0.1:5191/` showed 4 recurring rows, 26 occurrence buttons, `회차 생성` labels, accessible labels such as `7월 1일 시작 회차를 개별 업무로 만들기`, 126x46px first chip, no horizontal overflow, console errors/warnings 0, `check:summary-filter` passed, and build passed (`✓ built in 1.49s`).
  - Verified: recurring change-history persistence build check passed (`✓ built in 1.43s`); browser render QA on `http://127.0.0.1:5191/` still showed 4 recurring rows, 26 occurrence buttons, `회차 생성` label, no horizontal overflow, and console errors/warnings 0.
  - Verified: bounded automatic recurring generation check passed (`✓ built in 1.55s`); browser QA on `http://127.0.0.1:5191/` verified board card count stayed stable at 9 across reloads, Recurring tab still showed 4 rows and 26 `회차 생성` buttons, no horizontal overflow, and console errors/warnings 0.
  - 2026-06-06 Supabase preflight: advisor check found RLS/function and FK-index warnings. Added `supabase/migrations/013_advisor_preflight_hardening.sql` for `touch_updated_at` search path and missing FK covering indexes only; SECURITY DEFINER execute grants are intentionally left for a separate role/RLS test pass.
  - 2026-06-06 live DB update after approval: applied the low-risk `013_advisor_preflight_hardening.sql` subset to Supabase through `execute_sql`. This fixed the `touch_updated_at` search-path warning and removed the FK missing-index advisor items. The new indexes may appear as unused until real query traffic accumulates.
  - Verified: `013_advisor_preflight_hardening.sql` first passed through a live `BEGIN ... ROLLBACK` SQL syntax check, then the live apply completed; post-apply security/performance advisors no longer show `function_search_path_mutable` for `touch_updated_at` or the prior unindexed-FK items. `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and build passed (`✓ built in 1.59s`).
  - 2026-06-06 no-account prep: actual team-member signup/account linking is excluded for now. Added `docs/supabase-security-next-pass.md` to prepare the next approved security pass around SECURITY DEFINER helper functions, shared memo RLS strictness, leaked password protection, and verification order without applying live DB changes.
  - Verified no-account security prep: `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.45s`).
  - 2026-06-06 security-pass prep: added `supabase/migrations/014_private_rls_helpers_and_memo_policy.sql`. A live `BEGIN ... ROLLBACK` rehearsal showed that blanket `EXECUTE` revoke alone breaks RLS helper calls, so the prepared migration creates `private` schema RLS helpers, rewrites helper policies to `private.*`, revokes direct execute on the public helper/trigger functions, and replaces broad `dashboard_memos` policies with active-user select/insert/update policies.
  - 2026-06-06 live DB update after approval: applied `014_private_rls_helpers_and_memo_policy` to Supabase project `nbefvcrcfwacvnohtsmy`; migration history shows `20260606091558 014_private_rls_helpers_and_memo_policy`.
  - Verified post-014 SQL/advisors: public SECURITY DEFINER helper/trigger functions are now executable only by `postgres`, private RLS helpers are executable by `authenticated`, `dashboard_memos` has separate active-user select/insert/update policies, authenticated-role smoke test passed for users/roster/tasks/memos/memo update in a rolled-back transaction, security advisor now only reports leaked password protection disabled, and prior performance `auth_rls_initplan` warnings are gone.
  - Verified post-014 local checks: `git diff --check`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.65s`).
  - Browser QA note: in-app browser reload of `http://127.0.0.1:5175/` was blocked by Browser URL policy, so app-level CRUD/browser smoke QA still needs a later retry when the browser can load the local target.
  - 2026-06-06 Auth/security follow-up prep: added `docs/supabase-auth-security-checklist.md` for the remaining leaked password protection/password-policy dashboard check. Supabase docs indicate leaked password protection is configured in Auth settings and requires Pro Plan or above.
  - 2026-06-06 decision: 슬기님 confirmed the current project is not on Supabase Pro Plan and may not use the personal Supabase project later. Keep leaked password protection as an operations-before-real-data checklist item, but do not pay/upgrade for the private internal demo.
  - 2026-06-06 performance advisor prep: added `supabase/migrations/015_split_read_manage_rls_policies.sql` to split broad `FOR ALL` manage policies into insert/update/delete policies for `personal_notes`, `subtasks`, `task_links`, and `task_tags`. Live `BEGIN ... ROLLBACK` rehearsal passed with authenticated reads and a no-op subtask update. It was held at that time because it was another persistent RLS policy change, then applied after the later explicit approval below.
  - Verified post-015 prep: `git diff --check`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`, `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`, and `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed (`✓ built in 1.53s`).
  - 2026-06-06 live DB update after approval: applied `015_split_read_manage_rls_policies` to Supabase project `nbefvcrcfwacvnohtsmy`; migration history shows `20260606093846 015_split_read_manage_rls_policies`.
  - Verified post-015 SQL/advisors: affected policies are split into one read `SELECT` policy plus separate `INSERT`, `UPDATE`, and `DELETE` policies for `personal_notes`, `subtasks`, `task_links`, and `task_tags`. Authenticated-role smoke testing passed inside a rolled-back transaction with visible rows `personal_notes 0`, `subtasks 3`, `task_links 1`, `task_tags 3`, and no-op updates passed for `subtasks`, `task_links`, and `task_tags`. Security advisor still reports only leaked password protection disabled; performance advisor no longer reports multiple-permissive-policy warnings and now only reports unused-index INFO items. `git diff --check`, `check:demo-readiness`, `check:import-plan`, `check:summary-filter`, and build passed (`✓ built in 1.63s`).
  - 2026-06-06 signed-in browser CRUD smoke QA: on `http://127.0.0.1:5173/`, the signed-in session restored as `소슬기 / 수석 / 관리자` with `Supabase 연결`. A temporary task `QA 임시 업무 20260606100237` was created with one required detail item, appeared in summary/briefing/agenda/board, changed from `계획` to `진행중`, opened in the workflow-side common detail panel, accepted a quick update log, and was deleted through the confirmation dialog. After cleanup, the screen returned to the original 1 live task, the QA title/update log were absent, horizontal overflow was false, and console errors/warnings were 0.
  - Next scope excluding team signup/account linking and legacy JSON migration: prepare the internal port demo/company review package, or decide when actual lead/member signup/auth linking should start. Supabase Auth leaked password protection remains deferred unless Supabase is approved for real operational use.

- [x] Retune standard desktop layout density.
  - Files: `src/styles.css`, `DESIGN.md`.
  - Done: reduced the persistent sidebar to 176px, tightened sidebar spacing/rows, shifted `오늘 브리핑` to a 56/44 split so `오늘 일정` and `메모` gain width on 1366-1440px screens, and changed calendar multi-day event rendering so the event title keeps the first line while the date range moves to a secondary line.
  - Follow-up: calendar multi-day event chips now use compact first-line ranges such as `(6/11~6/13)` beside the title instead of the long `6월 11일 - 6월 13일` label.
  - Follow-up: calendar task/event detail now appears only after clicking an item, so the calendar grid uses full width by default on laptop-sized screens.
  - Verified in browser at 1366x768: sidebar 176px, workspace 1175px, briefing columns 612px/481px, agenda/memo columns 227px each, no horizontal overflow, and no simple text overflow candidates.
  - Verified in browser at 1440x900: sidebar 176px, workspace 1249px, briefing columns 654px/513px, agenda/memo columns 243px each, team-member rows did not overflow, calendar event title/date used the same title column, no framework overlay, and console errors/warnings were 0.
  - Verified follow-up in browser at 1440x900: `전략과제 중간 공유회(6/11~6/13)` rendered on one row, no horizontal overflow, no framework overlay, and console errors/warnings were 0.
  - Verified follow-up in browser at 1366x768: calendar initial grid used 1133px full width with 0 detail panels; clicking a calendar item opened one 340px detail panel; close returned the grid to 1133px; console errors/warnings were 0.

- [ ] Decide internal login/SSO timeline.
  - Email/password is active for the first version.
  - Future company login can map into the same `public.users` profile table.
  - Deferred for now while the current email/password pilot remains the working path.

- [x] Decide long-term fate of `prototype.html`.
  - Done after approval: moved the legacy static reference to `legacy/prototype.html`.
  - Rule: keep it as reference only; do not implement new features there.
