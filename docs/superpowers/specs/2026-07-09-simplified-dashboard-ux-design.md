# Simplified Dashboard UX Design

Date: 2026-07-09
Branch: `codex/simplified-dashboard-ux`
Status: Draft for user review

## Goal

Redesign the dashboard toward a calmer, more obvious work surface for users who are mostly in their 40s or older. The current app has many useful capabilities, but the first impression can feel visually busy and function-heavy. The redesign should make the first screen answer three questions quickly:

- What should I check today?
- What should I do next?
- Where do I go if I need team-wide status?

This is a usability simplification, not a feature removal project.

## Recommended Direction

Use a hybrid of:

- **Guided dashboard:** Keep the current feature set, but introduce clear primary action areas such as `오늘 확인`, `업무 등록`, `팀 상황`, and `자료 찾기`.
- **Today-first work view:** Make the first screen prioritize today and near-term work over the full feature catalog.

This is safer than a full visual rewrite because the existing backend, workflow views, task detail behavior, AI helper, calendar, Highlights, and admin surfaces can remain in place while the entry hierarchy becomes easier to understand.

## Reference Products

### Microsoft Planner

Take:

- The `My Day`, `My Tasks`, and `My Plans` mental model.
- Three or four primary navigation destinations instead of exposing every advanced view at once.
- A single familiar place for tasks, plans, and projects.

Avoid:

- Too many enterprise/project-management terms on the first screen.
- Promoting dashboards, reports, or automation before daily work is understood.

### Todoist

Take:

- `Today` and `Upcoming` as simple time-based anchors.
- Fast task capture and a quiet task list grammar.
- Clear separation between personal tasks and team tasks.

Avoid:

- Becoming only a personal checklist. This dashboard still needs shared team workflow, evidence, history, and reporting.

### Basecamp

Take:

- The product attitude: straightforward, capable, and easy to use.
- A strong bias toward shared understanding and fewer places to look.
- Plain-language labels over feature-category jargon.

Avoid:

- Over-flattening everything into one project page. This app still has several job modes: personal briefing, team flow, calendar, updates, highlights, canvas, and admin.

### Asana

Take selectively:

- Work graph thinking: people, tasks, goals, dependencies, and evidence need to stay connected.
- Team-wide coordination patterns.

Avoid:

- A heavy AI/enterprise positioning feel on the first user-facing screen. For this audience, the interface should explain itself before AI features are emphasized.

## Proposed Information Architecture

### Sidebar

Reduce the perceived number of destinations.

Primary:

- `오늘`
- `팀 업무`
- `일정`
- `자료/보고`

Secondary or grouped:

- `Canvas`
- `관리자`

Existing internal mappings can remain:

- `오늘` maps to current My Desk.
- `팀 업무` maps to Team Flow.
- `일정` maps to Calendar.
- `자료/보고` groups Highlights and work materials.
- Admin remains permission-gated.

### Top Area

Keep the top bar quieter:

- Search
- `업무 추가`
- `AI` helper
- Account

Move density, home, backend/demo indicators, and rarely used actions out of the main scan path unless they are essential for the current mode.

### First Screen

Use four plain action tiles:

- `오늘 확인`: my briefing, today tasks, due items
- `업무 등록`: create task or quick memo/note
- `팀 상황`: team work board/list
- `자료 찾기`: notes, logs, wiki/highlights

Below that, show a short `오늘 할 일` list with:

- task title
- owner only when needed
- due signal
- status
- one clear detail action

### Workflow Area

Keep existing views but make them progressive:

- Default: a simple list or guided board.
- Secondary controls: board, list, timeline, materials, mindmap, recurring, archive.
- Advanced filters start collapsed or grouped under `필터`.

### Visual Tone

Use:

- Larger readable text for task titles and key buttons.
- Fewer accent colors.
- Stronger label clarity.
- Less gradient and decorative motion.
- More predictable button locations.

Keep:

- POSCO-inspired blue as the main brand signal.
- Calm status colors.
- Existing Korean word-preserving wrapping.

## Implementation Boundary

Phase 1 should avoid backend changes.

Likely frontend-only areas:

- `src/App.jsx`
- `src/styles.css`
- `DESIGN.md`
- `HANDOFF.md`
- `TODO.md`

No new dependencies are expected.

## Verification Plan

After implementation:

- Run `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`.
- Browser-check desktop around 1366px.
- Browser-check notebook/tablet around 980px and 768px.
- Browser-check phone around 390px.
- Verify first screen is understandable without opening task detail.
- Verify briefing detail, board/list task detail, calendar detail, and Highlights still render correctly.

## Open Review Question

Before implementation, confirm the first-screen default:

- Recommended default: `오늘` opens with the four guided action tiles above a concise `오늘 할 일` list.
- Alternative: `오늘` opens directly to a simplified list, with action tiles in a compact right panel.
