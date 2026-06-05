# TODO

## Now

- [ ] Add localStorage persistence to the React/Vite prototype.
  - Target files: `src/App.jsx`, optionally `src/data.js`.
  - Persist at minimum: `tasks`, `availableTags`, `calendarEvents`, selected person, active page/view if useful.
  - Required behavior: add/edit/status/archive/restore/subtask/update/calendar/tag changes survive refresh.
  - Verify: make one change for each core domain, refresh `http://127.0.0.1:5175/`, confirm state remains.

- [ ] Consolidate recent CSS overrides in `src/styles.css`.
  - Target file: `src/styles.css`.
  - Goal: reduce duplicate `.timeline-bar`, calendar, board, and update-card rules created during iterative visual tuning.
  - Verify: `rg -n "Last-mile|Final cleanup|timeline-bar \\{" src/styles.css` shows a cleaner structure; key screenshots remain visually equivalent.

- [ ] Complete a fresh mobile/narrow viewport pass after the latest card cleanup.
  - Target files: `src/App.jsx`, `src/styles.css`.
  - Verify: around `390x844`, no document-level horizontal overflow and board/update/calendar views remain usable.

## Next

- [ ] Make recurring-work rules more explicit in the prototype UI.
  - Current fields: `반복`, `반복 세부`, `반복 기간`.
  - Improve copy/structure so examples like `매월 첫째 주 월-수`, `3일 업무`, `월요일 시작` are understandable.
  - Verify: add/edit modal clearly explains how monthly/weekly recurrence should be configured without long helper text.

- [ ] Prototype recurring-instance generation behavior.
  - Candidate approach: add a preview or generated-instance section for recurring tasks.
  - Preserve rule: generated monthly/weekly instances should copy subtasks from the source template.
  - Verify: a monthly recurring task shows future generated instances in timeline/calendar without manually duplicating the template.

- [ ] Improve board drag-and-drop affordance.
  - Target files: `src/App.jsx`, `src/styles.css`.
  - Add visible dragging/drop-target states.
  - Verify manually in the browser because current automation could not call `dragTo`.

- [ ] Decide what to do with `prototype.html`.
  - Options: update it to match React/Vite, mark it as legacy fallback, or remove it before handoff to developers.
  - Verify: `HANDOFF.md` and README-style notes do not point future work to a stale artifact.

## Later

- [ ] Replace `example.com` sample links with realistic internal-document mock links.
- [ ] Add role perspective toggle for team leader vs team member.
- [ ] Add richer task grouping presets using tags such as `기획보고`, `임원보고`, `자료조사`, `전략과제`.
- [ ] Add exportable requirements note or screen-flow summary for designer/developer handoff.
- [ ] Add keyboard accessibility checks for board cards, modals, filters, calendar, and update entry.
