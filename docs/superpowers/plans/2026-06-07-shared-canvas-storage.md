# Shared Canvas Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Canvas tab shared across signed-in team members through Supabase while keeping local fallback behavior for offline/prototype use.

**Architecture:** Split Canvas seed/normalization helpers into a small pure module, add Supabase tables for tabs, nodes, and manual links, then wire `SharedCanvasView` to load/save through `supabaseDashboardStore.canvas`. The MVP is refresh-based shared persistence, not realtime collaboration.

**Tech Stack:** React 19, Vite, Supabase/Postgres with RLS, existing `@supabase/supabase-js` client.

---

### Task 1: Canvas Model Helpers

**Files:**
- Create: `src/canvasModel.js`
- Create: `scripts/check-canvas-storage.mjs`
- Modify: `package.json`

- [ ] Write `scripts/check-canvas-storage.mjs` to assert default Canvas seed data and snapshot normalization.
- [ ] Run `/Users/seulgi/Library/pnpm/bin/pnpm run check:canvas-storage` and verify it fails because the helper module does not exist.
- [ ] Move Canvas templates/default tabs/markdown helpers into `src/canvasModel.js`.
- [ ] Run `/Users/seulgi/Library/pnpm/bin/pnpm run check:canvas-storage` and verify it passes.

### Task 2: Supabase Schema

**Files:**
- Create: `supabase/migrations/016_canvas_shared_storage.sql`
- Modify: `docs/backend-api-spec.md`
- Modify: `docs/data-model.md`

- [ ] Add `canvas_tabs`, `canvas_nodes`, and `canvas_links` tables.
- [ ] Enable RLS on all three tables.
- [ ] Allow active authenticated users to select/insert/update/delete Canvas rows.
- [ ] Add manual Data API grants for authenticated role.
- [ ] Document that realtime cursor/conflict/history remain later work.

### Task 3: Supabase Store API

**Files:**
- Modify: `src/supabaseStore.js`
- Test: `scripts/check-canvas-storage.mjs`

- [ ] Add row mappers for Canvas tabs, nodes, and links.
- [ ] Add `readSharedCanvasState`.
- [ ] Add `saveSharedCanvasState` with upsert plus stale row cleanup per tab.
- [ ] Expose `supabaseDashboardStore.canvas.read/save`.

### Task 4: React Wiring

**Files:**
- Modify: `src/SharedCanvasView.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `DESIGN.md`

- [ ] Pass `isSupabaseReady`, `isAuthenticated`, and `canvasStore` into `SharedCanvasView`.
- [ ] Load shared Canvas state on Canvas mount when signed in.
- [ ] Save debounced Canvas state after edits.
- [ ] Keep local fallback seed when Supabase is not ready or the user is not signed in.
- [ ] Show compact shared/local/saving/saved/error status text in the Canvas toolbar.

### Task 5: Verification and Live DB Apply

**Files:**
- Modify: `HANDOFF.md`
- Modify: `TODO.md`

- [ ] Run `check:canvas-storage`, `check:demo-readiness`, `check:import-plan`, `check:summary-filter`, `git diff --check`, and production build.
- [ ] Rehearse migration SQL in a rolled-back live transaction.
- [ ] Apply migration to live Supabase when rehearsal passes.
- [ ] Browser QA Canvas shared save on the local dev URL.
- [ ] Update `HANDOFF.md` and `TODO.md` with verification results and remaining realtime risks.
