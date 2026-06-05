import { initialCalendarEvents, initialTasks, people, TODAY } from "./data.js";
import { createDashboardSnapshot } from "./storage.js";
import { requireSupabaseClient, supabaseConfig } from "./supabaseClient.js";

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toTaskRow(task, userMap) {
  const row = {
    title: task.title,
    description: task.description || null,
    owner_id: userMap.get(task.ownerId) ?? task.ownerId,
    assigner_type: task.assignerType || "개인",
    assigner_id: userMap.get(task.assignerId) ?? null,
    creator_id: userMap.get(task.creatorId) ?? userMap.get(task.ownerId) ?? task.creatorId,
    status: task.status || "계획",
    priority: task.priority || "보통",
    start_date: task.startDate || TODAY,
    due_date: task.dueDate || task.startDate || TODAY,
    completed_at: task.completedAt || null,
    completed_by: task.completedBy ? userMap.get(task.completedBy) ?? task.completedBy : null,
    progress_before_complete: task.progressBeforeComplete ?? null,
    progress: Number.isFinite(Number(task.progress)) ? Number(task.progress) : 0,
    archived_at: task.archived ? new Date().toISOString() : null,
    recurring_template_id: task.recurringTemplateId ?? null
  };
  if (isUuid(task.id)) row.id = task.id;
  return row;
}

function fromTaskRow(row, relations = {}) {
  const tags = relations.tags ?? [];
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    ownerId: row.owner_id,
    assignerType: row.assigner_type,
    assignerId: row.assigner_id ?? row.owner_id,
    creatorId: row.creator_id,
    status: row.status,
    priority: row.priority,
    category: tags[0] ?? "운영",
    tags: tags.length ? tags : ["운영"],
    startDate: row.start_date,
    dueDate: row.due_date,
    completedAt: row.completed_at ?? "",
    completedBy: row.completed_by ?? "",
    progressBeforeComplete: row.progress_before_complete ?? undefined,
    progress: row.progress ?? 0,
    subtasks: relations.subtasks ?? [],
    archived: Boolean(row.archived_at),
    createdAt: row.created_at?.slice(0, 10) ?? row.start_date,
    isNewAssignment: false,
    recurring: null,
    recurringDetail: "",
    recurringInterval: 1,
    recurringWeekdays: [],
    recurringStartDate: row.start_date,
    recurringEndDate: "",
    recurringNoEnd: false,
    recurringDurationDays: 1,
    isRecurringInstance: Boolean(row.recurring_template_id),
    recurringTemplateId: row.recurring_template_id ?? undefined,
    links: relations.links ?? [],
    updates: relations.updates ?? [],
    statusHistory: relations.statusHistory ?? []
  };
}

function fromUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.title,
    permissionRole: row.permission_role,
    color: "#2563eb",
    emoji: row.profile_emoji,
    isTeamMember: row.is_team_member
  };
}

function toProfileOverrides(users) {
  return Object.fromEntries(
    users.map((user) => [
      user.id,
      {
        name: user.name,
        role: user.role,
        permissionRole: user.permissionRole,
        emoji: user.emoji,
        isTeamMember: user.isTeamMember
      }
    ])
  );
}

async function readCurrentUser(client) {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data: profile, error: profileError } = await client
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .single();
  if (profileError) throw profileError;
  return fromUserRow(profile);
}

async function readDashboardState() {
  if (!supabaseConfig.isConfigured) return {};
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { isAuthenticated: false };

  const [
    usersResult,
    tagsResult,
    tasksResult,
    subtasksResult,
    updatesResult,
    linksResult,
    historyResult,
    taskTagsResult,
    eventsResult,
    memosResult,
    preferencesResult
  ] = await Promise.all([
    client.from("users").select("*").eq("is_active", true).order("name", { ascending: true }),
    client.from("tags").select("*").order("name", { ascending: true }),
    client.from("tasks").select("*").order("due_date", { ascending: true }),
    client.from("subtasks").select("*").order("sort_order", { ascending: true }),
    client.from("task_updates").select("*").order("created_at", { ascending: false }),
    client.from("task_links").select("*").order("created_at", { ascending: false }),
    client.from("task_change_history").select("*").order("created_at", { ascending: false }),
    client.from("task_tags").select("task_id, tags(name)").order("created_at", { ascending: true }),
    client.from("calendar_events").select("*").order("event_date", { ascending: true }),
    client.from("dashboard_memos").select("*"),
    client.from("user_preferences").select("*").eq("user_id", currentUser.id).maybeSingle()
  ]);

  [usersResult, tagsResult, tasksResult, subtasksResult, updatesResult, linksResult, historyResult, taskTagsResult, eventsResult, memosResult].forEach((result) => {
    if (result.error) throw result.error;
  });
  if (preferencesResult.error) throw preferencesResult.error;

  const relationMap = new Map();
  const ensureRelations = (taskId) => {
    if (!relationMap.has(taskId)) {
      relationMap.set(taskId, { subtasks: [], updates: [], links: [], statusHistory: [], tags: [] });
    }
    return relationMap.get(taskId);
  };

  subtasksResult.data.forEach((subtask) => {
    ensureRelations(subtask.task_id).subtasks.push({
      id: subtask.id,
      title: subtask.title,
      done: subtask.done
    });
  });
  updatesResult.data.forEach((update) => {
    ensureRelations(update.task_id).updates.push({
      authorId: update.author_id,
      date: update.created_at.slice(0, 10),
      text: update.body
    });
  });
  linksResult.data.forEach((link) => {
    ensureRelations(link.task_id).links.push({
      title: link.title,
      url: link.url,
      type: link.link_type
    });
  });
  historyResult.data.forEach((entry) => {
    ensureRelations(entry.task_id).statusHistory.push({
      type: entry.change_type === "due_date" ? "dueDate" : entry.change_type,
      from: entry.from_value ?? "",
      to: entry.to_value,
      actorId: entry.actor_id,
      date: entry.created_at.slice(0, 10),
      note: entry.note ?? ""
    });
  });
  taskTagsResult.data.forEach((tagRow) => {
    const tagName = tagRow.tags?.name;
    if (tagName) ensureRelations(tagRow.task_id).tags.push(tagName);
  });

  const preferences = preferencesResult.data ?? {};
  return createDashboardSnapshot({
    tasks: tasksResult.data.map((task) => fromTaskRow(task, ensureRelations(task.id))),
    availableTags: tagsResult.data.map((tag) => tag.name),
    calendarEvents: eventsResult.data.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.event_date,
      scope: event.scope,
      ownerId: event.owner_id,
      note: event.note ?? ""
    })),
    isAuthenticated: true,
    selectedPersonId: currentUser.id,
    activePage: preferences.active_page ?? "my",
    activeView: preferences.active_view ?? "board",
    category: preferences.selected_tag ?? "전체",
    priorityFilter: "전체",
    timelineMode: preferences.timeline_mode ?? "month",
    timelineMonth: preferences.timeline_month ?? TODAY.slice(0, 7),
    timelineYear: preferences.timeline_year ?? TODAY.slice(0, 4),
    selectedTaskId: preferences.selected_task_id ?? "",
    memoByPage: Object.fromEntries(memosResult.data.map((memo) => [memo.page_key, memo.body])),
    profileOverrides: toProfileOverrides(usersResult.data.map(fromUserRow))
  });
}

async function writeUserPreferences(state) {
  if (!supabaseConfig.isConfigured) return false;
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return false;
  const { error } = await client.from("user_preferences").upsert({
    user_id: currentUser.id,
    active_page: state.activePage,
    active_view: state.activeView,
    selected_tag: state.category,
    timeline_mode: state.timelineMode,
    timeline_month: state.timelineMonth,
    timeline_year: state.timelineYear,
    selected_task_id: state.selectedTaskId || null,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
  return true;
}

async function signInWithPassword(email, password) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signUpWithPassword({ email, password, name, profileEmoji = "🌿" }) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        profile_emoji: profileEmoji
      }
    }
  });
  if (error) throw error;
  return data;
}

async function signOut() {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

function seedUserMap() {
  return new Map(people.map((person) => [person.id, person.id]));
}

function seedSnapshot() {
  return createDashboardSnapshot({
    tasks: initialTasks,
    availableTags: [],
    calendarEvents: initialCalendarEvents,
    selectedPersonId: "seoyeon",
    timelineMonth: TODAY.slice(0, 7),
    timelineYear: TODAY.slice(0, 4)
  });
}

export const supabaseDashboardStore = {
  id: "supabase",
  label: "Supabase",
  canUse: () => supabaseConfig.isConfigured,
  read: readDashboardState,
  write: writeUserPreferences,
  clear: signOut,
  auth: {
    signInWithPassword,
    signUpWithPassword,
    signOut
  },
  mappers: {
    fromTaskRow,
    toTaskRow,
    seedSnapshot,
    seedUserMap
  }
};
