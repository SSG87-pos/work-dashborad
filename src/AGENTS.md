# AGENTS.md

## Module Context

`src/` contains the active React/Vite dashboard prototype. Most product state, view routing, task behavior, and component rendering currently live in `App.jsx`; CSS is centralized in `styles.css`; local persistence is wrapped by `storage.js`.

## Commands

- Build from the repository root: `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`.
- Verify live UI through `http://127.0.0.1:5173/` when the dev server is running.

## Implementation Patterns

- Keep task CRUD, selection, archive, recurring, update log, and report behavior in existing helper boundaries before introducing new modules.
- Use `selectedTaskId` for remembered task identity and `isDetailOpen` for actual detail visibility.
- Use `detailContext` to decide whether task detail belongs to briefing or workflow.
- Use `memoByPage` for page-scoped shared memo state.
- Use `tasksWithRecurringInstances` and recurring helpers for derived recurring views; do not save duplicate future tasks just to show previews.
- Use `taskProgress(task)` for progress display and calculation.
- Use `taskTags(task)`, `tagTone(tag)`, and tag preset helpers for tag display/filtering.
- Route persistence through `localDashboardStore` in `storage.js`.

## CSS Rules

- `styles.css` has accumulated late override layers. Prefer targeted edits near the latest relevant rule, and avoid broad resets.
- Before adding a new visual rule, search for existing selectors for the same component.
- Preserve the final approved contracts:
  - briefing task titles remain readable and stronger than helper text
  - tags use calm rounded chips consistently across briefing, board, detail, updates, forms, and tag library
  - status and priority chips stay compact and not overly bold
  - repeat markers are icon-only, without colored sticker boxes
  - task detail section headings are lighter than task titles
  - update textareas are larger than their submit buttons
  - calendar task detail must match common task detail styling
  - timeline uses soft solid status colors matching the legend.

## Local Golden Rules

- Do not reintroduce board card description text; descriptions belong in task detail.
- Do not show disabled gray status controls for tasks the current user cannot manage; hide unavailable controls.
- Do not show recurring title suffix text such as `(7월 3일 반복)` on cards.
- Do not move calendar task detail back to a separate mini-card style.
- Do not make landing-page or marketing-style layouts; this is an internal work dashboard.
- Do not change the board order: `검토/대기`, `계획`, `진행중`, `완료`, `보류`.

## Testing Strategy

- After visual or interaction edits, run the build command.
- Browser-check the exact affected flow:
  - briefing click opens briefing-side detail
  - board card click opens workflow-side detail
  - timeline card click opens workflow-side detail
  - calendar task click opens common task detail
  - recurring/archive task click opens workflow-side detail
  - updates scope and performance filters still render.
- Check console warnings/errors before claiming UI work is complete.
