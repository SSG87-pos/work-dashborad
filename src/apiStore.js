import { initialCalendarEvents, initialTasks, TODAY } from "./data.js";
import { buildAiReadPath } from "./aiAssistant.js";
import { createDashboardSnapshot } from "./storage.js";

const apiEnv = import.meta.env ?? globalThis.__WORK_DASHBOARD_API_ENV__ ?? {};
const apiBaseUrl = String(apiEnv.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");
const tokenStorageKey = "research-strategy-dashboard:api-token";

export const apiConfig = {
  baseUrl: apiBaseUrl,
  isConfigured: Boolean(apiBaseUrl)
};

let memoryToken = "";
const taskIdBySubtaskId = new Map();
const taskIdByUpdateId = new Map();
const taskIdByHistoryId = new Map();
const taskIdByPostId = new Map();
const postCategoryIdByLabel = new Map();
const tagIdByName = new Map();
const allowedPostScopes = new Set(["team", "personal", "public"]);
let currentUserId = "";

function canUseTokenStorage() {
  return typeof globalThis.localStorage !== "undefined";
}

function readToken() {
  if (canUseTokenStorage()) return globalThis.localStorage.getItem(tokenStorageKey) ?? "";
  return memoryToken;
}

function writeToken(token) {
  memoryToken = token || "";
  if (!canUseTokenStorage()) return;
  if (token) globalThis.localStorage.setItem(tokenStorageKey, token);
  else globalThis.localStorage.removeItem(tokenStorageKey);
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function authHeaders(extra = {}) {
  const token = readToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

async function apiRequest(path, options = {}) {
  if (!apiConfig.isConfigured) throw new Error("VITE_API_BASE_URL이 설정되지 않았습니다.");
  const headers = authHeaders(options.body ? { "Content-Type": "application/json" } : {});
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {})
    }
  });
  if (response.status === 204) return true;
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : response.statusText;
    throw new Error(detail || `API request failed: ${response.status}`);
  }
  return data;
}

function body(payload) {
  return JSON.stringify(payload);
}

function rememberTaskRelation(ids, taskId, targetMap) {
  for (const item of ids) {
    if (isUuid(item.id)) targetMap.set(item.id, taskId);
  }
}

function fromUser(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.title,
    permissionRole: row.permission_role,
    color: "#2563eb",
    emoji: row.profile_emoji,
    isTeamMember: row.is_team_member,
    isActive: row.is_active
  };
}

function fromRoster(row) {
  return {
    id: row.id,
    authUserId: row.auth_user_id ?? "",
    expectedEmail: row.expected_email ?? "",
    name: row.name,
    role: row.title,
    permissionRole: row.permission_role,
    color: "#2563eb",
    emoji: row.profile_emoji,
    isTeamMember: row.is_team_member,
    isActive: row.is_active
  };
}

function toProfileOverrides(rows) {
  return Object.fromEntries(rows.map((person) => [person.id, {
    name: person.name,
    role: person.role,
    permissionRole: person.permissionRole,
    emoji: person.emoji,
    isTeamMember: person.isTeamMember,
    isActive: person.isActive,
    expectedEmail: person.expectedEmail,
    authUserId: person.authUserId
  }]));
}

function fromTask(row, relations = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    ownerId: row.owner_roster_id ?? row.owner_id,
    assignerType: row.assigner_type ?? "개인",
    assignerId: row.owner_roster_id ?? row.owner_id,
    creatorId: row.creator_id,
    status: row.status,
    priority: row.priority,
    workKind: row.work_kind === "spot" ? "spot" : "standard",
    category: row.tags?.[0] ?? "운영",
    tags: row.tags?.length ? row.tags : ["운영"],
    workstream: row.workstream ?? "",
    startDate: row.start_date,
    dueDate: row.due_date,
    progress: row.progress ?? 0,
    recurring: row.recurring ?? null,
    recurringDetail: row.recurring_detail ?? "",
    recurringInterval: row.recurring_interval ?? 1,
    recurringWeekdays: row.recurring_weekdays ?? [],
    recurringStartDate: row.recurring_start_date ?? row.start_date,
    recurringEndDate: row.recurring_end_date ?? "",
    recurringNoEnd: Boolean(row.recurring_no_end),
    recurringDurationDays: row.recurring_duration_days ?? 1,
    recurringTemplateId: row.recurring_template_id ?? undefined,
    isRecurringInstance: Boolean(row.recurring_template_id),
    subtasks: relations.subtasks ?? [],
    links: relations.links ?? [],
    updates: relations.updates ?? [],
    statusHistory: relations.statusHistory ?? [],
    postItems: relations.posts ?? [],
    archived: Boolean(row.archived_at),
    createdAt: row.start_date,
    isNewAssignment: false
  };
}

function fromSubtask(row) {
  return {
    id: row.id,
    title: row.title,
    done: row.done
  };
}

function fromUpdate(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    date: TODAY,
    text: row.body
  };
}

function fromHistory(row) {
  return {
    id: row.id,
    type: row.change_type === "due_date" ? "dueDate" : row.change_type,
    from: row.from_value ?? "",
    to: row.to_value,
    actorId: row.actor_id,
    date: row.created_at?.slice(0, 10) ?? TODAY,
    note: row.note ?? ""
  };
}

function fromLink(row) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    type: row.link_type
  };
}

function fromPost(row) {
  return {
    id: row.id,
    scope: row.category_label ?? row.scope,
    title: row.title,
    body: row.body,
    url: row.url ?? "",
    attachment: row.attachment ?? null,
    authorId: row.author_id,
    date: row.posted_at ?? row.created_at?.slice(0, 10) ?? TODAY,
    createdAt: row.created_at?.slice(0, 10) ?? row.posted_at ?? TODAY
  };
}

function fromPostCategory(row) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    tone: row.tone ?? "slate",
    active: row.active !== false
  };
}

function normalizeRosterPayload(patch) {
  return {
    ...(typeof patch.name === "string" ? { name: patch.name.trim() } : {}),
    ...(typeof patch.title === "string" ? { title: patch.title.trim() } : {}),
    ...(typeof patch.profileEmoji === "string" ? { profile_emoji: patch.profileEmoji.trim() } : {}),
    ...(typeof patch.permissionRole === "string" ? { permission_role: patch.permissionRole } : {}),
    ...(typeof patch.isTeamMember === "boolean" ? { is_team_member: patch.isTeamMember } : {}),
    ...(typeof patch.isActive === "boolean" ? { is_active: patch.isActive } : {}),
    ...(typeof patch.expectedEmail === "string" ? { expected_email: patch.expectedEmail.trim() || null } : {}),
    ...(isUuid(patch.authUserId) ? { auth_user_id: patch.authUserId } : {})
  };
}

function fromBriefing(row) {
  const done = Boolean(row.done || row.status === "done");
  return {
    id: row.id,
    scope: row.scope === "team" ? "team" : "my",
    kind: row.kind === "todo" ? "todo" : "inbox",
    type: row.item_type ?? "note",
    title: row.title,
    body: row.body ?? "",
    url: row.url ?? "",
    status: row.kind === "todo" ? (done ? "done" : "open") : row.status ?? "new",
    done,
    ownerId: row.owner_roster_id ?? row.owner_id ?? "",
    taskId: row.task_id ?? "",
    authorId: row.author_id ?? "",
    createdAt: TODAY
  };
}

function taskPayload(task) {
  const ownerIsUser = isUuid(task.ownerId);
  return {
    title: task.title,
    description: task.description ?? "",
    workstream: task.workstream || task.category || null,
    owner_id: ownerIsUser ? task.ownerId : null,
    owner_roster_id: ownerIsUser ? null : task.ownerId,
    assigner_type: task.assignerType || "개인",
    status: task.status || "계획",
    priority: task.priority || "보통",
    work_kind: task.workKind === "spot" ? "spot" : "standard",
    start_date: task.startDate || TODAY,
    due_date: task.dueDate || task.startDate || TODAY,
    progress: Number.isFinite(Number(task.progress)) ? Number(task.progress) : 0,
    recurring: task.recurring || null,
    recurring_detail: task.recurringDetail || "",
    recurring_interval: Math.max(1, Number(task.recurringInterval) || 1),
    recurring_weekdays: Array.isArray(task.recurringWeekdays) ? task.recurringWeekdays : [],
    recurring_start_date: task.recurringStartDate || null,
    recurring_end_date: task.recurringNoEnd ? null : task.recurringEndDate || null,
    recurring_no_end: Boolean(task.recurringNoEnd),
    recurring_duration_days: Math.max(1, Number(task.recurringDurationDays) || 1),
    recurring_template_id: isUuid(task.recurringTemplateId) ? task.recurringTemplateId : null
  };
}

async function readTaskRelations(taskId) {
  const [subtasks, updates, links, history, posts] = await Promise.all([
    apiRequest(`/tasks/${taskId}/subtasks`),
    apiRequest(`/tasks/${taskId}/updates`),
    apiRequest(`/tasks/${taskId}/links`),
    apiRequest(`/tasks/${taskId}/history`),
    apiRequest(`/tasks/${taskId}/posts`)
  ]);
  rememberTaskRelation(subtasks, taskId, taskIdBySubtaskId);
  rememberTaskRelation(updates, taskId, taskIdByUpdateId);
  rememberTaskRelation(history, taskId, taskIdByHistoryId);
  rememberTaskRelation(posts, taskId, taskIdByPostId);
  return {
    subtasks: subtasks.map(fromSubtask),
    updates: updates.map(fromUpdate),
    links: links.map(fromLink),
    statusHistory: history.map(fromHistory),
    posts: posts.map(fromPost)
  };
}

async function getCurrentProfile() {
  if (!apiConfig.isConfigured || !readToken()) return null;
  return fromUser(await apiRequest("/me"));
}

async function readDashboardState() {
  if (!apiConfig.isConfigured || !readToken()) return { isAuthenticated: false };
  const currentUser = await getCurrentProfile();
  if (!currentUser) return { isAuthenticated: false };
  taskIdBySubtaskId.clear();
  taskIdByUpdateId.clear();
  taskIdByHistoryId.clear();
  taskIdByPostId.clear();
  postCategoryIdByLabel.clear();
  tagIdByName.clear();

  const [
    tasks,
    tags,
    tagGroups,
    events,
    briefingItems,
    postCategories,
    preferences,
    memos
  ] = await Promise.all([
    apiRequest("/tasks"),
    apiRequest("/tags"),
    apiRequest("/tag-groups"),
    apiRequest("/calendar/events"),
    apiRequest("/briefing-items"),
    apiRequest("/post-categories"),
    apiRequest("/preferences/me"),
    apiRequest("/dashboard-memos")
  ]);
  const roster = currentUser.permissionRole === "admin" ? await apiRequest("/admin/roster") : [];
  currentUserId = currentUser.id;
  for (const tag of tags) {
    tagIdByName.set(tag.name, tag.id);
  }
  for (const category of postCategories) {
    if (isUuid(category.id)) {
      postCategoryIdByLabel.set(category.label, category.id);
      postCategoryIdByLabel.set(category.key, category.id);
    }
  }
  const relationEntries = await Promise.all(tasks.map(async (task) => [task.id, await readTaskRelations(task.id)]));
  const relationMap = new Map(relationEntries);
  const profiles = [currentUser, ...roster.map(fromRoster)];

  return createDashboardSnapshot({
    tasks: tasks.map((task) => fromTask(task, relationMap.get(task.id))),
    availableTags: tags.map((tag) => tag.name),
    tagGroups,
    taskPostCategories: postCategories.map(fromPostCategory),
    calendarEvents: events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.event_date,
      startDate: event.start_date ?? event.event_date,
      endDate: event.end_date ?? event.start_date ?? event.event_date,
      scope: event.scope,
      ownerId: event.owner_roster_id ?? event.owner_id,
      creatorId: event.created_by,
      note: event.note ?? ""
    })),
    briefingItems: briefingItems.map(fromBriefing),
    memoByPage: memos,
    isAuthenticated: true,
    selectedPersonId: currentUser.id,
    activePage: preferences.active_page ?? "my",
    activeView: preferences.active_view ?? "board",
    category: preferences.selected_tag ?? "전체",
    timelineMode: preferences.timeline_mode ?? "month",
    timelineMonth: preferences.timeline_month ?? TODAY.slice(0, 7),
    timelineYear: preferences.timeline_year ?? TODAY.slice(0, 4),
    selectedTaskId: preferences.selected_task_id ?? "",
    profileOverrides: toProfileOverrides(profiles)
  });
}

async function signInWithPassword(email, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: body({ email, password }),
    headers: { "Content-Type": "application/json" }
  });
  writeToken(data.access_token);
  return data;
}

async function signUpWithPassword() {
  throw new Error("FastAPI 운영 모드에서는 관리자 roster/seed로 계정을 준비한 뒤 로그인합니다.");
}

async function signOut() {
  writeToken("");
  return true;
}

async function writeUserPreferences(state) {
  const selectedTaskId = isUuid(state.selectedTaskId) ? state.selectedTaskId : null;
  await apiRequest("/preferences/me", {
    method: "PUT",
    body: body({
      active_page: state.activePage ?? "my",
      active_view: state.activeView ?? "board",
      selected_tag: state.category ?? "전체",
      timeline_mode: state.timelineMode ?? "month",
      timeline_month: state.timelineMonth ?? "",
      timeline_year: state.timelineYear ?? "",
      selected_task_id: selectedTaskId
    })
  });
  if (state.memoByPage) {
    await Promise.all(Object.entries(state.memoByPage).map(([pageKey, memoBody]) =>
      apiRequest(`/dashboard-memos/${pageKey}`, {
        method: "PUT",
        body: body({ body: memoBody ?? "" })
      })
    ));
  }
  return true;
}

async function saveTask(task) {
  const isExisting = isUuid(task.id);
  const savedTask = await apiRequest(isExisting ? `/tasks/${task.id}` : "/tasks", {
    method: isExisting ? "PATCH" : "POST",
    body: body(taskPayload(task))
  });
  const taskId = savedTask.id;
  await apiRequest(`/tasks/${taskId}/tags`, {
    method: "PUT",
    body: body({ tags: task.tags ?? [] })
  });
  if (!isExisting) {
    for (const [index, subtask] of (task.subtasks ?? []).entries()) {
      if (!subtask.title?.trim()) continue;
      await apiRequest(`/tasks/${taskId}/subtasks`, {
        method: "POST",
        body: body({ title: subtask.title.trim(), sort_order: index })
      });
    }
    for (const link of (task.links ?? [])) {
      if (!link.url?.trim()) continue;
      await addTaskLink(taskId, link);
    }
  }
  return { id: taskId };
}

async function updateTaskStatus(taskId, status) {
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-saved-task" };
  await apiRequest(`/tasks/${taskId}/status`, {
    method: "PATCH",
    body: body({ status })
  });
  return true;
}

async function addTaskUpdate(taskId, text) {
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-saved-task" };
  await apiRequest(`/tasks/${taskId}/updates`, {
    method: "POST",
    body: body({ body: text, update_type: "note" })
  });
  return true;
}

async function updateTaskHistory(historyId, note) {
  if (!isUuid(historyId)) return { skipped: true, reason: "requires-saved-history" };
  const taskId = taskIdByHistoryId.get(historyId);
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-task-context" };
  await apiRequest(`/tasks/${taskId}/history/${historyId}`, {
    method: "PATCH",
    body: body({ note })
  });
  return true;
}

async function deleteTaskHistory(historyId) {
  if (!isUuid(historyId)) return { skipped: true, reason: "requires-saved-history" };
  const taskId = taskIdByHistoryId.get(historyId);
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-task-context" };
  await apiRequest(`/tasks/${taskId}/history/${historyId}`, { method: "DELETE" });
  taskIdByHistoryId.delete(historyId);
  return true;
}

async function addTaskLink(taskId, link) {
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-saved-task" };
  await apiRequest(`/tasks/${taskId}/links`, {
    method: "POST",
    body: body({
      title: link.title?.trim() || "관련 링크",
      url: link.url?.trim(),
      link_type: link.type?.trim() || "자료"
    })
  });
  return true;
}

async function setTaskArchived(taskId, archived) {
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-saved-task" };
  await apiRequest(`/tasks/${taskId}/archive`, {
    method: "PATCH",
    body: body({ archived })
  });
  return true;
}

async function setSubtaskDone(subtaskId, done) {
  if (!isUuid(subtaskId)) return { skipped: true, reason: "requires-saved-subtask" };
  const taskId = taskIdBySubtaskId.get(subtaskId);
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-task-context" };
  await apiRequest(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    body: body({ done })
  });
  return true;
}

async function deleteTask(taskId) {
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-saved-task" };
  await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
  return true;
}

async function deleteFutureRecurringInstances(taskId, afterDate = TODAY) {
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-saved-task" };
  await apiRequest(`/tasks/${taskId}/recurring/future?after_date=${encodeURIComponent(afterDate || TODAY)}`, { method: "DELETE" });
  return true;
}

async function saveTaskPost(taskId, post) {
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-saved-task" };
  const categoryId = postCategoryIdByLabel.get(post.scope);
  const payload = {
    ...(categoryId ? { category_id: categoryId } : {}),
    scope: allowedPostScopes.has(post.scope) ? post.scope : "team",
    title: post.title,
    body: post.body,
    url: post.url || null,
    attachment: post.attachment ?? null,
    posted_at: post.date || TODAY
  };
  const saved = await apiRequest(isUuid(post.id) ? `/tasks/${taskId}/posts/${post.id}` : `/tasks/${taskId}/posts`, {
    method: isUuid(post.id) ? "PATCH" : "POST",
    body: body(payload)
  });
  if (isUuid(saved.id)) taskIdByPostId.set(saved.id, taskId);
  return { id: saved.id };
}

async function deleteTaskPost(postId) {
  if (!isUuid(postId)) return { skipped: true, reason: "requires-saved-post" };
  const taskId = taskIdByPostId.get(postId);
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-task-context" };
  await apiRequest(`/tasks/${taskId}/posts/${postId}`, { method: "DELETE" });
  taskIdByPostId.delete(postId);
  return true;
}

async function saveTaskPostCategory(category) {
  const isExisting = isUuid(category.id);
  const saved = await apiRequest(isExisting ? `/post-categories/${category.id}` : "/post-categories", {
    method: isExisting ? "PATCH" : "POST",
    body: body({
      key: category.id || category.label,
      label: category.label,
      tone: category.tone ?? "slate",
      active: category.active !== false
    })
  });
  if (isUuid(saved.id)) {
    postCategoryIdByLabel.set(saved.label, saved.id);
    postCategoryIdByLabel.set(saved.key, saved.id);
  }
  return { id: saved.id };
}

async function deactivateTaskPostCategory(categoryId) {
  if (!isUuid(categoryId)) return { skipped: true, reason: "requires-saved-post-category" };
  await apiRequest(`/post-categories/${categoryId}`, {
    method: "PATCH",
    body: body({ active: false })
  });
  return true;
}

async function addTag(name) {
  const saved = await apiRequest("/tags", {
    method: "POST",
    body: body({ name, tone: "slate" })
  });
  tagIdByName.set(saved.name, saved.id);
  return { id: saved.id };
}

async function renameTag(oldName, nextName) {
  const tagId = tagIdByName.get(oldName);
  if (!isUuid(tagId)) return { skipped: true, reason: "requires-saved-tag" };
  const saved = await apiRequest(`/tags/${tagId}`, {
    method: "PATCH",
    body: body({ name: nextName })
  });
  tagIdByName.delete(oldName);
  tagIdByName.set(saved.name, saved.id);
  return true;
}

async function deleteTag(name) {
  const tagId = tagIdByName.get(name);
  if (!isUuid(tagId)) return { skipped: true, reason: "requires-saved-tag" };
  await apiRequest(`/tags/${tagId}`, { method: "DELETE" });
  tagIdByName.delete(name);
  return true;
}

async function saveTagGroup() {
  const group = arguments[0];
  const id = String(group?.id ?? "").trim();
  if (!id) return { skipped: true, reason: "requires-tag-group-id" };
  await apiRequest(`/tag-groups/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: body({
      label: group.label,
      tags: group.tags ?? [],
      tone: group.tone ?? "custom"
    })
  });
  return true;
}

async function deleteTagGroup() {
  const groupId = String(arguments[0] ?? "").trim();
  if (!groupId) return { skipped: true, reason: "requires-tag-group-id" };
  await apiRequest(`/tag-groups/${encodeURIComponent(groupId)}`, { method: "DELETE" });
  return true;
}

async function addCalendarEvent(event) {
  const saved = await apiRequest("/calendar/events", {
    method: "POST",
    body: body({
      title: event.title,
      event_date: event.startDate || event.date || TODAY,
      start_date: event.startDate || event.date || TODAY,
      end_date: event.endDate || event.startDate || event.date || TODAY,
      scope: event.scope || "team",
      note: event.note ?? ""
    })
  });
  return { id: saved.id };
}

async function updateCalendarEvent(event) {
  if (!isUuid(event.id)) return { skipped: true, reason: "requires-saved-event" };
  await apiRequest(`/calendar/events/${event.id}`, {
    method: "PATCH",
    body: body({
      title: event.title,
      event_date: event.startDate || event.date || TODAY,
      start_date: event.startDate || event.date || TODAY,
      end_date: event.endDate || event.startDate || event.date || TODAY,
      scope: event.scope || "team",
      note: event.note ?? ""
    })
  });
  return true;
}

async function deleteCalendarEvent() {
  const eventId = arguments[0];
  if (!isUuid(eventId)) return { skipped: true, reason: "requires-saved-event" };
  await apiRequest(`/calendar/events/${eventId}`, { method: "DELETE" });
  return true;
}

async function updateTaskLog(updateId, text) {
  if (!isUuid(updateId)) return { skipped: true, reason: "requires-saved-update" };
  const taskId = taskIdByUpdateId.get(updateId);
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-task-context" };
  await apiRequest(`/tasks/${taskId}/updates/${updateId}`, {
    method: "PATCH",
    body: body({ body: text })
  });
  return true;
}

async function deleteTaskLog(updateId) {
  if (!isUuid(updateId)) return { skipped: true, reason: "requires-saved-update" };
  const taskId = taskIdByUpdateId.get(updateId);
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-task-context" };
  await apiRequest(`/tasks/${taskId}/updates/${updateId}`, { method: "DELETE" });
  taskIdByUpdateId.delete(updateId);
  return true;
}

async function readCanvasState() {
  return apiRequest("/canvas/state");
}

async function saveCanvasState(state) {
  return apiRequest("/canvas/state", {
    method: "PUT",
    body: body(state)
  });
}

async function readAiEvidence(intent) {
  const path = buildAiReadPath(intent);
  if (!path) return { skipped: true, reason: "unsupported-ai-intent" };
  return apiRequest(path);
}

async function importDashboardData() {
  return { skipped: true, reason: "bulk-import-not-implemented" };
}

async function updateProfile(personId, patch) {
  if (!isUuid(personId)) return { skipped: true, reason: "requires-saved-profile" };
  const payload = normalizeRosterPayload(patch);
  const path = personId === currentUserId ? "/me" : `/admin/roster/${personId}`;
  await apiRequest(path, {
    method: "PATCH",
    body: body(payload)
  });
  return true;
}

async function updateProfileEmoji(personId, emoji) {
  return updateProfile(personId, { profileEmoji: emoji });
}

export const apiDashboardStore = {
  id: "fastapi",
  label: "FastAPI",
  canUse: () => apiConfig.isConfigured,
  read: readDashboardState,
  write: writeUserPreferences,
  clear: signOut,
  auth: {
    getCurrentProfile,
    signInWithPassword,
    signUpWithPassword,
    signOut
  },
  profiles: {
    update: updateProfile,
    updateEmoji: updateProfileEmoji,
    updateAdministration: updateProfile
  },
  tags: {
    add: addTag,
    rename: renameTag,
    delete: deleteTag,
    saveGroup: saveTagGroup,
    deleteGroup: deleteTagGroup
  },
  tasks: {
    save: saveTask,
    updateStatus: updateTaskStatus,
    addUpdate: addTaskUpdate,
    updateLog: updateTaskLog,
    deleteLog: deleteTaskLog,
    savePost: saveTaskPost,
    deletePost: deleteTaskPost,
    savePostCategory: saveTaskPostCategory,
    deactivatePostCategory: deactivateTaskPostCategory,
    updateHistory: updateTaskHistory,
    deleteHistory: deleteTaskHistory,
    addLink: addTaskLink,
    setArchived: setTaskArchived,
    setSubtaskDone,
    deleteFutureInstances: deleteFutureRecurringInstances,
    delete: deleteTask
  },
  events: {
    add: addCalendarEvent,
    update: updateCalendarEvent,
    delete: deleteCalendarEvent
  },
  canvas: {
    read: readCanvasState,
    save: saveCanvasState
  },
  ai: {
    readEvidence: readAiEvidence
  },
  importData: importDashboardData,
  mappers: {
    seedSnapshot: () => createDashboardSnapshot({
      tasks: initialTasks,
      availableTags: [],
      calendarEvents: initialCalendarEvents,
      selectedPersonId: "kmryu",
      timelineMonth: TODAY.slice(0, 7),
      timelineYear: TODAY.slice(0, 4)
    })
  }
};
