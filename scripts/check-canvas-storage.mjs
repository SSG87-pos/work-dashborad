import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildCanvasMarkdown,
  createDefaultCanvasState,
  normalizeCanvasState
} from "../src/canvasModel.js";

const seedState = createDefaultCanvasState();

assert.equal(seedState.tabs.length, 1, "Canvas starts with one shared thinking tab");
assert.equal(seedState.tabs[0].id, "ideas", "default Canvas tab id remains stable");
assert.equal(seedState.nodesByTab.ideas.length, 3, "default Canvas tab keeps three starter nodes");
assert.deepEqual(seedState.linksByTab.ideas, [], "default Canvas tab starts without manual links");

const normalized = normalizeCanvasState({
  activeTabId: "custom",
  tabs: [
    { id: "custom", label: "공유 회의", title: "공유 회의 캔버스", description: "팀 회의 정리" },
    { id: "", label: "무시", title: "", description: "" }
  ],
  nodesByTab: {
    custom: [
      { id: "node-a", title: "의사결정", body: "결론", template: "decision", parentId: "", x: 12.4, y: 20.7 },
      { id: "node-b", title: "액션", body: "실행", template: "action", parentId: "node-a", x: "40", y: "80" }
    ]
  },
  linksByTab: {
    custom: [
      { id: "link-a", sourceId: "node-a", targetId: "node-b" },
      { id: "bad-link", sourceId: "node-a", targetId: "missing" }
    ]
  }
});

assert.equal(normalized.activeTabId, "custom", "active tab survives when valid");
assert.equal(normalized.tabs.length, 1, "invalid tabs are removed");
assert.equal(normalized.nodesByTab.custom[0].x, 12, "node x coordinates normalize to integers");
assert.equal(normalized.nodesByTab.custom[0].y, 21, "node y coordinates normalize to integers");
assert.equal(normalized.nodesByTab.custom[1].parentId, "node-a", "valid parent links survive");
assert.equal(normalized.linksByTab.custom.length, 1, "manual links pointing to missing nodes are removed");

const markdown = buildCanvasMarkdown(normalized.tabs[0], normalized.nodesByTab.custom, normalized.linksByTab.custom);
assert.match(markdown, /^# 공유 회의 캔버스/m, "markdown export keeps tab title");
assert.match(markdown, /- 연결: 액션/m, "markdown export includes manual link metadata");

const migrationSql = readFileSync(new URL("../supabase/migrations/016_canvas_shared_storage.sql", import.meta.url), "utf8");
["canvas_tabs", "canvas_nodes", "canvas_links"].forEach((tableName) => {
  assert.match(migrationSql, new RegExp(`create table if not exists public\\.${tableName}`), `${tableName} table exists`);
  assert.match(migrationSql, new RegExp(`alter table public\\.${tableName} enable row level security`), `${tableName} RLS is enabled`);
  assert.match(migrationSql, new RegExp(`grant select, insert, update, delete on public\\.${tableName} to authenticated`), `${tableName} has Data API grant`);
});
assert.match(migrationSql, /private\.current_user_is_active\(\)/, "Canvas policies require active signed-in users");

console.log("canvas storage checks passed");
