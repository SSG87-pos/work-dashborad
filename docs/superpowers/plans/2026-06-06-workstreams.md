# Workstreams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `상위 업무흐름` model that recommends a report/mindmap grouping from task names first, then uses tags as secondary evidence.

**Architecture:** Keep the first pass local and deterministic. Add pure helpers for workstream normalization/recommendation/grouping, store the confirmed workstream label on each task, and let task registration, mindmap, detail, and performance reporting read the same field.

**Tech Stack:** React 19, Vite 4, plain JavaScript modules, existing Node check scripts, localStorage/Supabase-compatible task objects.

---

### Task 1: Workstream Helper Checks

**Files:**
- Create: `src/workstreams.js`
- Create: `scripts/check-workstreams.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing check**

```js
import assert from "node:assert/strict";
import {
  deriveWorkstreamLabel,
  recommendWorkstream,
  groupTasksByWorkstream
} from "../src/workstreams.js";

const existing = [{ label: "혁신아이디어 추진" }];
assert.equal(deriveWorkstreamLabel("혁신아이디어 행사 기획"), "혁신아이디어 추진");
assert.equal(recommendWorkstream({ title: "혁신아이디어 중간평가", tags: ["행사", "기획보고"] }, existing).label, "혁신아이디어 추진");
assert.equal(groupTasksByWorkstream([
  { id: "a", title: "혁신아이디어 중간평가", workstream: "혁신아이디어 추진" },
  { id: "b", title: "혁신아이디어 행사 기획", tags: ["행사"] }
])[0].label, "혁신아이디어 추진");
```

- [ ] **Step 2: Run the check to verify it fails**

Run: `/Users/seulgi/Library/pnpm/bin/pnpm run check:workstreams`

Expected: FAIL because `src/workstreams.js` is missing.

- [ ] **Step 3: Implement deterministic helper logic**

Create `src/workstreams.js` with:
- Korean/English token normalization
- 업무명 prefix extraction before action words such as `중간평가`, `행사 기획`, `자료정리`
- existing workstream matching before creating a new label
- stable grouping with assigned workstream first, recommendation second

- [ ] **Step 4: Run the check to verify it passes**

Run: `/Users/seulgi/Library/pnpm/bin/pnpm run check:workstreams`

Expected: PASS with `workstream checks passed`.

### Task 2: Task Data Wiring

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/data.js`
- Modify: `src/storage.js`

- [ ] **Step 1: Add failing expectations to `scripts/check-workstreams.mjs`**

Check that saved task-shaped data receives a recommended workstream and that existing confirmed values are preserved.

- [ ] **Step 2: Implement local task defaults**

Add `workstream` to task initialization/import/save paths, using `recommendWorkstream` when the field is blank.

- [ ] **Step 3: Show/edit in the task modal and detail**

Add a compact `상위 업무흐름` input after `업무명`, with helper text that says it is used for mindmap/performance grouping.

### Task 3: Mindmap and Performance Wiring

**Files:**
- Modify: `src/mindmapData.js`
- Modify: `src/MindmapView.jsx`
- Modify: `src/App.jsx`
- Modify: `scripts/check-mindmap-structure.mjs`

- [ ] **Step 1: Add workstream mindmap checks**

Expect the root branch to be workstream first, with Category/tag as lower branches.

- [ ] **Step 2: Update mindmap builder**

Group tasks by workstream first, then Category presets/tags. Keep group/tag clicks filtering tags and task clicks opening common detail.

- [ ] **Step 3: Update performance grouping**

For monthly/quarterly/yearly reports, group items by workstream and keep source tasks available in copy/export.

### Task 4: Documentation and QA

**Files:**
- Modify: `DESIGN.md`
- Modify: `HANDOFF.md`
- Modify: `TODO.md`

- [ ] **Step 1: Document the product contract**

Record that `상위 업무흐름` is one report/mindmap grouping field, while tags remain multi-select filter metadata.

- [ ] **Step 2: Verify checks and build**

Run:
`/Users/seulgi/Library/pnpm/bin/pnpm run check:workstreams`
`/Users/seulgi/Library/pnpm/bin/pnpm run check:mindmap-structure`
`/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`
`CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`

- [ ] **Step 3: Browser QA**

Open the dev server, verify task modal workstream suggestion, mindmap workstream root, performance report grouping, console health, and no horizontal overflow.
