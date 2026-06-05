# HANDOFF

## Scope

Mainline handoff for `/Users/seulgi/Documents/work-dashboard`.

Project goal: build a clickable React/Vite prototype for the `연구기획그룹-전략` shared work dashboard. The app should support a personal daily briefing first, a public whole-team workflow view, leader/member task assignment visibility, tag-based grouping, task detail/logging, calendar, timeline, recurring work, archiving, and form-based task creation/editing.

Last updated: 2026-06-04

## Current State

- Workspace: `/Users/seulgi/Documents/work-dashboard`
- Git state: no commits yet on `main`; all project files are untracked.
- Canonical implementation: React/Vite app under `src/`.
- Local app URL used for verification: `http://127.0.0.1:5175/`
- Package manager: use `/Users/seulgi/Library/pnpm/bin/pnpm`.
- Build command: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`
- Static fallback artifact: `prototype.html`, but it is no longer the canonical path for recent UI work.
- Accepted visual reference: `assets/dashboard-concept.png`.

Current product decisions:

- First page remains personal-first: selected user sees their briefing, own cards, own timeline/detail.
- Left nav includes `오늘 브리핑`, `전체 업무흐름`, `캘린더`, `업데이트`.
- `전체 업무흐름` shows public team workflow. There is no separate team-leader management panel.
- Assignment model:
  - `담당자`: task owner and board/timeline placement.
  - `업무배정자`: source category, one of `원장님`, `소장님`, `그룹장님`, `팀장님`, `개인`, `기타`.
  - `등록자`: person who entered the task.
- Task grouping/filtering is now tag-centered. The old `category` field remains only as compatibility data and is folded into task tags.
- Tasks require at least one tag in the add/edit form. Multiple tags are supported.
- Shared tag bar is visible as `태그`; tags can be added, renamed, deleted, selected as filters, and reused in forms.
- Today briefing uses semantic emoji icons and auto-selected groups.
- If a briefing group has one task, clicking opens the task detail directly. If it has multiple tasks, it opens a `브리핑 묶음` detail first.
- Completed and held tasks can be archived. Archived tasks are hidden from main board/timeline/briefing and shown in `보관함`.
- Timeline excludes weekends in monthly mode, has month/year modes, and uses solid soft colors without progress gradients.
- Task progress is calculated from completed subtasks when subtasks exist; otherwise it uses manual progress.
- Calendar shows `업무 마감`, `팀 일정`, and `개인 일정` with fixed color rules.
- Updates can be added directly from task detail and are collected in a dedicated `업데이트` view by task.

## Completed Work

- Created the React/Vite prototype scaffold and sample data.
- Added 1 team leader and 6 member sample users for `연구기획그룹-전략`.
- Implemented personal/team scopes, search, summary cards, board, timeline, calendar, recurring list, archive, update view, and right-side task detail.
- Implemented task add/edit modal with:
  - 담당자
  - 업무배정자
  - 등록자
  - 상태
  - 우선순위
  - 시작일/마감일
  - 반복/반복 세부/반복 기간
  - 보관 여부
  - multi-select/addable tags
  - subtasks
  - related links
  - update log entry
- Added subtask checklist in task detail. Checking subtasks updates progress.
- Added quick update entry inside task detail with preset text buttons.
- Added `업데이트` nav view:
  - hides briefing/tag/right-detail panels like a dedicated tab
  - shows only tasks with update logs
  - groups updates by task
  - highlights owner, status, progress, tags, and latest log rows
- Refined board:
  - column order changed to `검토/대기 -> 계획 -> 진행중 -> 완료 -> 보류`
  - cards support drag-and-drop status moves through HTML5 drag/drop handlers
  - priority, status badges, tags, recurring indicators use distinct shapes with calmer colors
  - team view card metadata now uses compact `원형 이름표 + 업무 기간` instead of repeated owner names
  - completed and held cards can be archived
- Refined timeline:
  - month/year controls
  - monthly mode excludes Saturday/Sunday
  - title bar shows tag, task name, and progress
  - dates moved to hover tooltip
  - clipped bars show edge markers and tooltip explains work continues outside the selected range
  - recurring tasks have a subtle patterned treatment
  - today marker is a vertical guide
- Refined calendar:
  - removed heavy weekend red backgrounds; weekend text/numbers are red only
  - added calendar add form for team/personal events
  - added task due items by task due date
  - fixed visual color rules:
    - `업무 마감`: orange
    - `팀 일정`: blue
    - `개인 일정`: green
- Added archive workflow for completed and held work.
- Added recurring metadata:
  - `recurring`
  - `recurringDetail`
  - `recurringDurationDays`
  - Current prototype treats subtasks as part of the recurring template; in a real backend, recurring instances should copy subtasks from the source task.
- Repeatedly aligned UI toward `assets/dashboard-concept.png`:
  - compact internal-dashboard density
  - light sidebar
  - concept-like right detail panel
  - calmer card and timeline styling

## Changed Files

Source and app files:

- `src/App.jsx` — main app state, views, forms, board/timeline/calendar/update/archive/detail behavior.
- `src/data.js` — sample users, tasks, statuses, tags, calendar events, recurring metadata.
- `src/styles.css` — dashboard layout, board/timeline/calendar/update styling, responsive overrides.
- `src/main.jsx` — React mount entry.
- `src/lib/utils.js` — shadcn-style `cn()` utility.
- `src/components/ui/button.jsx` — reusable button primitive.
- `package.json` — Vite/React scripts and dependencies.
- `vite.config.js` — Vite config and aliases.
- `components.json` — shadcn configuration.
- `index.html` — Vite entry HTML.
- `pnpm-lock.yaml`, `pnpm-workspace.yaml` — pnpm dependency state.
- `.gitignore` — ignores generated artifacts.
- `prototype.html` — older dependency-free static fallback.

Assets:

- `assets/dashboard-concept.png` — reference concept image the user prefers.

Docs:

- `HANDOFF.md` — this current handoff.
- `TODO.md` — current next actions.

## Remaining TODO

See `TODO.md`. Highest-priority next items:

- Add persistence for task, tag, calendar event, archive, status, subtask, and update changes.
- Make recurring work behavior more explicit and closer to production logic.
- Improve drag-and-drop visual affordance and verify manual drag in the browser.
- Decide whether to remove or retire `prototype.html` to reduce confusion.

## Validation Status

Most recent validation completed:

```bash
CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build
```

Result:

```text
✓ built in 1.54s
```

Browser validation performed in the in-app browser at `http://127.0.0.1:5175/`:

- Board order confirmed as `검토/대기`, `계획`, `진행중`, `완료`, `보류`.
- Board card owner duplication removed:
  - `.card-owner-pill` count is `0`
  - card metadata shows compact owner-circle plus period.
- Calendar legend and cards confirmed:
  - legend labels: `업무 마감`, `팀 일정`, `개인 일정`
  - task cards use orange background/left border/dot
  - team cards use blue background/left border/dot
  - personal cards use green background/left border/dot
- Update cards confirmed:
  - visible update cards: `7`
  - large owner chip hidden
  - first line uses owner circle plus task title
  - owner name appears as a small tag-line chip.
- Timeline label validation from the prior pass:
  - bars show tag, task title, progress
  - clipped bars exist for cross-month work
  - recurring bars exist and have a distinct treatment
  - tooltips are present.
- No document-level horizontal overflow was detected in latest automated checks.

Useful screenshot artifacts from final checks:

- `/private/tmp/work-dashboard-board-cards-cleanup-final.png`
- `/private/tmp/work-dashboard-calendar-color-rules-final.png`
- `/private/tmp/work-dashboard-updates-cleanup-final.png`
- `/private/tmp/work-dashboard-timeline-final-labels.png`

Validation not yet completed:

- Persistence after browser refresh.
- Manual human drag-and-drop feel. Automated browser runtime did not expose a `dragTo`/mouse API, so drag behavior was implemented and partially inspected via DOM but not fully simulated in automation.
- Full mobile pass after the latest card cleanup.
- Static `prototype.html` parity with the current React/Vite implementation.

## Risks and Notes

- All files are untracked. Do not assume a git baseline exists.
- The project has accumulated several CSS override blocks. Future styling should prefer consolidation in `src/styles.css` to avoid fighting older rules.
- React/Vite app is canonical; `prototype.html` is likely stale relative to recent features.
- Current state is in-memory only. User-entered tasks, tags, calendar events, archive status, updates, and subtasks reset on refresh.
- `npm` is unavailable in this shell; use pnpm at `/Users/seulgi/Library/pnpm/bin/pnpm`.
- Network access is restricted; avoid dependency changes unless truly needed.
- `@tanstack/react-table` and some modern UI dependencies remain installed but may not be actively used.
- The recurring-work model is still prototype-level. Recommended production model:
  - keep a recurring task template
  - store recurrence rule fields such as frequency, anchor day/week, duration, and next occurrence
  - generate monthly/weekly instances from the template
  - copy subtasks into each generated instance
  - keep archive/completion per generated instance, not only on the template.

## Next Prompt

```text
AGENTS.md, HANDOFF.md, TODO.md에서 계속 진행에 필요한 부분만 확인하고 현재 프로젝트를 이어서 진행해줘. HANDOFF.md의 Next Prompt 또는 TODO.md의 최상단 작업부터 바로 처리하고, 변경 후 검증 결과와 남은 리스크를 다시 HANDOFF.md/TODO.md에 업데이트해줘.

이번 프로젝트는 `/Users/seulgi/Documents/work-dashboard`의 `연구기획그룹-전략` 업무 대시보드 클릭형 React/Vite 프로토타입이다. 대표 구현은 `src/App.jsx`, `src/data.js`, `src/styles.css`이며, `prototype.html`은 오래된 fallback이므로 우선 기준으로 삼지 마라.

다음 액션은 `TODO.md`의 Now 항목부터 진행한다. 우선 localStorage 기반 persistence를 추가하라. 저장 대상은 tasks, availableTags, calendarEvents, selectedPersonId, active scope/view 중 필요한 항목이며, add/edit/status/archive/restore/subtask/update/calendar/tag 변경이 refresh 후 유지되어야 한다. 수정 후 `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`와 `http://127.0.0.1:5175/` 브라우저 검증 결과를 남겨라.
```
