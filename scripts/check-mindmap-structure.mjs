import assert from "node:assert/strict";
import { buildMindmapStructure, filterMindmapTasksByScope } from "../src/mindmapData.js";

const presets = [
  { id: "preset:report", label: "기획/임원보고", tags: ["기획보고", "임원보고"], tone: "report" },
  { id: "preset:strategy", label: "전략/투자", tags: ["전략과제", "투자검토"], tone: "strategy" }
];

const tasks = [
  {
    id: "task-1",
    title: "월간 전략보고 초안 정리",
    category: "기획보고",
    tags: ["전략과제", "임원보고"],
    status: "진행중",
    priority: "높음",
    ownerId: "kmryu",
    dueDate: "2026-06-10",
    subtasks: [
      { id: "a", title: "목차 정리", done: true },
      { id: "b", title: "근거 보강", done: false }
    ],
    archived: false
  },
  {
    id: "task-2",
    title: "완료된 월간 KPI 정리",
    category: "월간보고",
    tags: ["KPI"],
    status: "완료",
    priority: "보통",
    ownerId: "lead",
    dueDate: "2026-05-30",
    subtasks: [{ id: "c", title: "정리", done: true }],
    archived: false
  }
];

const activeTasks = filterMindmapTasksByScope(tasks, "active");
const allTasks = filterMindmapTasksByScope(tasks, "all");

assert.equal(activeTasks.length, 1, "active scope should exclude completed work");
assert.equal(allTasks.length, 2, "all scope should include completed work");

const structure = buildMindmapStructure(activeTasks, presets);

assert.equal(structure.uniqueTaskCount, 1, "same task should count once in the whole mindmap");
assert.equal(structure.groups.length, 2, "same task should appear in two matched categories");

const reportGroup = structure.groups.find((group) => group.id === "preset:report");
const strategyGroup = structure.groups.find((group) => group.id === "preset:strategy");

assert.ok(reportGroup, "report category group should exist");
assert.ok(strategyGroup, "strategy category group should exist");
assert.equal(reportGroup.uniqueTaskCount, 1, "report category count should dedupe tasks");
assert.equal(strategyGroup.uniqueTaskCount, 1, "strategy category count should dedupe tasks");

const reportTask = reportGroup.tagBuckets.flatMap((bucket) => bucket.tasks).find((task) => task.id === "task-1");
const strategyTask = strategyGroup.tagBuckets.flatMap((bucket) => bucket.tasks).find((task) => task.id === "task-1");

assert.ok(reportTask, "task should be visible under report category");
assert.ok(strategyTask, "task should be visible under strategy category");
assert.equal(reportTask.connectedLocations.length, 2, "task node should know it is shared across two locations");
assert.deepEqual(
  reportTask.connectedLocations.map((location) => location.groupLabel),
  ["기획/임원보고", "전략/투자"],
  "shared task locations should remain stable and readable"
);
assert.equal(reportTask.progress, 50, "task progress should come from subtask completion");

console.log("mindmap structure checks passed");
