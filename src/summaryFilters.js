const dayMs = 24 * 60 * 60 * 1000;

function diffDays(targetDate, baseDate) {
  return Math.round((new Date(`${targetDate}T00:00:00`) - new Date(`${baseDate}T00:00:00`)) / dayMs);
}

export const summaryFilterLabels = {
  open: "진행 업무",
  soon: "3일 내 마감",
  overdue: "지연 업무",
  completed: "완료 업무"
};

export function summaryFilterMatches(task, filterKey, today) {
  if (!filterKey) return true;
  const isOpen = task.status !== "완료";
  if (filterKey === "open") return isOpen;
  if (filterKey === "soon") {
    const days = diffDays(task.dueDate, today);
    return isOpen && days >= 0 && days <= 3;
  }
  if (filterKey === "overdue") return isOpen && diffDays(task.dueDate, today) < 0;
  if (filterKey === "completed") return task.status === "완료";
  return true;
}
