import { collectWorkstreams, groupTasksByWorkstream } from "./workstreams.js";

const fallbackGroup = {
  id: "mindmap:uncategorized",
  label: "미분류",
  tags: [],
  tone: "custom"
};
const statusSummaryOrder = ["진행중", "계획", "검토/대기", "완료", "보류"];

export function normalizeMindmapTags(tags) {
  return Array.from(new Set((tags ?? []).map((tag) => String(tag ?? "").trim()).filter(Boolean)));
}

export function mindmapTaskTags(task) {
  return normalizeMindmapTags([task?.category, ...(task?.tags ?? [])]);
}

export function mindmapTaskProgress(task) {
  const subtasks = task?.subtasks?.filter((subtask) => subtask.title?.trim()) ?? [];
  if (!subtasks.length) return task?.status === "완료" ? 100 : 0;
  return Math.round((subtasks.filter((subtask) => subtask.done).length / subtasks.length) * 100);
}

export function uniqueMindmapTasksForGroup(group) {
  if (Array.isArray(group?.tasks)) return group.tasks;
  return Array.from(
    new Map((group?.tagBuckets ?? []).flatMap((bucket) => bucket.tasks ?? []).map((task) => [task.id, task])).values()
  );
}

function countStatuses(tasks) {
  return tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1;
    return acc;
  }, {});
}

export function mindmapGroupStatusSummary(group) {
  const statusCounts = countStatuses(uniqueMindmapTasksForGroup(group));
  const orderedStatuses = [
    ...statusSummaryOrder.filter((status) => statusCounts[status]),
    ...Object.keys(statusCounts).filter((status) => !statusSummaryOrder.includes(status)).sort((a, b) => a.localeCompare(b, "ko-KR"))
  ];
  return orderedStatuses.slice(0, 3).map((status) => `${status} ${statusCounts[status]}`);
}

export function filterMindmapTasksByScope(tasks, scope = "active") {
  const safeTasks = (tasks ?? []).filter((task) => task && !task.deletedAt);
  if (scope === "all") return safeTasks;
  return safeTasks.filter((task) => !task.archived && task.status !== "완료");
}

function taskMatchesGroup(taskTags, group) {
  return group.tags.some((tag) => taskTags.includes(tag));
}

function placementTagFor(taskTags, group) {
  return taskTags.find((tag) => group.tags.includes(tag)) ?? group.tags[0] ?? "미분류";
}

function safeWorkstreamId(label) {
  return `workstream:${String(label ?? "미지정").replace(/\s+/g, "-")}`;
}

function createMindmapTask(task, locations) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    ownerId: task.ownerId,
    dueDate: task.dueDate,
    recurring: task.recurring,
    progress: mindmapTaskProgress(task),
    tags: mindmapTaskTags(task),
    connectedLocations: locations
  };
}

export function buildMindmapStructure(tasks, presets = []) {
  const activeTasks = (tasks ?? []).filter((task) => task && !task.deletedAt);
  const normalizedGroups = (presets ?? [])
    .map((group) => ({
      id: group.id,
      label: group.label,
      tags: normalizeMindmapTags(group.tags),
      tone: group.tone ?? "custom"
    }))
    .filter((group) => group.id && group.label && group.tags.length);
  const workstreamGroups = groupTasksByWorkstream(activeTasks, collectWorkstreams(activeTasks));
  const groupsById = new Map(workstreamGroups.map((group) => [safeWorkstreamId(group.label), {
    id: safeWorkstreamId(group.label),
    label: group.label,
    tags: [],
    tone: "custom",
    taskIds: new Set(),
    tasks: []
  }]));

  workstreamGroups.forEach((workstream) => {
    const workstreamId = safeWorkstreamId(workstream.label);
    const group = groupsById.get(workstreamId);
    if (!group) return;
    workstream.tasks.forEach((task) => {
      const tags = mindmapTaskTags(task);
      const matchedGroups = normalizedGroups.filter((categoryGroup) => taskMatchesGroup(tags, categoryGroup));
      const classificationGroups = matchedGroups.length ? matchedGroups : [fallbackGroup];
      const locations = classificationGroups.map((categoryGroup) => ({
        workstreamId,
        groupId: categoryGroup.id,
        groupLabel: categoryGroup.label,
        tag: placementTagFor(tags, categoryGroup)
      }));
      group.taskIds.add(task.id);
      group.tags = normalizeMindmapTags([...group.tags, ...tags]);
      group.tasks.push(createMindmapTask(task, locations));
    });
  });

  const groups = Array.from(groupsById.values())
    .filter((group) => group.taskIds.size > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))
    .map((group) => ({
      id: group.id,
      label: group.label,
      tags: group.tags,
      tone: group.tone,
      uniqueTaskCount: group.taskIds.size,
      tasks: group.tasks
    }));

  return {
    uniqueTaskCount: new Set(activeTasks.map((task) => task.id)).size,
    groups
  };
}
