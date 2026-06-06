const fallbackGroup = {
  id: "mindmap:uncategorized",
  label: "미분류",
  tags: [],
  tone: "custom"
};

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

function groupSortValue(group) {
  if (group.id === fallbackGroup.id) return 1;
  return 0;
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
  const groupsById = new Map([...normalizedGroups, fallbackGroup].map((group) => [group.id, {
    ...group,
    taskIds: new Set(),
    tagBucketsByName: new Map()
  }]));
  const locationsByTaskId = new Map();

  activeTasks.forEach((task) => {
    const tags = mindmapTaskTags(task);
    const matchedGroups = normalizedGroups.filter((group) => taskMatchesGroup(tags, group));
    const placementGroups = matchedGroups.length ? matchedGroups : [fallbackGroup];
    const locations = placementGroups.map((group) => ({
      groupId: group.id,
      groupLabel: group.label,
      tag: placementTagFor(tags, group)
    }));
    locationsByTaskId.set(task.id, locations);
  });

  activeTasks.forEach((task) => {
    const locations = locationsByTaskId.get(task.id) ?? [];
    locations.forEach((location) => {
      const group = groupsById.get(location.groupId);
      if (!group) return;
      group.taskIds.add(task.id);
      if (!group.tagBucketsByName.has(location.tag)) {
        group.tagBucketsByName.set(location.tag, {
          tag: location.tag,
          tasks: []
        });
      }
      group.tagBucketsByName.get(location.tag).tasks.push(createMindmapTask(task, locations));
    });
  });

  const groups = Array.from(groupsById.values())
    .filter((group) => group.taskIds.size > 0)
    .sort((a, b) => groupSortValue(a) - groupSortValue(b))
    .map((group) => ({
      id: group.id,
      label: group.label,
      tags: group.tags,
      tone: group.tone,
      uniqueTaskCount: group.taskIds.size,
      tagBuckets: Array.from(group.tagBucketsByName.values()).sort((a, b) => a.tag.localeCompare(b.tag, "ko-KR"))
    }));

  return {
    uniqueTaskCount: new Set(activeTasks.map((task) => task.id)).size,
    groups
  };
}
