# HANDOFF

## Scope

Mainline handoff for `/Users/seulgi/Documents/work-dashboard`.

Project goal: build a clickable React/Vite prototype and evolve it into a usable shared work dashboard for `연구기획그룹-전략`. The dashboard is centered on personal daily briefing, public team workflow, task assignment, task detail/update logs, tag filtering, timeline/calendar, recurring work, archive, personal notes, performance reporting, and later real login/admin/backend support.

Last updated: 2026-06-05

## Current State

- Canonical app: React/Vite source under `src/`.
- Legacy reference only: `prototype.html`.
- Main files to read first:
  - `src/App.jsx`
  - `src/data.js`
  - `src/styles.css`
  - `src/storage.js`
  - `docs/backend-api-spec.md`
  - `TODO.md`
- Package manager: `/Users/seulgi/Library/pnpm/bin/pnpm`.
- Build command: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`.
- GitHub remote: `https://github.com/SSG87-pos/work-dashborad.git`.
- Current backend branch: `codex/supabase-integration`.
- Persistence is hybrid during the transition:
  - localStorage key `research-strategy-dashboard:v1` remains the prototype fallback.
  - Supabase is active when `.env.local` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  - login/session/profile/preferences/shared memos/shared tags and first UUID-backed task/calendar write paths are now connected to Supabase.
  - prototype tasks assigned to temporary local people remain local until those people sign up and have real auth UUID profiles.
- User-facing design direction: keep the first screen personal-first, but let all members access public team workflow.

Key product decisions now in the prototype:

- `오늘 브리핑` is personal-first: briefing task flow, today agenda, and a page-scoped shared memo.
- Memo behavior is page-scoped, not account-scoped: `오늘 브리핑` and `전체 업무흐름` each have an independent memo, and any signed-in team member can edit the memo for the page they are viewing.
- `전체 업무흐름` is the shared public team board/timeline/recurring/archive area.
- Task detail placement is contextual:
  - briefing selections keep the detail panel beside the `오늘 브리핑`
  - board selections move the detail panel beside the board in a sticky workflow column
  - timeline/recurring/archive selections move the detail panel beside the clicked workflow area in the same sticky workflow column
  - task detail space is not reserved before selection; workflow views use their full width until a task is clicked.
- Board columns are ordered `검토/대기 -> 계획 -> 진행중 -> 완료 -> 보류`.
- New tasks start as `계획` unless the user explicitly chooses another status.
- Task progress is automatically calculated from `상세 업무 내용` checklist items. At least one detail item is required when saving a task.
- `completedAt`/`completedBy` are set when a task first enters `완료`; moving it out of `완료` clears completion metadata and keeps status history.
- Due-date edits append compact change-history rows.
- Completed and held tasks can be archived; archived items stay out of main board/briefing and appear in `보관함`.
- Task deletion exists in task detail as a red icon action with confirmation. Deleting a recurring template also deletes linked saved recurring instances.
- Tags are shared:
  - all users can add tags
  - only admin can rename/delete tags
  - tags use calm gray rounded chips in tag bar, briefing, board, detail, and update surfaces.
- Tag filter presets are supported without becoming editable tags:
  - `기획/임원보고` = `기획보고`, `임원보고`
  - `전략/투자 묶음` = `전략과제`, `투자검토`, `시장동향`
  - `조사/근거 묶음` = `자료조사`, `외부자료`, `정책`
  - `운영/KPI 묶음` = `월간보고`, `회의체`, `운영`, `KPI`
  - Current edit surface is the `tagFilterPresets` constant in `src/App.jsx`; a future settings/admin UI should manage these presets.
- Recurring task rules support interval, weekdays, start/end, no-end, and duration. Time-of-day is intentionally excluded.
- Recurring tab previews future schedules in one line and has `미수행 반복 일정 삭제` to remove future unstarted recurring instances while preserving already progressed history.
- Virtual recurring instances are generated for timeline/calendar/performance without saving duplicate tasks; saved recurring instances remain independently editable.
- Timeline monthly mode excludes weekends.
- Timeline uses solid soft status colors, a `🔁` sticker for recurrence, and schedule-attention stickers for delay/due/start issues.
- Timeline toolbar/legend/date axis are sticky inside the timeline scroll area.
- Calendar distinguishes work/team/personal items by color and opens details on the right.
- Updates tab shows non-completed, non-archived tasks with logs from the last 7 days, sorted by latest log date.
- Updates tab has explicit scope controls:
  - `My`: tasks assigned to the selected person or logs written by that person
  - `Team`: all visible team update cards
- `src/storage.js` exposes `localDashboardStore`; future API-backed storage should match that read/write/clear boundary instead of spreading network calls into views.
- `AGENTS.md`, `src/AGENTS.md`, and `DESIGN.md` are now the agent/design governance documents:
  - read `AGENTS.md` for operational commands and project-wide agent rules
  - read `src/AGENTS.md` before changing React/CSS behavior
  - read `DESIGN.md` before changing layout, typography, chips, task detail, briefing, board, timeline, calendar, updates, or performance views.
- `업무실적` is report-oriented, not metric-card-oriented:
  - opens in `주간`
  - weekly shows detailed issue/content/completed/planned lines
  - monthly groups by week
  - quarterly groups by month
  - yearly groups by quarter
  - recurring work is merged into compact recurring summaries.
- Profile/login/admin are prototype-level:
  - account selection screen after logout
  - admin account exists for permission/admin flow
  - profile emoji picker exists and persists locally
  - current emoji picker is a lightweight searchable prototype popover for profile, memo, calendar notes, and update logs; production should replace it with `emoji-picker-react` for the full emoji set
  - team composition order is `그룹장 -> 팀장 -> 가나다순`.
- Backend direction is now approved at the architecture level:
  - first backend route: Supabase/Postgres
  - first login route: email/password signup/login
  - new signups default to `member`
  - `admin` permission is assigned separately after signup
  - future company internal login/SSO should map into the same `public.users` profile model
  - initial schema draft: `supabase/migrations/001_initial_dashboard_schema.sql`
  - setup guide: `docs/supabase-start-guide.md`
- Live Supabase project:
  - URL: `https://nbefvcrcfwacvnohtsmy.supabase.co`
  - first admin email: `seulgis@posco.com`
  - `seulgis@posco.com` has been promoted to `permission_role = 'admin'`, `title = '관리자'`, `is_team_member = false`.
  - Data API table grants are applied manually because automatic table exposure was disabled.

Recent UI/UX refinements from the latest session:

- Removed recurring duplicate text like `(7월 3일 반복)` from board/detail/timeline/calendar/update display titles with `displayTaskTitle(task)`.
- Replaced recurring status wording with icon-only where appropriate.
- Removed `남은 60회 예정 / 시작일에 자동 반영` summary from recurring tab.
- Replaced `이후 중지` with `미수행 반복 일정 삭제`.
- Added task deletion in task detail.
- Replaced generic `scrollIntoView` selection behavior with manual scroll targeting so task selection lands with the `업무 상세` header visible.
- Unified task detail action icons: archive/restore/edit/delete are icon actions.
- Stabilized task-detail header alignment:
  - right detail column now uses `minmax(360px, 420px)`
  - detail actions are in normal grid flow and align to the actual card right edge
  - title and sticker rows stretch to the full detail content width
  - `body[data-page]` and `body[data-view]` are now wired from React state so page/view-specific CSS can apply.
- Applied a modern UI detail pass using the existing stack rather than installing anything new:
  - added a final design-token/detail-pass CSS layer for calmer surfaces, card shadows, shared chip styling, detail panel hierarchy, and softened status/tag colors
  - made the tag dictionary compact with explanation above and chips directly below
  - constrained the board inside the main column so widened board cards do not sit under the right detail panel
  - added active page/view scroll reset so full-page views such as `업무실적` open from the top instead of inheriting prior scroll position.
- Restored user-approved visual intent after the broad UI pass:
  - timeline bars now use soft status colors matching the legend instead of strong saturated blocks
  - task detail shows priority as a square top sticker matching board card priority style and gives progress, `상세 업무 내용`, related links, and update logs stronger hierarchy
  - the quick update submit button is compact again
  - calendar task clicks stay in the calendar view but reuse the common `업무 상세` component instead of the old calendar mini task card
  - performance report person headers show role as plain text, not as a sticker
  - performance reports have a `사람` filter beside the period controls
  - weekly performance detail labels are subdued small text with lightweight symbols, so the task status chip remains the primary visual cue
  - timeline legend/date-axis gap is removed and both surfaces have solid white backgrounds to avoid transparent bleed-through while scrolling
  - tag permission guidance moved next to the `태그` title with an info icon.
- Added tag filter presets in both the filter select and tag panel.
- Split `다음 액션 추천` into `nextActionContext(task)` and `nextActionPolicies` so recommendation phrasing can be tuned by policy.
- Started safe `src/styles.css` cleanup by grouping recent context-detail/calendar-detail/performance/timeline final layers and removing a duplicate `timeline-grid` declaration.
- Added `docs/backend-decision-brief.md` for the backend/login approval point.
- Aligned tag permission docs: everyone can add/apply tags, admin only can rename/delete tags.
- Added `localDashboardStore` and moved App persistence calls to that store boundary.
- Added `My` / `Team` scope switching to the updates tab with matching help text.
- Polished explanatory text hierarchy and briefing alignment:
  - briefing due labels use one fixed left-aligned date column
  - empty due cells are not rendered
  - tag permission, tag preset contents, task detail description, next-action text, and calendar helper text use calmer weights
  - calendar helper text uses the shared `ⓘ` marker
  - tag bundle preset chips use subtle border-color differences only.
- Added global Korean line-break preference: `word-break: keep-all`; URL/link text remains allowed to break.
- Refined time-aware personal greetings:
  - 07:00-09:59 keeps a warm morning greeting
  - 17:00 onward uses a wrap-up/closing tone
  - personal greetings can include a short hint from the user's briefing state such as overdue, due today, start today, or focus work.
- Unified explicit task-detail behavior:
  - board/timeline/recurring/archive no longer reserve an empty detail column before task selection
  - timeline now opens the common right sticky task detail instead of a below-timeline wide detail
  - calendar-side task detail change-history rows use more readable 11.5px text while keeping compact table columns.
- Restored approved detail/briefing visual choices after a small regression:
  - personal greetings include 1 appropriate emoji and still blend in briefing state hints
  - today briefing task titles use stronger readable weight again
  - common task detail section headings/log text are lighter than the reverted bold state
  - quick update keeps a larger textarea and smaller `남기기` button
  - related links can be added inline from task detail without opening the full edit modal
  - importance filtering now applies to board, timeline, recurring, and archive workflow views
  - calendar task detail uses the same common task detail card surface and link/update styling as the rest of the app.
- Added a shared prototype emoji picker:
  - profile emoji, memo, calendar-note, task-detail update log, and task-modal update log fields use one searchable popover interaction
  - visible emoji options are emoji-only; labels remain available through search/title/accessibility
  - popover content is rendered through a portal so it does not get clipped inside cards, modals, or scroll panels
  - calendar-side task-detail action buttons and the `읽기 전용` badge are compact only within the calendar right panel
  - removed the unused legacy `.emoji-picker-grid` CSS block.
- Started live Supabase data sync:
  - `src/App.jsx` now hydrates the dashboard from `supabaseDashboardStore.read()` after login/session restore.
  - Empty Supabase task/calendar tables preserve the local prototype data so the app does not suddenly become blank during migration.
  - Page/view/tag/timeline preferences and page-scoped shared memos are written back to Supabase.
  - Shared tags write through Supabase with add open to all users and rename/delete admin-only.
  - UUID-backed tasks can be saved to Supabase with subtasks, links, and tag joins; status/update/link/archive/delete/subtask-progress have first write paths.
  - Calendar event creation writes team/personal events to Supabase; personal events are tied to a real user UUID.
  - Important transition guardrail: static sample people like `lead`, `seoyeon`, and `junho` are not auth users, so their prototype tasks intentionally remain local until those people sign up.

## Completed Work

- Created React/Vite prototype with sample team data for one leader and six team members.
- Implemented personal/team navigation, board, timeline, calendar, recurring tab, archive, updates, performance report, task detail, task modal, tag bar, account modal, login screen, and local data management.
- Implemented localStorage read/write/clear in `src/storage.js`.
- Implemented JSON export/import/reset menu.
- Implemented role-aware UI restrictions for admin/lead/member prototype flows.
- Implemented tag add/rename/delete rules, with add open to all and rename/delete admin-only.
- Implemented subtask-based progress and compact status/due-date/change history.
- Implemented task archive, restore, delete, recurring preview, recurring virtual instances, and future recurring schedule deletion.
- Implemented update logs from task detail and update tab.
- Implemented performance report period selectors, recurring merge, markdown copy/file save, source appendix toggle, and long-period detail toggle.
- Added docs:
  - `docs/data-model.md`
  - `docs/performance-report-rules.md`
  - `docs/permission-rules.md`
  - `docs/backend-implementation-plan.md`
  - `docs/backend-api-spec.md`

## Changed Files

Source/app:

- `src/App.jsx` — main state, views, selection/scroll behavior, task CRUD, recurring logic, role logic, title normalization, task detail, performance report.
- `src/data.js` — sample users/tasks/tags/calendar events/permission roles/recurring metadata.
- `src/styles.css` — full UI styling, detail header/actions, Korean line-break rules, tag chip styling, timeline/calendar/board/performance refinements.
- `src/storage.js` — localStorage adapter.
- `src/main.jsx` — app mount.
- `src/components/ui/button.jsx`, `src/lib/utils.js` — UI utility scaffolding.

Docs/config:

- `AGENTS.md`, `src/AGENTS.md` — agent rules and frontend-specific guardrails.
- `CLAUDE.md`, `src/CLAUDE.md` — `@AGENTS.md` links for Claude-compatible context loading.
- `DESIGN.md` — current approved product/design rules and regression watch list.
- `HANDOFF.md` — current handoff.
- `TODO.md` — current next actions.
- `docs/*.md` — backend, backend decision brief, permission, data model, and performance reporting notes.
- `supabase/migrations/001_initial_dashboard_schema.sql` — initial Supabase/Postgres schema and RLS policy draft.
- `package.json`, `vite.config.js`, `components.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.gitignore`, `index.html`.
- `prototype.html` — legacy static reference only.

Assets:

- `assets/dashboard-concept.png` — preferred concept reference image.

## Remaining TODO

See `TODO.md`. Highest-priority items:

- Run one manual keyboard-only walkthrough in a real browser before production handoff.
- Clean up `src/styles.css` layering before production hardening.
- Choose backend provider/internal API route before real multi-user persistence work.

## Validation Status

Latest build validation:

```bash
CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build
```

Latest known result:

```text
✓ built in 1.25s
```

Validation notes:

- Repeated build checks passed after the latest task-detail, recurring, tag, and scroll-to-detail changes.
- Browser validation was run on `http://localhost:5173/`.
- Measured task-detail layout after the fix:
  - detail panel width: 340px after restoring the common dashboard/detail balance
  - detail action right gap from content edge: about 1px
  - selected 진행중 title used full detail content width and stayed on one line
  - selecting a board card scrolled the detail panel to top position about 16px with the header visible
  - completed/read-only detail also kept actions aligned to the right edge
  - board card titles no longer showed recurring suffix text like `(7월 3일 반복)`.
- Browser validation after the modern UI detail pass:
  - team board no longer overlaps the right detail panel (`overlap: 0`)
  - board remains horizontally scrollable inside the main column
  - tag dictionary is compact and avoids the earlier large blank space
  - timeline toolbar/legend/axis still render and bars remain visible
  - `업무실적` navigation resets to top; heading no longer starts clipped.
- Browser validation after the visual intent restoration:
  - calendar task click keeps `캘린더` active and renders `.calendar-task-detail-card` in the right panel
  - right task detail lands at about 16px from the viewport top after selecting a board card
  - task detail progress height is 13px, quick update submit is about 58x34, and priority stickers render beside status stickers
  - timeline bars use soft status backgrounds such as `#eaf2ff`, `#f3f6fa`, `#fff7e6`, `#eafaf2`, and `#fff1f2`
  - weekly performance person headers show names only, without role stickers.
- Browser validation after the latest board-card cleanup:
  - board card description text is hidden and remains available only in task detail
  - board card priority/status/badge/tag chips are all 21px high
  - cards the current user cannot manage no longer show a disabled gray status selector/footer
  - manageable card archive/edit icons are grouped together with a 6px gap.
- Browser validation after the task-detail state QA pass:
  - `검토/대기`, `계획`, `진행중`, `완료`, and `보류` detail states kept the `업무 상세` header visible after selection
  - detail panel width stayed at 340px, actions aligned to the right edge with about 15px inner gap, and stickers did not overlap actions
  - archived task detail showed `업무 복원`, `상세 수정`, and `업무 삭제` actions with the title fitting available width
  - title text retained `word-break: keep-all` and did not overflow in the tested states.
- Browser/accessibility validation after the local a11y pass:
  - visible unnamed buttons/inputs were 0 in audited dashboard surfaces
  - task modal now has `role="dialog"`, `aria-modal="true"`, and an explicit `aria-label`
  - task modal detail checklist checkboxes now have explicit `aria-label`s
  - performance option checkboxes now have explicit `aria-label`s
  - update cards expose current status badges such as `⚙️ 진행`, `⏳ 검토`, and `⏸ 보류`
  - automated Tab traversal in the in-app browser did not move focus reliably; a short manual keyboard-only walkthrough remains recommended before production handoff.
- Browser validation after the contextual detail placement pass:
  - briefing group selection kept the right detail panel beside the briefing panel (`topDeltaFromBriefing: 0`)
  - board card selection switched to `workflow-detail-mode`, removed the top right column, and rendered task detail beside the board with `position: sticky`
  - board detail top aligned with board top and stayed about 617px below the briefing panel in the tested desktop viewport
  - timeline task selection rendered detail below the timeline view instead of beside the briefing panel
  - returning to `오늘 브리핑` reset detail placement back to the briefing-side panel
  - console errors/warnings were 0 in the tested flows.
- Browser validation after the CSS cleanup / next-action / tag preset pass:
  - briefing single-task selection kept detail beside briefing
  - board card selection kept detail beside the board with sticky positioning
  - timeline task selection rendered detail below the timeline view
  - `다음 액션 추천` still rendered in the detail callout after the policy refactor
  - `기획/임원보고` tag preset reduced the board from 9 cards to 3 relevant report cards and showed `기획보고 · 임원보고`
  - console errors/warnings were 0 in the tested flows.
- Browser validation after the backend-boundary prep pass:
  - dashboard loaded normally after moving persistence calls to `localDashboardStore`
  - `업무실적` view opened and showed `Markdown 복사` and `파일 저장`
  - console errors/warnings were 0
  - doc search found no remaining conflicting tag-permission wording such as lead/admin-only tag creation.
- Browser validation after the update-scope pass:
  - `Team` showed 6 update cards and help text `팀 전체 로그 · 최근 7일 · 완료 제외`
  - `My` showed 2 update cards and help text `내 담당/작성 로그 · 최근 7일 · 완료 제외`
  - console errors/warnings were 0.
- Browser validation after the explanatory text / alignment pass:
  - briefing due labels all started at one x-position and empty due cells were 0
  - tag permission note font weight was 650
  - task detail description font weight was 600 and next-action body weight was 720
  - calendar helper displayed `ⓘ` and font weight was 650
  - tag bundle presets showed subtle border colors by bundle
  - console errors/warnings were 0.
- Browser validation after the briefing width / typography pass:
  - team briefing content used a single 655px column in the tested viewport, and task titles had 249-314px available width instead of collapsing
  - due labels used a 34px right-aligned column with the same right edge across `D-1`, `오늘`, `D+2`, and related labels
  - selected tag-bundle members rendered as the same rounded tag chips as normal tags, including tone border colors
  - update helper/log text, performance body text, and timeline tooltip text used lighter font weights while preserving title emphasis
  - board card dates used non-bold 520 weight, and `상세 업무 내용` in task detail rendered with a compact `☑️` marker at 13.5px/680
  - console errors/warnings were 0.
- Browser validation after the density / in-flow tab scrolling pass:
  - 2-item briefing rows measured 61px and 1-item rows measured 54px, so single-item rows no longer looked taller than multi-item rows
  - today queue/agenda/memo widgets returned to compact density; the memo textarea measured 64px instead of stretching to about 203px
  - update cards placed status and up to three tags on the same title row
  - tag bundle rows no longer duplicated the active bundle's member tags; individual tags remain in the main tag list
  - task-detail metadata rows measured 28px with 10.5px labels and 11.5px values
  - switching from board to timeline preserved the in-flow scroll position instead of forcing `window.scrollY` to 0
  - console errors/warnings were 0.
- Browser validation after the tag consistency / briefing-side width pass:
  - today queue, today agenda, and memo columns measured `400px 400px 400px` in the tested desktop layout
  - red briefing due labels used one fixed 44px column, with all measured labels sharing the same left and right edges
  - tag chips across briefing, board, detail, and tag dictionary measured 22px high, 999px radius, and 520 font weight
  - task-detail tags have visible borders again
  - board status/tag chips use non-bold 520 font weight
  - console errors/warnings were 0.
- Browser validation after the wide-screen briefing side correction:
  - in a temporary 1920px-wide viewport, briefing content columns measured `460px 900px`
  - `오늘 업무 큐`, `오늘 일정`, and `내 메모` columns measured `289px 289px 289px`
  - queue/agenda cards measured 289px wide and 72px high, so they no longer appeared as narrow slivers on wide screens
  - console errors/warnings were 0, and the viewport override was reset after validation.
- Browser validation after the half-and-half briefing rebalance:
  - replaced the oversized wide-screen rule with a desktop/tablet rule that splits `오늘 브리핑` into equal halves
  - 1920px viewport: briefing columns measured `641.5px 641.5px`; the right half split into `202.8px` columns
  - 1180px viewport: briefing columns measured `447.5px 447.5px`; the right half split into `137.5px` columns
  - memo textarea stayed inside the memo column in both viewports
  - D labels shared a single left and right edge in both viewports
  - viewport override was reset after validation, and build passed.
- Browser validation after briefing meaning / 55-45 balance pass:
  - `오늘 시작할 업무` caption now says `오늘이 시작일인 업무`
  - `오늘 집중 업무` caption now says `중요도 높은 업무`
  - `오늘 업무 큐` has helper text `우선순위·마감 기준 자동 추천`
  - 1920px viewport: briefing columns measured `705.6px 577.4px`, making the left list about 10% wider than half
  - all briefing captions were unclipped
  - D labels shared a single left and right edge
  - memo textarea stretched vertically to 226px and stayed inside the memo column
  - console errors/warnings were 0, viewport override was reset, and build passed.
- Browser validation after removing today queue / 65-35 pass:
  - `오늘 업무 큐` was removed from the briefing side panel
  - briefing split now measures `833.9px 449.1px` at 1920px, matching left 65% and right 35%
  - right side split measures `182.6px 243.5px`, matching today agenda 15% and memo 20%
  - today agenda first line shows `업무/이준호`; the second line shows status/progress such as `진행중 · 67%`
  - D labels shared a single left and right edge
  - console errors/warnings were 0, viewport override was reset, and build passed.
- Browser validation after board priority / typography alignment pass:
  - added a board-only `중요도` filter beside the tag filter; selecting `높음` reduced the board from 9 cards to 3 cards, all with `높음`, and returning to `전체` restored 9 cards
  - team briefing due labels (`D-1`, `D-14`, `오늘`, `D+2`, `D+1`, `D-3`, `D-6`) all shared right edge `1057` in the 1920px viewport
  - today agenda now shows task assignee on the first line (`업무/이준호`) and task status as a small status chip such as `⚙️ 진행`
  - board status-guide text, board card title/date text, task-detail title, stickers, and compact metadata use calmer font weights
  - top account identity measured `scrollWidth === clientWidth`, so the one-line name/role display was not clipped
  - build passed. Browser logs still retained an old React HMR dependency-length message from the live-edit moment; it did not block rendering and should disappear after a dev-server restart.
- Browser validation after shared memo / repeat marker / due rail pass:
  - `내 메모` is now `메모`; state is stored in `memoByPage`, with legacy `personalNotes`/`sharedMemo` only used as import/migration fallbacks
  - switching between `전체 업무흐름` and `오늘 브리핑` showed independent memo values for each page
  - memo textarea uses content-based sizing, grew from 96px to 109px during long-input validation, and was cleared back to an empty value afterward
  - `오늘 일정` is capped with `max-height: 196px` and `overflow-y: auto`, so many agenda items scroll inside the agenda area instead of pushing the whole briefing downward
  - recurring tab showed `반복 업무 4` in the tested team view
  - repeat markers across board/detail/timeline/legend measured transparent background and `0px` border; board chips measured 19px high with 520 font weight
  - status-history typography measured 11.5px and 520-560 weight, matching the calmer metadata tone
  - team briefing due labels shared one rail in both 1920px (`left 1015/right 1057`) and 1180px (`left 763/right 805`) viewports
  - console errors/warnings were 0, viewport override was reset, and build passed.
- Browser validation after briefing side-panel / agenda / filter pass:
  - account identity measured `scrollWidth === clientWidth`, so one-line name/role display was not clipped
  - `오늘 브리핑` measured a 60/40 split at 1920px, and the side panel split `오늘 일정`/`메모` into equal columns
  - today agenda height and memo textarea now follow briefing content up to an internal scroll cap
  - today agenda task rows show `업무/담당자` on the first line, put the small status chip at the right, hide progress percent, and show overdue due-day active tasks as `계획대비 지연`
  - board card repeat markers appear only as the repeat icon at the task-title row end, not as `(7월 3일 반복)` text
  - the board priority filter no longer has the confusing square icon, and tag/priority filter gap measured 8px
  - team briefing due labels (`D-1`, `D-14`, `오늘`, `D+2`, `D+1`, `D-3`, `D-6`) all start at the same x-position inside a fixed 48px due rail
  - build passed. Browser logs may still retain an old HMR `sharedMemo is not defined` entry from live-editing; a clean rendered tab and source search confirmed the current render path uses `memoByPage`.
- Browser validation after agenda / calendar / performance clarification pass:
  - `오늘 일정` cards were reduced for the two-line structure; at 1920px the tested team agenda item measured about `44.6px` high
  - team briefing due labels (`D-1`, `D-14`, `오늘`, `D+2`, `D+1`, `D-3`, `D-6`) all used the same `left 944.8px / width 48px` rail in the preview build
  - calendar legend now labels task entries as `업무 종료일` and includes `ⓘ 업무 일정은 계획된 업무 종료일 기준입니다.`
  - task detail now uses the same schedule-risk language as agenda/timeline; the active due-day task showed `계획대비 지연`
  - calendar-side task detail has narrower status-history columns so `처리내용` keeps more horizontal space in the right panel
  - performance export option now says `원문 근거 줄 포함`; the tooltip clarifies it only adds source lines to copied/saved Markdown, not visible report cards
  - monthly performance detail labels (`✓ 완료`, `+ 계획`) use flex icon labels with a 48px label column and aligned body text
  - build passed, preview was verified on `http://127.0.0.1:4173/`, viewport override was reset, and the preview server was stopped afterward.
- Browser validation after sticker/readability wording pass:
  - calendar legend order is now `팀 일정 -> 개인 일정 -> 업무 일정`, and the note reads `ⓘ 업무 일정은 계획된 업무 종료일 기준입니다.`
  - calendar legend sticker weight measured 540, keeping the chips lighter than before
  - personal briefing greeting is time-aware: morning says `좋은 아침입니다.`, afternoon says `오늘도 차분히 챙겨볼까요?`, evening says `오늘 진행 상황을 정리해볼까요?`, late night says `늦은 시간까지 고생 많으셨어요.`
  - sidebar nav text measured 560 weight for normal items and 620 for the active item; role text in the team list measured 500
  - account identity measured `clientHeight === scrollHeight === 20`, reducing the previous top-clipping risk
  - performance export option now says `저장/복사용 전체 데이터 포함`, with tooltip text explaining it adds full underlying data to copied/saved output
  - performance report detail rows no longer include update-log rows labeled `진행`
  - calendar-side status-history row for `지난 달 완료 업무 회고` used `58px 38px 161px` columns, and `완료 처리` stayed inside the `처리내용` column
  - build passed, preview was verified on `http://127.0.0.1:4173/`, viewport override was reset, and the preview server was stopped afterward.
- Browser validation after explicit detail-open behavior pass:
  - task details now render only when the user explicitly clicks a task or briefing group; `selectedTaskId` can remain persisted without forcing a visible detail panel
  - board, recurring, and archive task details use the right-side sticky workflow column; timeline task details remain below the timeline as a wide panel
  - switching between board/timeline/recurring/archive/full-page views closes the current detail panel so stale details do not carry into the next tab
  - clicking a briefing card while on timeline returns the view to `board` and opens the briefing detail in the right briefing column
  - task detail and briefing bundle panels have close buttons
  - greeting logic now reflects the team's usual 07:00-18:00 workday: pre-7am planning, morning greeting, daytime check-in, evening wrap-up, and late-night acknowledgement
  - performance controls now say `이슈/설명 포함 상세실적 보기` and `저장/복사 시 전체 데이터 포함`
  - preview validation confirmed: recurring had no detail before click, recurring click opened right detail, close hid it, timeline click opened below detail, timeline-to-briefing switched to board/right detail, board click opened right detail, viewport override was reset, preview server was stopped, and build passed.
- Browser validation after latest contextual-detail and greeting pass:
  - board initial layout had no right/detail column and used one full-width grid column (`1677px`)
  - timeline initial layout had no detail and used one full-width grid column (`1677px`)
  - clicking a timeline task changed the workflow grid to `1325px 340px`, placed task detail at the right (`x=1553`), and did not render the old `.workflow-detail-wide`
  - personal greeting rendered a wrap-up tone after 17:00 and included a briefing-derived overdue hint
  - calendar task detail history rows rendered at `11.5px` with compact columns `64px 42px 151px`
  - browser console errors/warnings were 0
  - build passed on `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`; preview was verified on `http://127.0.0.1:4174/` and stopped afterward.
- Browser validation after typography/link-filter restoration pass:
  - personal greeting included an emoji and briefing-derived hint
  - briefing task-title font weight measured `660`
  - top search input font size measured `12.5px`
  - detail `관련 링크` and `업데이트 로그` headings measured `12.5px` and `620` weight
  - quick update textarea measured `58px`; `남기기` button measured `47x28`
  - inline related-link form appeared in both board task detail and calendar task detail
  - timeline showed the same `중요도` filter as board
  - calendar task detail panel used common `detail-panel` styling with `1px` border, `8px` radius, and matching small shadow
  - browser console errors/warnings were 0
  - build passed on `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`; browser validation used the active dev server at `http://127.0.0.1:5173/`.
- Build validation after the emoji-picker and documentation pass:
  - shared emoji popover uses a portal to avoid clipping inside cards or scroll panels
  - emoji options render as emoji-only buttons, with search/title/accessibility labels retained
  - calendar-side task-detail actions are compact without changing the common task-detail size elsewhere
  - unused legacy `.emoji-picker-grid` CSS was removed
  - production replacement note for `emoji-picker-react` is recorded in `DESIGN.md`, `TODO.md`, and this handoff
  - build passed on `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`.
- Supabase decision/schema prep:
  - approved architecture direction is Supabase/Postgres with email/password first
  - signup defaults to `member`; administrator role is granted separately
  - future company SSO should reuse the same `public.users` profile model
  - created `supabase/migrations/001_initial_dashboard_schema.sql`
  - created `docs/supabase-start-guide.md`
  - added `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - SQL has not yet been executed against a Supabase project.
- Supabase client integration start:
  - installed `@supabase/supabase-js`
  - added `src/supabaseClient.js` for env-driven Supabase activation
  - added `src/supabaseStore.js` with first auth/read/preference adapter scaffolding
  - updated `src/storage.js` with a reusable dashboard snapshot helper while preserving the localStorage adapter
  - added a top-bar status pill: `로컬 저장` when env values are missing, `Supabase 준비` when present
  - updated `vite.config.js` to split `supabase` and `vendor` chunks
  - build passed after the integration scaffold
- Live Supabase project connection:
  - project confirmed: `work-dashboard`, id/ref `nbefvcrcfwacvnohtsmy`, region `ap-northeast-1`
  - local `.env.local` was created with the project URL and publishable key and is ignored by Git
  - applied two live migrations through the Supabase connector:
    - `20260605105710 initial_dashboard_core_schema`
    - `20260605105800 initial_dashboard_rls_policies`
    - `grant_data_api_table_access` was later applied to manually grant Data API table privileges because automatic table exposure was disabled
    - `promote_first_admin` promoted `seulgis@posco.com` to admin after signup
  - real Supabase login/signup UI now appears when env values are configured
  - browser check confirmed the login/signup tabs render and missing-session state no longer shows an error

## Risks and Notes

- Git baseline exists on `main`; current Supabase work is on `codex/supabase-integration`.
- `src/styles.css` is large and still contains layered overrides. A small cleanup pass has started, but production hardening should continue by moving feature sections into clearer layers or CSS modules.
- Current auth/admin/permission behavior is UI-only and localStorage-backed until the Supabase project is connected. It is not secure yet.
- Current persistence is browser-local only. It is not multi-user yet.
- Supabase schema/RLS is applied, but CRUD wiring is not complete yet.
- Manual Data API grants are applied; keep `supabase/migrations/001_initial_dashboard_schema.sql` grant section in sync if new tables are added while automatic table exposure stays disabled.
- First admin account `seulgis@posco.com` has been promoted to admin.
- Supabase store is partially wired for auth/session only; task CRUD still uses the local prototype state.
- Full emoji support is not installed yet. The current picker is a prototype; install and wire `emoji-picker-react` during the production implementation stage after dependency approval.
- `prototype.html` is not feature parity and should not drive future implementation.
- Avoid adding dependencies unless necessary; network is restricted.
- Use `/Users/seulgi/Library/pnpm/bin/pnpm`, not plain `npm`.
- For recurring work, production should store template rule fields and generated instance history separately.
- For multi-assignee work:
  - one accountable owner with helpers: one task plus detail items
  - separate accountability/deadlines: separate tasks linked by tags/links.

## Next Prompt

```text
AGENTS.md, HANDOFF.md, TODO.md에서 계속 진행에 필요한 부분만 확인하고 현재 프로젝트를 이어서 진행해줘. HANDOFF.md의 Next Prompt 또는 TODO.md의 최상단 작업부터 바로 처리하고, 변경 후 검증 결과와 남은 리스크를 다시 HANDOFF.md/TODO.md에 업데이트해줘.

프로젝트는 `/Users/seulgi/Documents/work-dashboard`의 `연구기획그룹-전략` 업무 대시보드 React/Vite 프로토타입이다. 대표 구현은 `src/App.jsx`, `src/data.js`, `src/styles.css`, `src/storage.js`이며, `prototype.html`은 레거시 참고용이다.

다음 우선순위는 task/tags/calendar/memo CRUD를 Supabase 테이블에 연결하는 것이다. 현재는 실제 auth/session과 admin 승격까지 완료됐고, 대시보드 업무 데이터는 아직 localStorage/prototype 상태를 사용한다. localStorage fallback과 현재 UI 동작을 유지하면서 Supabase read path부터 연결하고, 변경 후 `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`와 가능한 브라우저 시각 검증을 수행해줘. 실제 프로덕션 전에는 별도로 수동 키보드 QA도 진행해야 한다.
```
