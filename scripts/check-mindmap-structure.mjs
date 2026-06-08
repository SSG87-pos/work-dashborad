import assert from "node:assert/strict";
import { initialTasks, mindmapSampleTasks } from "../src/data.js";
import { buildMindmapMarkdown, buildMindmapStructure, filterMindmapTasksByScope, mindmapGroupStatusSummary } from "../src/mindmapData.js";

const presets = [
  { id: "preset:report", label: "기획/임원보고", tags: ["기획보고", "임원보고"], tone: "report" },
  { id: "preset:strategy", label: "전략/투자", tags: ["전략과제", "투자검토"], tone: "strategy" }
];

const tasks = [
  {
    id: "task-1",
    title: "월간 전략보고 초안 정리",
    workstream: "월간 전략보고 추진",
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
assert.equal(structure.groups.length, 1, "workstream should be the first mindmap branch");

const workstreamGroup = structure.groups.find((group) => group.label === "월간 전략보고 추진");

assert.ok(workstreamGroup, "workstream group should exist");
assert.equal(workstreamGroup.uniqueTaskCount, 1, "workstream count should dedupe multi-category tasks");

const workstreamTask = workstreamGroup.tasks.find((task) => task.id === "task-1");

assert.ok(workstreamTask, "task should be visible once under the workstream");
assert.equal(workstreamGroup.tasks.filter((task) => task.id === "task-1").length, 1, "task should not be duplicated by category");
assert.equal(workstreamTask.connectedLocations.length, 2, "task node should know it is classified across two categories");
assert.deepEqual(
  workstreamTask.connectedLocations.map((location) => location.groupLabel),
  ["기획/임원보고", "전략/투자"],
  "shared task locations should remain stable and readable"
);
assert.equal(workstreamTask.progress, 50, "task progress should come from subtask completion");

const markdown = buildMindmapMarkdown(structure, [{ id: "kmryu", name: "류강묵" }], {
  generatedAt: "2026-06-08",
  scope: "active"
});

assert.ok(markdown.includes("# 업무 구조"), "mindmap markdown should include the document title");
assert.ok(markdown.includes("- 범위: 현재 진행업무"), "mindmap markdown should include the exported scope");
assert.ok(markdown.includes("## 월간 전략보고 추진"), "mindmap markdown should include workstream headings");
assert.ok(markdown.includes("- 담당: 류강묵"), "mindmap markdown should resolve task owner names");
assert.ok(markdown.includes("- 진행률: 50%"), "mindmap markdown should include calculated progress");
assert.ok(markdown.includes("기획/임원보고 > 기획보고"), "mindmap markdown should retain classification context");

const sampleStructure = buildMindmapStructure(filterMindmapTasksByScope(initialTasks, "all"), presets);
const innovationSampleGroup = sampleStructure.groups.find((group) => group.label === "혁신아이디어");

assert.ok(innovationSampleGroup, "mindmap sample data should include an innovation workstream");
assert.equal(
  innovationSampleGroup.uniqueTaskCount,
  mindmapSampleTasks.length,
  "innovation sample tasks should be grouped into one workstream"
);
assert.equal(
  innovationSampleGroup.tasks.length,
  mindmapSampleTasks.length,
  "innovation sample workstream should render one task node per source task"
);
assert.deepEqual(
  mindmapGroupStatusSummary(innovationSampleGroup),
  ["진행중 1", "계획 1", "완료 1"],
  "sample status summary should count unique tasks, not duplicated category placements"
);

const activeSampleStructure = buildMindmapStructure(filterMindmapTasksByScope(initialTasks, "active"), presets);
const activeInnovationGroup = activeSampleStructure.groups.find((group) => group.label === "혁신아이디어");

assert.ok(activeInnovationGroup, "active mindmap sample data should include active innovation work");
assert.deepEqual(
  mindmapGroupStatusSummary(activeInnovationGroup),
  ["진행중 1", "계획 1"],
  "active sample status summary should dedupe multi-category planned work"
);

console.log("mindmap structure checks passed");
