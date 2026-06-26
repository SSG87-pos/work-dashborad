const issueWords = ["보류", "확인 필요", "지연", "요청", "대기", "리스크", "미확보", "협의 필요", "의사결정"];
const explicitIssueTypes = new Set(["issue", "risk", "request", "decision", "이슈", "리스크", "요청", "결정사항"]);

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function inPeriod(date, periodStart, periodEnd) {
  const day = dateOnly(date);
  if (!day) return false;
  if (periodStart && day < periodStart) return false;
  if (periodEnd && day > periodEnd) return false;
  return true;
}

function includesText(value, query) {
  return String(value ?? "").toLocaleLowerCase("ko-KR").includes(query);
}

function personIdOf(person) {
  return person?.id ?? person?.authUserId ?? person?.auth_user_id ?? "";
}

function personNameOf(person) {
  return person?.name ?? person?.displayName ?? person?.display_name ?? "";
}

function makePeopleIndex(people = []) {
  const byId = new Map();
  const byName = new Map();
  people.forEach((person) => {
    const id = personIdOf(person);
    const name = personNameOf(person);
    if (id) byId.set(id, person);
    if (name) byName.set(name, person);
  });
  return { byId, byName };
}

function taskOwnerId(task) {
  return task.ownerId ?? task.owner_id ?? task.ownerRosterId ?? task.owner_roster_id ?? "";
}

function taskTitle(task) {
  return task.title ?? task.name ?? "";
}

function taskWorkstream(task) {
  return task.workstream ?? task.work_stream ?? task.category ?? "";
}

function taskTags(task) {
  if (Array.isArray(task.tags)) return task.tags.filter(Boolean);
  if (Array.isArray(task.tagNames)) return task.tagNames.filter(Boolean);
  return [];
}

function normalizeUpdate(update, index) {
  const id = update?.id ?? `update-${index + 1}`;
  const date = dateOnly(update?.date ?? update?.createdAt ?? update?.created_at ?? update?.updatedAt ?? update?.updated_at);
  const body = update?.text ?? update?.body ?? "";
  const type = update?.type ?? update?.updateType ?? update?.update_type ?? "note";
  return {
    id,
    date,
    type,
    body,
    authorId: update?.authorId ?? update?.author_id ?? ""
  };
}

function normalizePost(post, index) {
  const id = post?.id ?? `post-${index + 1}`;
  const date = dateOnly(post?.date ?? post?.postedAt ?? post?.posted_at ?? post?.createdAt ?? post?.created_at);
  const scope = post?.scope ?? post?.categoryLabel ?? post?.category_label ?? "업무 노트";
  return {
    id,
    date,
    scope,
    title: post?.title ?? "",
    body: post?.body ?? "",
    url: post?.url ?? ""
  };
}

function taskPosts(task) {
  const posts = task.postItems ?? task.posts ?? task.taskPosts ?? task.task_posts ?? [];
  return Array.isArray(posts) ? posts.map(normalizePost) : [];
}

function taskUpdates(task) {
  const updates = task.updates ?? task.taskUpdates ?? task.task_updates ?? [];
  return Array.isArray(updates) ? updates.map(normalizeUpdate) : [];
}

function taskProgress(task) {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  if (!subtasks.length) return Number(task.progress ?? 0);
  const done = subtasks.filter((item) => Boolean(item.done)).length;
  return Math.round((done / subtasks.length) * 100);
}

function openSubtaskTitles(task) {
  return (Array.isArray(task.subtasks) ? task.subtasks : [])
    .filter((item) => !item.done)
    .map((item) => item.title)
    .filter(Boolean);
}

function updateHasIssue(update) {
  const type = String(update.type ?? "").toLocaleLowerCase("ko-KR");
  if (explicitIssueTypes.has(type)) return true;
  return issueWords.some((word) => includesText(update.body, word.toLocaleLowerCase("ko-KR")));
}

function postHasIssue(post) {
  const scope = String(post.scope ?? "").toLocaleLowerCase("ko-KR");
  if (explicitIssueTypes.has(scope)) return true;
  return issueWords.some((word) => {
    const query = word.toLocaleLowerCase("ko-KR");
    return includesText(post.scope, query) || includesText(post.title, query) || includesText(post.body, query);
  });
}

function buildSignals(task, recentUpdates, recentPosts, periodStart, periodEnd) {
  const signals = [];
  recentUpdates.filter(updateHasIssue).forEach((update) => {
    signals.push({
      type: "explicit",
      label: "이슈",
      reason: update.body,
      source: { type: "task_update", id: update.id, date: update.date }
    });
  });
  recentPosts.filter(postHasIssue).forEach((post) => {
    signals.push({
      type: "explicit",
      label: post.scope || "업무 노트",
      reason: [post.title, post.body].filter(Boolean).join(" - "),
      source: { type: "task_post", id: post.id, date: post.date }
    });
  });
  if (task.status === "보류") {
    signals.push({ type: "explicit", label: "보류", reason: "업무 상태가 보류입니다." });
  }
  if (task.status === "검토/대기") {
    signals.push({ type: "explicit", label: "검토/대기", reason: "업무 상태가 검토/대기입니다." });
  }
  if (!recentUpdates.length && task.status !== "완료") {
    signals.push({
      type: "inferred",
      label: "최근 기록 부족",
      reason: `${periodStart || "선택 기간 시작"}~${periodEnd || "선택 기간 종료"} 내 업데이트 없음`
    });
  }
  if (task.dueDate && periodEnd && task.dueDate <= periodEnd && task.status !== "완료" && taskProgress(task) < 100) {
    signals.push({
      type: "inferred",
      label: "계획대비 지연 가능",
      reason: "선택 기간 종료일까지 완료되지 않은 마감 업무입니다."
    });
  }
  return signals;
}

function buildEvidenceItem(task, peopleIndex, periodStart, periodEnd) {
  const ownerId = taskOwnerId(task);
  const owner = peopleIndex.byId.get(ownerId);
  const updates = taskUpdates(task);
  const posts = taskPosts(task);
  const recentUpdates = updates.filter((update) => inPeriod(update.date, periodStart, periodEnd));
  const recentPosts = posts.filter((post) => inPeriod(post.date, periodStart, periodEnd));
  return {
    taskId: task.id,
    taskTitle: taskTitle(task),
    ownerId,
    ownerName: personNameOf(owner) || task.ownerName || task.owner_name || ownerId || "미지정",
    status: task.status ?? "",
    priority: task.priority ?? "",
    workstream: taskWorkstream(task),
    tags: taskTags(task),
    dueDate: dateOnly(task.dueDate ?? task.due_date),
    progress: taskProgress(task),
    recentUpdates,
    recentPosts,
    openSubtasks: openSubtaskTitles(task),
    signals: buildSignals(task, recentUpdates, recentPosts, periodStart, periodEnd)
  };
}

function sortEvidenceItems(items) {
  return [...items].sort((a, b) => {
    const statusScore = (item) => (item.signals.length ? 0 : 1);
    return statusScore(a) - statusScore(b) || String(a.dueDate).localeCompare(String(b.dueDate)) || a.taskTitle.localeCompare(b.taskTitle);
  });
}

function baseEvidence({ generatedAt, questionType, periodStart, periodEnd }) {
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    questionType,
    period: {
      start: periodStart ?? "",
      end: periodEnd ?? ""
    },
    excluded: {
      personalNotes: true,
      privateCalendarDetails: true
    }
  };
}

export function buildReportEvidence({ tasks = [], people = [], periodStart = "", periodEnd = "", reportType = "weekly", filters = {}, generatedAt } = {}) {
  const peopleIndex = makePeopleIndex(people);
  const items = tasks
    .filter((task) => !filters.ownerId || taskOwnerId(task) === filters.ownerId)
    .filter((task) => !filters.workstream || taskWorkstream(task) === filters.workstream)
    .filter((task) => !filters.status || task.status === filters.status)
    .map((task) => buildEvidenceItem(task, peopleIndex, periodStart, periodEnd));
  return {
    ...baseEvidence({ generatedAt, questionType: "report-evidence", periodStart, periodEnd }),
    reportType,
    filters,
    items: sortEvidenceItems(items)
  };
}

export function buildPersonWorkStatusEvidence({ tasks = [], people = [], personId = "", personName = "", periodStart = "", periodEnd = "", generatedAt } = {}) {
  const peopleIndex = makePeopleIndex(people);
  const person = personId ? peopleIndex.byId.get(personId) : peopleIndex.byName.get(personName);
  const targetId = personId || personIdOf(person);
  const items = tasks
    .filter((task) => taskOwnerId(task) === targetId)
    .map((task) => buildEvidenceItem(task, peopleIndex, periodStart, periodEnd));
  return {
    ...baseEvidence({ generatedAt, questionType: "person-work-status", periodStart, periodEnd }),
    person: {
      id: targetId,
      name: personNameOf(person) || personName || targetId
    },
    items: sortEvidenceItems(items)
  };
}

export function buildTopicSearchEvidence({ tasks = [], people = [], query = "", periodStart = "", periodEnd = "", generatedAt } = {}) {
  const peopleIndex = makePeopleIndex(people);
  const normalizedQuery = query.toLocaleLowerCase("ko-KR").trim();
  const items = tasks
    .filter((task) => {
      if (!normalizedQuery) return true;
      const fields = [
        taskTitle(task),
        task.description,
        taskWorkstream(task),
        ...taskTags(task),
        ...taskUpdates(task).flatMap((update) => [update.body, update.type]),
        ...taskPosts(task).flatMap((post) => [post.scope, post.title, post.body])
      ];
      return fields.some((field) => includesText(field, normalizedQuery));
    })
    .map((task) => buildEvidenceItem(task, peopleIndex, periodStart, periodEnd));
  return {
    ...baseEvidence({ generatedAt, questionType: "topic-search", periodStart, periodEnd }),
    query,
    items: sortEvidenceItems(items)
  };
}

export function buildWorkstreamIssuesEvidence({ tasks = [], people = [], workstream = "", periodStart = "", periodEnd = "", generatedAt } = {}) {
  const peopleIndex = makePeopleIndex(people);
  const items = tasks
    .filter((task) => !workstream || taskWorkstream(task) === workstream)
    .map((task) => buildEvidenceItem(task, peopleIndex, periodStart, periodEnd))
    .filter((item) => item.signals.length > 0);
  return {
    ...baseEvidence({ generatedAt, questionType: "workstream-issues", periodStart, periodEnd }),
    workstream,
    items: sortEvidenceItems(items)
  };
}

export function buildRecentUpdatesEvidence({ tasks = [], people = [], filters = {}, periodStart = "", periodEnd = "", generatedAt } = {}) {
  const peopleIndex = makePeopleIndex(people);
  const items = tasks
    .filter((task) => !filters.ownerId || taskOwnerId(task) === filters.ownerId)
    .filter((task) => !filters.status || task.status === filters.status)
    .filter((task) => !filters.workstream || taskWorkstream(task) === filters.workstream)
    .filter((task) => !filters.tag || taskTags(task).includes(filters.tag))
    .flatMap((task) => {
      const evidenceItem = buildEvidenceItem(task, peopleIndex, periodStart, periodEnd);
      return taskUpdates(task)
        .filter((update) => inPeriod(update.date, periodStart, periodEnd))
        .map((update) => ({
          taskId: evidenceItem.taskId,
          taskTitle: evidenceItem.taskTitle,
          ownerId: evidenceItem.ownerId,
          ownerName: evidenceItem.ownerName,
          status: evidenceItem.status,
          workstream: evidenceItem.workstream,
          tags: evidenceItem.tags,
          updateId: update.id,
          date: update.date,
          type: update.type,
          body: update.body
        }));
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.taskTitle.localeCompare(b.taskTitle));
  return {
    ...baseEvidence({ generatedAt, questionType: "recent-updates", periodStart, periodEnd }),
    filters,
    items
  };
}
