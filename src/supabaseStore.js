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
    assigner_id: isUuid(task.assignerId) ? userMap.get(task.assignerId) ?? task.assignerId : null,
    creator_id: userMap.get(task.creatorId) ?? userMap.get(task.ownerId) ?? task.creatorId,
    status: task.status || "계획",
    priority: task.priority || "보통",
    start_date: task.startDate || TODAY,
    due_date: task.dueDate || task.startDate || TODAY,
    completed_at: task.completedAt || null,
    completed_by: isUuid(task.completedBy) ? userMap.get(task.completedBy) ?? task.completedBy : null,
    progress_before_complete: task.progressBeforeComplete ?? null,
    progress: Number.isFinite(Number(task.progress)) ? Number(task.progress) : 0,
    archived_at: task.archived ? new Date().toISOString() : null,
    recurring_template_id: isUuid(task.recurringTemplateId) ? task.recurringTemplateId : null
  };
  if (isUuid(task.id)) row.id = task.id;
  return row;
}

function canPersistTask(task) {
  return isUuid(task.ownerId) && isUuid(task.creatorId || task.ownerId);
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
    isTeamMember: row.is_team_member,
    isActive: row.is_active
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
        isTeamMember: user.isTeamMember,
        isActive: user.isActive
      }
    ])
  );
}

async function readCurrentUser(client) {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) {
    const message = authError.message?.toLowerCase() ?? "";
    if (message.includes("session") && message.includes("missing")) return null;
    throw authError;
  }
  if (!authData.user) return null;

  const { data: profile, error: profileError } = await client
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .single();
  if (profileError) throw profileError;
  return fromUserRow(profile);
}

async function getCurrentProfile() {
  if (!supabaseConfig.isConfigured) return null;
  return readCurrentUser(requireSupabaseClient());
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
    (currentUser.permissionRole === "admin"
      ? client.from("users").select("*").order("name", { ascending: true })
      : client.from("users").select("*").eq("is_active", true).order("name", { ascending: true })),
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
  const now = new Date().toISOString();
  const selectedTaskId = isUuid(state.selectedTaskId) ? state.selectedTaskId : null;
  const writes = [
    client.from("user_preferences").upsert({
      user_id: currentUser.id,
      active_page: state.activePage,
      active_view: state.activeView,
      selected_tag: state.category,
      timeline_mode: state.timelineMode,
      timeline_month: state.timelineMonth,
      timeline_year: state.timelineYear,
      selected_task_id: selectedTaskId,
      updated_at: now
    })
  ];

  if (state.memoByPage) {
    writes.push(
      client.from("dashboard_memos").upsert(
        Object.entries(state.memoByPage).map(([pageKey, body]) => ({
          page_key: pageKey,
          body: body ?? "",
          updated_by: currentUser.id,
          updated_at: now
        }))
      )
    );
  }

  const results = await Promise.all(writes);
  results.forEach((result) => {
    if (result.error) throw result.error;
  });
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

async function updateProfile(userId, profile) {
  if (!isUuid(userId)) return { skipped: true };
  const patch = {};
  if (profile.name?.trim()) patch.name = profile.name.trim();
  if (profile.title?.trim()) patch.title = profile.title.trim();
  if (profile.profileEmoji?.trim()) patch.profile_emoji = profile.profileEmoji.trim();
  if (!Object.keys(patch).length) return false;
  const client = requireSupabaseClient();
  const { error } = await client
    .from("users")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
  return true;
}

async function updateProfileEmoji(userId, emoji) {
  return updateProfile(userId, { profileEmoji: emoji });
}

async function updateUserAdministration(userId, adminPatch) {
  if (!isUuid(userId)) return { skipped: true };
  const patch = {};
  if (adminPatch.permissionRole) patch.permission_role = adminPatch.permissionRole;
  if (typeof adminPatch.isTeamMember === "boolean") patch.is_team_member = adminPatch.isTeamMember;
  if (typeof adminPatch.isActive === "boolean") patch.is_active = adminPatch.isActive;
  if (!Object.keys(patch).length) return false;
  const client = requireSupabaseClient();
  const { error } = await client
    .from("users")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
  return true;
}

async function addTag(name) {
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return false;
  const cleanName = name.trim();
  if (!cleanName) return false;
  const { error } = await client
    .from("tags")
    .upsert(
      { name: cleanName, created_by: currentUser.id },
      { onConflict: "name", ignoreDuplicates: true }
    );
  if (error) throw error;
  return true;
}

async function renameTag(oldName, nextName) {
  const client = requireSupabaseClient();
  const cleanName = nextName.trim();
  if (!oldName || !cleanName || oldName === cleanName) return false;
  const { error } = await client
    .from("tags")
    .update({ name: cleanName, updated_at: new Date().toISOString() })
    .eq("name", oldName);
  if (error) throw error;
  return true;
}

async function deleteTag(name) {
  const client = requireSupabaseClient();
  if (!name) return false;
  const { error } = await client.from("tags").delete().eq("name", name);
  if (error) throw error;
  return true;
}

async function ensureTags(client, names, userId) {
  const cleanNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (!cleanNames.length) return [];
  const results = await Promise.all(
    cleanNames.map((name) =>
      client
        .from("tags")
        .upsert({ name, created_by: userId }, { onConflict: "name", ignoreDuplicates: true })
    )
  );
  results.forEach((result) => {
    if (result.error) throw result.error;
  });
  const { data, error } = await client.from("tags").select("id, name").in("name", cleanNames);
  if (error) throw error;
  return data ?? [];
}

async function saveTask(task) {
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser || !canPersistTask(task)) return { skipped: true, reason: "requires-real-users" };
  const userMap = new Map();
  const row = toTaskRow({ ...task, creatorId: task.creatorId || currentUser.id }, userMap);
  const previousTask = isUuid(task.id)
    ? await client.from("tasks").select("due_date").eq("id", task.id).maybeSingle()
    : { data: null, error: null };
  if (previousTask.error) throw previousTask.error;
  const { data: savedTask, error: taskError } = await client
    .from("tasks")
    .upsert(row)
    .select("id")
    .single();
  if (taskError) throw taskError;

  const taskId = savedTask.id;
  const subtasks = (task.subtasks ?? []).filter((subtask) => subtask.title?.trim());
  await client.from("subtasks").delete().eq("task_id", taskId);
  if (subtasks.length) {
    const { error } = await client.from("subtasks").insert(
      subtasks.map((subtask, index) => ({
        task_id: taskId,
        title: subtask.title.trim(),
        done: Boolean(subtask.done),
        sort_order: index
      }))
    );
    if (error) throw error;
  }

  const links = (task.links ?? []).filter((link) => link.url?.trim());
  await client.from("task_links").delete().eq("task_id", taskId);
  if (links.length) {
    const { error } = await client.from("task_links").insert(
      links.map((link) => ({
        task_id: taskId,
        title: link.title?.trim() || "관련 링크",
        url: link.url.trim(),
        link_type: link.type?.trim() || "자료",
        created_by: currentUser.id
      }))
    );
    if (error) throw error;
  }

  const tagRows = await ensureTags(client, task.tags ?? [], currentUser.id);
  await client.from("task_tags").delete().eq("task_id", taskId);
  if (tagRows.length) {
    const { error } = await client.from("task_tags").insert(
      tagRows.map((tag) => ({
        task_id: taskId,
        tag_id: tag.id,
        created_by: currentUser.id
      }))
    );
    if (error) throw error;
  }

  if (previousTask.data?.due_date && previousTask.data.due_date !== task.dueDate) {
    const { error } = await client.from("task_change_history").insert({
      task_id: taskId,
      change_type: "due_date",
      from_value: previousTask.data.due_date,
      to_value: task.dueDate,
      actor_id: currentUser.id,
      note: `마감일 변경: ${previousTask.data.due_date} → ${task.dueDate}`
    });
    if (error) throw error;
  }

  return { id: taskId };
}

async function updateTaskStatus(taskId, status) {
  if (!isUuid(taskId)) return { skipped: true };
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { data: previous, error: previousError } = await client
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();
  if (previousError) throw previousError;
  const completedPatch = status === "완료"
    ? { completed_at: TODAY, completed_by: currentUser.id, progress: 100 }
    : { completed_at: null, completed_by: null };
  const { error } = await client
    .from("tasks")
    .update({ status, archived_at: null, ...completedPatch })
    .eq("id", taskId);
  if (error) throw error;
  if (previous?.status !== status) {
    const { error: historyError } = await client.from("task_change_history").insert({
      task_id: taskId,
      change_type: "status",
      from_value: previous?.status ?? "",
      to_value: status,
      actor_id: currentUser.id
    });
    if (historyError) throw historyError;
  }
  return true;
}

async function addTaskUpdate(taskId, text) {
  if (!isUuid(taskId)) return { skipped: true };
  const cleanText = text.trim();
  if (!cleanText) return false;
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { error } = await client.from("task_updates").insert({
    task_id: taskId,
    author_id: currentUser.id,
    body: cleanText
  });
  if (error) throw error;
  return true;
}

async function addTaskLink(taskId, link) {
  if (!isUuid(taskId)) return { skipped: true };
  const url = link.url?.trim();
  if (!url) return false;
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { error } = await client.from("task_links").insert({
    task_id: taskId,
    title: link.title?.trim() || "관련 링크",
    url,
    link_type: link.type?.trim() || "자료",
    created_by: currentUser.id
  });
  if (error) throw error;
  return true;
}

async function setTaskArchived(taskId, archived) {
  if (!isUuid(taskId)) return { skipped: true };
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { error } = await client
    .from("tasks")
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      archived_by: archived ? currentUser.id : null
    })
    .eq("id", taskId);
  if (error) throw error;
  return true;
}

async function setSubtaskDone(subtaskId, done, taskProgress) {
  if (!isUuid(subtaskId)) return { skipped: true };
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { data: subtask, error: subtaskError } = await client
    .from("subtasks")
    .select("task_id")
    .eq("id", subtaskId)
    .single();
  if (subtaskError) throw subtaskError;
  const { error } = await client
    .from("subtasks")
    .update({
      done,
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? currentUser.id : null
    })
    .eq("id", subtaskId);
  if (error) throw error;
  if (subtask?.task_id && Number.isFinite(Number(taskProgress))) {
    const { error: taskError } = await client
      .from("tasks")
      .update({ progress: Number(taskProgress) })
      .eq("id", subtask.task_id);
    if (taskError) throw taskError;
  }
  return true;
}

async function deleteTask(taskId) {
  if (!isUuid(taskId)) return { skipped: true };
  const client = requireSupabaseClient();
  const { error } = await client.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  return true;
}

async function addCalendarEvent(event) {
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const scope = event.scope === "personal" ? "personal" : "team";
  const ownerId = isUuid(event.ownerId) ? event.ownerId : scope === "personal" ? currentUser.id : null;
  const row = {
    title: event.title.trim(),
    event_date: event.date || TODAY,
    scope,
    owner_id: ownerId,
    note: event.note?.trim() || null,
    created_by: currentUser.id
  };
  const { data, error } = await client.from("calendar_events").insert(row).select("id").single();
  if (error) throw error;
  return { id: data.id };
}

async function updateCalendarEvent(event) {
  if (!isUuid(event.id)) return { skipped: true };
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const scope = event.scope === "personal" ? "personal" : "team";
  const ownerId = isUuid(event.ownerId) ? event.ownerId : scope === "personal" ? currentUser.id : null;
  const { error } = await client
    .from("calendar_events")
    .update({
      title: event.title.trim(),
      event_date: event.date || TODAY,
      scope,
      owner_id: ownerId,
      note: event.note?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", event.id);
  if (error) throw error;
  return true;
}

async function deleteCalendarEvent(eventId) {
  if (!isUuid(eventId)) return { skipped: true };
  const client = requireSupabaseClient();
  const { error } = await client.from("calendar_events").delete().eq("id", eventId);
  if (error) throw error;
  return true;
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
    getCurrentProfile,
    signInWithPassword,
    signUpWithPassword,
    signOut
  },
  profiles: {
    update: updateProfile,
    updateEmoji: updateProfileEmoji,
    updateAdministration: updateUserAdministration
  },
  tags: {
    add: addTag,
    rename: renameTag,
    delete: deleteTag
  },
  tasks: {
    save: saveTask,
    updateStatus: updateTaskStatus,
    addUpdate: addTaskUpdate,
    addLink: addTaskLink,
    setArchived: setTaskArchived,
    setSubtaskDone,
    delete: deleteTask
  },
  events: {
    add: addCalendarEvent,
    update: updateCalendarEvent,
    delete: deleteCalendarEvent
  },
  mappers: {
    fromTaskRow,
    toTaskRow,
    seedSnapshot,
    seedUserMap
  }
};
