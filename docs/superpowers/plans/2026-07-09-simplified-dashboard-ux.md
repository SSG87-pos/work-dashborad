# Simplified Dashboard UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Work Dashboard first screen calmer and more intuitive by adding compact guidance actions, making today work visible immediately, and simplifying top-level labels for older/non-specialist users.

**Architecture:** This is a frontend-first refactor with no backend or persistence schema changes. Reuse existing `App.jsx` state handlers, `InsightStrip`, `BriefingPanel`, and workflow views; add one small guidance component and CSS rules instead of replacing the dashboard shell.

**Tech Stack:** React 19, Vite 4, lucide-react, motion, plain CSS in `src/styles.css`, Node-based static check scripts.

**Correction after browser review:** The first implementation added a four-button guidance strip, but user review found that it made the first screen feel more complex. The final implementation should not render that guidance strip by default. It should show `오늘 브리핑`/today work first and keep the full board/filter workflow behind one quiet `전체 업무 보기` action.

---

## File Structure

- Create: `scripts/check-simplified-ux.mjs`
  - Static guardrail that checks the approved Korean labels, component hook points, CSS classes, and design-doc text are present.
- Modify: `package.json`
  - Add `check:simplified-ux`.
- Modify: `src/App.jsx`
  - Rename visible navigation labels.
  - Add `GuidedActionStrip`.
  - Render compact action buttons above `BriefingPanel`.
  - Wire buttons to existing handlers: today focus, task creation, team page, materials/highlights.
- Modify: `src/styles.css`
  - Add compact guidance strip styling.
  - Tune spacing so the guidance strip does not push `오늘 브리핑` too far down.
  - Keep phone/tablet behavior compact.
- Modify: `DESIGN.md`
  - Record the approved simplification contract.
- Modify: `HANDOFF.md`
  - Record the branch-level UI direction for future continuation.
- Modify: `TODO.md`
  - Add the implementation and verification status.

## Task 1: Add A Static UX Contract Check

**Files:**
- Create: `scripts/check-simplified-ux.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the failing check script**

Create `scripts/check-simplified-ux.mjs`:

```js
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(file, source, expected) {
  if (!source.includes(expected)) {
    throw new Error(`${file} is missing required text: ${expected}`);
  }
}

const app = read("src/App.jsx");
const css = read("src/styles.css");
const design = read("DESIGN.md");

[
  "오늘",
  "팀 업무",
  "일정",
  "자료/보고",
  "오늘 확인",
  "업무 등록",
  "팀 상황",
  "자료 찾기",
  "GuidedActionStrip",
  "guided-action-strip"
].forEach((text) => assertIncludes("src/App.jsx", app, text));

[
  ".guided-action-strip",
  ".guided-action-button",
  ".guided-action-copy"
].forEach((text) => assertIncludes("src/styles.css", css, text));

[
  "작은 안내판",
  "오늘 할 일",
  "40대"
].forEach((text) => assertIncludes("DESIGN.md", design, text));

console.log("Simplified UX contract check passed.");
```

- [ ] **Step 2: Add the package script**

In `package.json`, add this script near the other `check:*` scripts:

```json
"check:simplified-ux": "node scripts/check-simplified-ux.mjs",
```

- [ ] **Step 3: Run the check and verify it fails**

Run:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run check:simplified-ux
```

Expected: FAIL because `GuidedActionStrip`, `.guided-action-strip`, and the new `DESIGN.md` contract do not exist yet.

- [ ] **Step 4: Commit the failing guardrail**

Run:

```bash
git add package.json scripts/check-simplified-ux.mjs
git commit -m "test: add simplified ux contract check"
```

## Task 2: Add Compact Guidance Actions To The First Screen

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the component**

Add this component near `InsightStrip` in `src/App.jsx`:

```jsx
function GuidedActionStrip({ onAddTask, onOpenMaterials, onOpenTeam, onTodayFocus }) {
  const actions = [
    {
      key: "today",
      icon: Sparkles,
      title: "오늘 확인",
      description: "내 브리핑과 마감 업무",
      onClick: onTodayFocus
    },
    {
      key: "add",
      icon: Plus,
      title: "업무 등록",
      description: "새 업무나 간단 메모",
      onClick: onAddTask
    },
    {
      key: "team",
      icon: ClipboardList,
      title: "팀 상황",
      description: "공유 업무 진행판",
      onClick: onOpenTeam
    },
    {
      key: "materials",
      icon: FileText,
      title: "자료 찾기",
      description: "노트, 로그, Wiki",
      onClick: onOpenMaterials
    }
  ];

  return (
    <section className="guided-action-strip" aria-label="주요 업무 바로가기">
      {actions.map(({ description, icon: Icon, key, onClick, title }) => (
        <button className="guided-action-button" key={key} onClick={onClick} type="button">
          <span className="guided-action-icon" aria-hidden="true">
            <Icon size={17} />
          </span>
          <span className="guided-action-copy">
            <strong>{title}</strong>
            <small>{description}</small>
          </span>
        </button>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Add handler helpers inside `App` before `return`**

Add these functions after `const isBriefingDetailContext = ...`:

```jsx
  function focusTodayWork() {
    setActivePage("my");
    changeWorkflowView("board");
    setSummaryFilter("");
    closeTaskDetail();
  }

  function openTeamWork() {
    setActivePage("team");
    changeWorkflowView("board");
    closeTaskDetail();
  }

  function openMaterialsView() {
    setActivePage("team");
    setActiveView("performance");
    closeTaskDetail();
  }
```

- [ ] **Step 3: Render the guidance strip**

Replace the current insight-only first-screen area:

```jsx
        {!fullPageViews.includes(activeView) && <InsightStrip activeFilter={summaryFilter} onSelect={applySummaryFilter} summary={summary} />}
```

with:

```jsx
        {!fullPageViews.includes(activeView) && (
          <>
            <GuidedActionStrip
              onAddTask={() => openTaskEditor(createBlankTask(defaultTaskOwnerId, selectedPersonId))}
              onOpenMaterials={openMaterialsView}
              onOpenTeam={openTeamWork}
              onTodayFocus={focusTodayWork}
            />
            <InsightStrip activeFilter={summaryFilter} onSelect={applySummaryFilter} summary={summary} />
          </>
        )}
```

- [ ] **Step 4: Run the static check and verify partial progress**

Run:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run check:simplified-ux
```

Expected: still FAIL because CSS and `DESIGN.md` have not been updated.

- [ ] **Step 5: Commit the component wiring**

Run:

```bash
git add src/App.jsx
git commit -m "feat: add guided dashboard action strip"
```

## Task 3: Simplify Top-Level Labels

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Change sidebar visible labels and titles**

Update the sidebar buttons:

```jsx
title="오늘"
...
<span>오늘</span>
```

```jsx
title="팀 업무"
...
<span>팀 업무</span>
```

```jsx
title="일정"
...
<span>일정</span>
```

For the current `Highlights` button, use:

```jsx
title="자료/보고"
...
<span>자료/보고</span>
```

Keep the existing `Canvas` and `관리자` labels.

- [ ] **Step 2: Keep the existing route behavior**

Do not change the `onClick` bodies except for label updates. The mappings remain:

```jsx
오늘 -> activePage "my", activeView "board"
팀 업무 -> activePage "team", activeView "board"
일정 -> activeView "calendar"
자료/보고 -> activeView "performance"
```

- [ ] **Step 3: Run the static check**

Run:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run check:simplified-ux
```

Expected: still FAIL until CSS and `DESIGN.md` are updated.

- [ ] **Step 4: Commit label simplification**

Run:

```bash
git add src/App.jsx
git commit -m "feat: simplify dashboard navigation labels"
```

## Task 4: Style The Balanced First Screen

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add desktop styling**

Add near the current `.insight-strip` rules:

```css
.guided-action-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.guided-action-button {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  min-height: 58px;
  border: 1px solid #dbe5ef;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.94);
  color: #172033;
  padding: 10px 11px;
  text-align: left;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.guided-action-button:hover,
.guided-action-button:focus-visible {
  border-color: #9bbcf6;
  background: #f7fbff;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.1);
}

.guided-action-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #eef6ff;
  color: #2563eb;
}

.guided-action-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.guided-action-copy strong {
  color: #111827;
  font-size: 14px;
  font-weight: 760;
  line-height: 1.15;
}

.guided-action-copy small {
  color: #66758a;
  font-size: 12px;
  line-height: 1.25;
}
```

- [ ] **Step 2: Add tablet/phone behavior**

Add near the existing responsive dashboard rules:

```css
@media (max-width: 980px) {
  .guided-action-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .guided-action-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 8px;
  }

  .guided-action-button {
    grid-template-columns: 28px minmax(0, 1fr);
    min-height: 48px;
    padding: 8px;
  }

  .guided-action-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
  }

  .guided-action-copy strong {
    font-size: 12.5px;
  }

  .guided-action-copy small {
    display: none;
  }
}
```

- [ ] **Step 3: Run the static check**

Run:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run check:simplified-ux
```

Expected: still FAIL until `DESIGN.md` is updated.

- [ ] **Step 4: Commit CSS**

Run:

```bash
git add src/styles.css
git commit -m "style: add compact guided action styling"
```

## Task 5: Update Design And Handoff Docs

**Files:**
- Modify: `DESIGN.md`
- Modify: `HANDOFF.md`
- Modify: `TODO.md`

- [ ] **Step 1: Update `DESIGN.md`**

Add this under `### Today Briefing` or near the current first-screen rules:

```markdown
- For the simplified dashboard direction approved on 2026-07-09, the first `오늘` screen should use a small guidance strip above the work list, not a large hero panel. The strip uses four plain actions: `오늘 확인`, `업무 등록`, `팀 상황`, and `자료 찾기`.
- The guidance strip is intentionally smaller than `오늘 할 일`/`오늘 브리핑` content. It should help 40대 이상 and non-specialist users find the next place to go without pushing the real work list below the fold.
- Use plain Korean labels over product jargon. Top-level user-facing navigation should prefer `오늘`, `팀 업무`, `일정`, and `자료/보고` over English labels where practical.
```

- [ ] **Step 2: Update `TODO.md`**

Add a new `Now` item:

```markdown
- [ ] Implement simplified dashboard first-screen UX on `codex/simplified-dashboard-ux`.
  - Direction: compact guidance strip plus immediately visible today work list.
  - Guardrail: preserve existing task detail contexts, backend mode behavior, and workflow views.
  - Verification: `check:simplified-ux`, `check:summary-filter`, production build, and browser QA across desktop/tablet/phone.
```

- [ ] **Step 3: Update `HANDOFF.md`**

Add a current-state bullet:

```markdown
- 2026-07-09 simplified dashboard UX branch: `codex/simplified-dashboard-ux` changes the user-facing first-screen direction for 40대 이상/non-specialist users. The approved approach is a compact guidance strip (`오늘 확인`, `업무 등록`, `팀 상황`, `자료 찾기`) followed immediately by the real today work list, plus simpler top-level labels (`오늘`, `팀 업무`, `일정`, `자료/보고`). This should stay frontend-only unless a later implementation explicitly expands scope.
```

- [ ] **Step 4: Run the static check**

Run:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run check:simplified-ux
```

Expected: PASS with `Simplified UX contract check passed.`

- [ ] **Step 5: Commit docs**

Run:

```bash
git add DESIGN.md HANDOFF.md TODO.md
git commit -m "docs: record simplified dashboard ux contract"
```

## Task 6: Full Verification And Browser QA

**Files:**
- No source changes expected unless verification finds a bug.

- [ ] **Step 1: Run static checks**

Run:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run check:simplified-ux
/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Run production build**

Run:

```bash
CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build
```

Expected: Vite production build succeeds.

- [ ] **Step 3: Start the dev server**

Run:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run dev
```

Expected: Vite serves the app, usually at `http://127.0.0.1:5173/`. If the port is occupied, use the URL Vite prints.

- [ ] **Step 4: Browser-check desktop**

At around `1366x768`, verify:

- Sidebar labels read `오늘`, `팀 업무`, `일정`, `자료/보고`, `Canvas`, and `관리자` when admin is visible.
- The first work screen shows the compact guidance strip above the insight cards and `오늘 브리핑`.
- `업무 등록` opens the existing task creation modal.
- `팀 상황` switches to the team board.
- `자료 찾기` opens the existing Highlights/materials area.
- Selecting a briefing row still opens briefing-side task detail.

- [ ] **Step 5: Browser-check tablet and phone**

At around `768x1024` and `390x844`, verify:

- Guidance buttons wrap to two columns.
- Button text does not overflow.
- The work list/briefing content appears without page-level horizontal overflow.
- Existing mobile top actions (`검색`, compact `AI`, `업무 추가`) remain usable.

- [ ] **Step 6: Commit any verification fixes**

If fixes were needed:

```bash
git add src/App.jsx src/styles.css DESIGN.md HANDOFF.md TODO.md scripts/check-simplified-ux.mjs package.json
git commit -m "fix: verify simplified dashboard ux"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: The plan covers the approved compact guidance strip, today-first screen, simplified labels, frontend-only boundary, visual tone, docs, and verification.
- Placeholder scan: No `TBD`, `TODO`, or incomplete implementation steps are present.
- Type consistency: The planned component props match existing `App` handler names or handlers introduced in Task 2.
