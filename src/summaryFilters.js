const dayMs = 24 * 60 * 60 * 1000;

function diffDays(targetDate, baseDate) {
  return Math.round((new Date(`${targetDate}T00:00:00`) - new Date(`${baseDate}T00:00:00`)) / dayMs);
}

export const summaryFilterLabels = {
  open: "진행 업무",
  soon: "3일 내 마감",
  overdue: "지연 업무",
  stale: "업데이트 정체",
  unclassified: "흐름 미지정",
  completed: "완료 업무"
};

function latestUpdateDate(task) {
  const updateDates = (task.updates ?? [])
    .map((update) => update.date || update.createdAt)
    .filter(Boolean)
    .map((value) => String(value).slice(0, 10))
    .sort()
    .reverse();
  return updateDates[0] || "";
}

export function summaryFilterMatches(task, filterKey, today) {
  if (!filterKey) return true;
  const isOpen = task.status !== "완료";
  if (filterKey === "open") return isOpen;
  if (filterKey === "soon") {
    const days = diffDays(task.dueDate, today);
    return isOpen && days >= 0 && days <= 3;
  }
  if (filterKey === "overdue") return isOpen && diffDays(task.dueDate, today) < 0;
  if (filterKey === "stale") {
    const latestDate = latestUpdateDate(task);
    return isOpen && diffDays(task.startDate, today) <= 0 && (!latestDate || diffDays(latestDate, today) < -7);
  }
  if (filterKey === "unclassified") return isOpen && !String(task.workstream ?? "").trim();
  if (filterKey === "completed") return task.status === "완료";
  return true;
}
