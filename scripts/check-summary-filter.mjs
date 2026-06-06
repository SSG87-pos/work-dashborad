import assert from "node:assert/strict";
import { summaryFilterMatches } from "../src/summaryFilters.js";

const today = "2026-06-06";
const baseTask = {
  status: "진행중",
  dueDate: "2026-06-08"
};

assert.equal(summaryFilterMatches(baseTask, "", today), true, "empty filter should match every task");
assert.equal(summaryFilterMatches(baseTask, "open", today), true, "open filter should include non-completed tasks");
assert.equal(summaryFilterMatches({ ...baseTask, status: "완료" }, "open", today), false, "open filter should exclude completed tasks");

assert.equal(summaryFilterMatches(baseTask, "soon", today), true, "soon filter should include tasks due within 3 days");
assert.equal(summaryFilterMatches({ ...baseTask, dueDate: "2026-06-10" }, "soon", today), false, "soon filter should exclude tasks due after 3 days");
assert.equal(summaryFilterMatches({ ...baseTask, dueDate: "2026-06-05" }, "soon", today), false, "soon filter should exclude overdue tasks");

assert.equal(summaryFilterMatches({ ...baseTask, dueDate: "2026-06-05" }, "overdue", today), true, "overdue filter should include late open tasks");
assert.equal(summaryFilterMatches({ ...baseTask, status: "완료", dueDate: "2026-06-05" }, "overdue", today), false, "overdue filter should exclude completed tasks");

assert.equal(summaryFilterMatches({ ...baseTask, status: "완료" }, "completed", today), true, "completed filter should include completed tasks");
assert.equal(summaryFilterMatches(baseTask, "completed", today), false, "completed filter should exclude open tasks");

console.log("summary filter checks passed");
