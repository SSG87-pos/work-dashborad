# TODO

## Now

- [x] Create project design and agent governance Markdown.
  - Files: `AGENTS.md`, `src/AGENTS.md`, `CLAUDE.md`, `src/CLAUDE.md`, `DESIGN.md`, `HANDOFF.md`, `TODO.md`.
  - Done: added root agent rules with operational commands, golden rules, design governance, coding rules, and context map; added `src/AGENTS.md` for React/CSS-specific guardrails; added `CLAUDE.md` links; added `DESIGN.md` with approved layout, typography, chip, task-detail, briefing, board, timeline, calendar, updates, performance, tag, and regression rules.
  - Verified: root and nested `AGENTS.md` are under the 500-line limit, `CLAUDE.md` files link `@AGENTS.md`, and the design document consolidates the project decisions currently spread across handoff/TODO and UI iteration notes.

- [x] Apply a modern UI detail pass without reinstalling the stack.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: added a final design-token/detail-pass layer for calmer surfaces, shared chip styling, clearer board cards, softer detail panel hierarchy, compact tag dictionary, and view-change scroll reset.
  - Fixed: board grid no longer expands underneath the right detail panel; it stays inside the main column and scrolls horizontally.
  - Verified in browser on `http://localhost:5173/`: team board containment, tag area compactness, timeline header/legend/bar visibility, and performance page top alignment.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

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
  - Note: automated Tab traversal in the in-app browser did not move focus reliably, so a short manual keyboard-only walkthrough in a real browser remains useful before production.

## Next

- [ ] Run one manual keyboard-only walkthrough in a real browser before production handoff.
  - Check Tab/Shift+Tab order through sidebar, board cards, task detail actions, task modal, tag controls, calendar details, update forms, and performance copy/save controls.
  - Expected: focus indicator is visible, no focus trap except intentional modal behavior, and Enter/Space operate buttons/selects predictably.

- [ ] Clean up `src/styles.css` layering.
  - Current risk: many late override blocks make small layout changes easy to regress.
  - Update: final UI detail and contextual detail layers now stabilize the visible surface, and the first cleanup pass grouped the context-detail, calendar-detail, weekly-performance, and final timeline-scroll layers while removing a duplicate `timeline-grid` declaration.
  - Target: group by feature (`layout`, `briefing`, `board`, `detail`, `timeline`, `calendar`, `updates`, `performance`, `modal`, `responsive`) or split into CSS modules/files.
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
  - Done: removed `오늘 업무 큐`, changed the briefing split to left 65% and right 35%, split the right side into `오늘 일정` 15% and `내 메모` 20%, and moved task assignee into the agenda first line as `업무/이준호`.
  - Verified in browser at 1920px: briefing columns measured `833.9px 449.1px`, right columns measured `182.6px 243.5px`, `오늘 업무 큐` text was absent, agenda first line was `업무/이준호`, agenda meta was `진행중 · 67%`, D labels shared one left/right edge, console errors/warnings were 0, viewport was reset, and build passed.

- [x] Add board priority filter and retune dense dashboard typography.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Done: added a board-only importance filter (`중요도: 전체/높음/보통/낮음`), persisted it with dashboard state, showed task status as a small chip in `오늘 일정`, fixed the briefing due-label rail, widened the account button enough for one-line name/role display, and softened board guide/card/detail metadata font weights.
  - Verified in browser at 1920px: team briefing due labels all shared right edge `1057`, priority filter reduced 9 cards to 3 `높음` cards and restored to 9 on `전체`, today agenda showed `업무/이준호` with `⚙️ 진행`, account identity had no horizontal clipping (`scrollWidth === clientWidth`), and build passed.

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

- [x] Add prototype emoji picker and document production replacement.
  - Files: `src/App.jsx`, `src/styles.css`, `DESIGN.md`, `TODO.md`, `HANDOFF.md`.
  - Done: added a shared searchable emoji popover for profile emoji, memo, calendar note, common task-detail update logs, and task-modal update logs; simplified visible emoji options to emoji-only; rendered the popover through a portal so it is not clipped by cards or scroll panels.
  - Done: compacted calendar-side task-detail actions only, leaving the common task-detail sizing unchanged elsewhere.
  - Done: removed the unused legacy `.emoji-picker-grid` CSS and recorded that production implementation should replace the lightweight prototype picker with `emoji-picker-react`.
  - Verified: build passed.

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
  - Done: applied live migration `promote_first_admin`, setting `permission_role = 'admin'`, `title = '관리자'`, and `is_team_member = false`.
  - Verification: Supabase migration list includes `promote_first_admin`.

- [x] Start real Supabase dashboard data sync.
  - Files: `src/App.jsx`, `src/supabaseStore.js`.
  - Done: login/session restore now reads `supabaseDashboardStore.read()` and hydrates profile/preferences/memos/tags/events/tasks when DB data exists; empty task DB keeps the existing prototype data visible during transition.
  - Done: page/view/tag/timeline preferences and page-scoped shared memos write back to Supabase after login.
  - Done: shared tag add/rename/delete calls Supabase with the product rule preserved: everyone can add, admin can rename/delete.
  - Done: actual UUID-backed tasks can be saved to Supabase with subtasks, links, and tag joins; status changes, update logs, related links, archive/delete, and subtask check progress have first DB write paths.
  - Done: team/personal calendar event creation writes to Supabase, with personal events tied to a real user when available.
  - Guardrail: prototype tasks assigned to temporary local users remain local until those people create real accounts, because Supabase task ownership is auth-user UUID based.
  - Build: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build` passed.

## Later

- [x] Connect to an actual Supabase project.
  - Read first: `docs/supabase-start-guide.md`, `supabase/migrations/001_initial_dashboard_schema.sql`, `docs/backend-api-spec.md`, `docs/permission-rules.md`.
  - Done: project URL and publishable key were configured in ignored `.env.local`; initial schema/RLS migration applied.
  - Still needed from 슬기님: sign up once with `seulgis@posco.com`, then promote that user to admin.

- [x] Implement initial server-side permission enforcement after backend choice.
  - UI-only restrictions currently exist but are not secure.
  - Done: Supabase RLS policies and Data API grants are applied for users, tags, tasks, task relations, calendar events, memos, recurring templates, and preferences.
  - Remaining: broaden audit handling for every edit path and validate lead/member edge cases with multiple real accounts.

- [ ] Convert localStorage JSON data to backend migration/import flow.
  - Current adapter: `src/storage.js`.
  - Target: replace storage boundary without mixing network calls directly into view components.

- [ ] Wire shared task, tag, calendar, memo CRUD to Supabase.
  - Current state: real auth/session works, but the dashboard still renders prototype/local task data.
  - Next scope: load users/tags/tasks/calendar/memos from Supabase after login, then replace write paths incrementally.

- [ ] Decide internal login/SSO timeline.
  - Email/password is active for the first version.
  - Future company login can map into the same `public.users` profile table.

- [ ] Decide long-term fate of `prototype.html`.
  - Options: keep as legacy reference, move to `legacy/`, or remove before production handoff.
