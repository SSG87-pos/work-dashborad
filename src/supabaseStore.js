import { initialCalendarEvents, initialTasks, people, TODAY } from "./data.js";
import { createDashboardSnapshot } from "./storage.js";
import { normalizeCanvasState } from "./canvasModel.js";
import { requireSupabaseClient, supabaseConfig } from "./supabaseClient.js";

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function recurringFrequencyToDb(value) {
  if (value === "매주") return "weekly";
  if (value === "매월") return "monthly";
  return null;
}

function recurringFrequencyFromDb(value) {
  if (value === "weekly") return "매주";
  if (value === "monthly") return "매월";
  if (value === "quarterly") return "매월";
  return null;
}

function changeTypeToDb(value) {
  if (value === "dueDate") return "due_date";
  if (["status", "archive", "delete", "recurring"].includes(value)) return value;
  return "status";
}

function isMissingColumnError(error, columnName) {
  return error?.code === "PGRST204" && String(error?.message ?? "").includes(`'${columnName}'`);
}

function toTaskRow(task, currentUserId) {
  const recurringFrequency = recurringFrequencyToDb(task.recurring);
  const ownerIsUser = isUuid(task.ownerId);
  const creatorIsUser = isUuid(task.creatorId);
  const assignerIsUser = isUuid(task.assignerId);
  const row = {
    title: task.title,
    description: task.description || null,
    owner_id: ownerIsUser ? task.ownerId : currentUserId,
    owner_roster_id: ownerIsUser ? null : task.ownerId,
    assigner_type: task.assignerType || "개인",
    assigner_id: assignerIsUser ? task.assignerId : null,
    assigner_roster_id: assignerIsUser ? null : task.assignerId || null,
    creator_id: creatorIsUser ? task.creatorId : currentUserId,
    creator_roster_id: creatorIsUser ? null : task.creatorId || task.ownerId,
    status: task.status || "계획",
    priority: task.priority || "보통",
    start_date: task.startDate || TODAY,
    due_date: task.dueDate || task.startDate || TODAY,
    completed_at: task.completedAt || null,
    completed_by: isUuid(task.completedBy) ? task.completedBy : null,
    progress_before_complete: task.progressBeforeComplete ?? null,
    progress: Number.isFinite(Number(task.progress)) ? Number(task.progress) : 0,
    archived_at: task.archived ? new Date().toISOString() : null,
    deleted_at: task.deletedAt ? new Date().toISOString() : null,
    recurring_template_id: isUuid(task.recurringTemplateId) ? task.recurringTemplateId : null,
    recurring_frequency: recurringFrequency,
    recurring_interval: recurringFrequency ? Math.max(1, Number(task.recurringInterval) || 1) : null,
    recurring_weekdays: recurringFrequency === "weekly" ? (task.recurringWeekdays ?? []) : [],
    recurring_start_date: recurringFrequency ? task.recurringStartDate || task.startDate || TODAY : null,
    recurring_end_date: recurringFrequency && !task.recurringNoEnd ? task.recurringEndDate || task.dueDate || null : null,
    recurring_no_end: Boolean(recurringFrequency && task.recurringNoEnd),
    recurring_rule_detail: recurringFrequency ? task.recurringDetail || null : null,
    recurring_duration_days: recurringFrequency ? Math.max(1, Number(task.recurringDurationDays) || 1) : 1
  };
  if (isUuid(task.id)) row.id = task.id;
  return row;
}

function canPersistTask(task) {
  return Boolean(task.ownerId);
}

function fromTaskRow(row, relations = {}) {
  const tags = relations.tags ?? [];
  const recurring = recurringFrequencyFromDb(row.recurring_frequency);
  const recurringInterval = row.recurring_frequency === "quarterly"
    ? Math.max(3, Number(row.recurring_interval) || 3)
    : row.recurring_interval ?? 1;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    ownerId: row.owner_roster_id ?? row.owner_id,
    assignerType: row.assigner_type,
    assignerId: row.assigner_roster_id ?? row.assigner_id ?? row.owner_roster_id ?? row.owner_id,
    creatorId: row.creator_roster_id ?? row.creator_id,
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
    deletedAt: row.deleted_at?.slice(0, 10) ?? "",
    createdAt: row.created_at?.slice(0, 10) ?? row.start_date,
    isNewAssignment: false,
    recurring,
    recurringDetail: row.recurring_rule_detail ?? "",
    recurringInterval,
    recurringWeekdays: row.recurring_weekdays ?? [],
    recurringStartDate: row.recurring_start_date ?? row.start_date,
    recurringEndDate: row.recurring_end_date ?? "",
    recurringNoEnd: Boolean(row.recurring_no_end),
    recurringDurationDays: row.recurring_duration_days ?? 1,
    isRecurringInstance: Boolean(row.recurring_template_id),
    recurringTemplateId: row.recurring_template_id ?? undefined,
    links: relations.links ?? [],
    updates: relations.updates ?? [],
    statusHistory: relations.statusHistory ?? [],
    postItems: relations.posts ?? []
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

function fromRosterRow(row) {
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
        isActive: user.isActive,
        expectedEmail: user.expectedEmail,
        authUserId: user.authUserId
      }
    ])
  );
}

function fromTaskPostCategoryRow(row) {
  return {
    id: row.id,
    label: row.label,
    tone: row.tone ?? "slate",
    active: row.active !== false
  };
}

function fromTaskPostRow(row) {
  return {
    id: row.id,
    scope: row.scope,
    title: row.title,
    body: row.body,
    url: row.url ?? "",
    attachment: row.attachment ?? null,
    authorId: row.author_id,
    date: row.posted_at ?? row.created_at?.slice(0, 10) ?? TODAY,
    createdAt: row.created_at?.slice(0, 10) ?? row.posted_at ?? TODAY,
    updatedAt: row.updated_at?.slice(0, 10) ?? ""
  };
}

function rosterIdFor(personId) {
  return isUuid(personId) ? null : personId;
}

function authUserIdFor(personId, directory = []) {
  const person = directory.find((item) => item.id === personId);
  return isUuid(person?.authUserId) ? person.authUserId : null;
}

async function ensureRosterPeople(client, ids, directory = [], currentUser) {
  const rosterIds = Array.from(new Set(ids.map(rosterIdFor).filter(Boolean)));
  if (!rosterIds.length || currentUser?.permissionRole !== "admin") return;
  const rows = rosterIds.map((id) => {
    const person = directory.find((item) => item.id === id);
    return {
      id,
      expected_email: person?.expectedEmail?.trim() || null,
      auth_user_id: isUuid(person?.authUserId) ? person.authUserId : null,
      name: person?.name || id,
      title: person?.role || "팀원",
      profile_emoji: person?.emoji || "🌿",
      permission_role: person?.permissionRole || "member",
      is_team_member: person?.isTeamMember !== false,
      is_active: person?.isActive !== false
    };
  });
  const { error } = await client.from("team_roster").upsert(rows, { onConflict: "id" });
  if (error) throw error;
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
    rosterResult,
    tagsResult,
    tasksResult,
    subtasksResult,
    updatesResult,
    linksResult,
    historyResult,
    taskTagsResult,
    tagGroupsResult,
    eventsResult,
    memosResult,
    preferencesResult,
    postCategoriesResult,
    postsResult
  ] = await Promise.all([
    (currentUser.permissionRole === "admin"
      ? client.from("users").select("*").order("name", { ascending: true })
      : client.from("users").select("*").eq("is_active", true).order("name", { ascending: true })),
    (currentUser.permissionRole === "admin"
      ? client.from("team_roster").select("*").order("name", { ascending: true })
      : client.from("team_roster").select("*").eq("is_active", true).order("name", { ascending: true })),
    client.from("tags").select("*").order("name", { ascending: true }),
    client.from("tasks").select("*").order("due_date", { ascending: true }),
    client.from("subtasks").select("*").order("sort_order", { ascending: true }),
    client.from("task_updates").select("*").order("created_at", { ascending: false }),
    client.from("task_links").select("*").order("created_at", { ascending: false }),
    client.from("task_change_history").select("*").order("created_at", { ascending: false }),
    client.from("task_tags").select("task_id, tags(name)").order("created_at", { ascending: true }),
    client.from("tag_groups").select("*").order("sort_order", { ascending: true }),
    client.from("calendar_events").select("*").order("event_date", { ascending: true }),
    client.from("dashboard_memos").select("*"),
    client.from("user_preferences").select("*").eq("user_id", currentUser.id).maybeSingle(),
    client.from("task_post_categories").select("*").order("sort_order", { ascending: true }),
    client.from("task_posts").select("*").order("created_at", { ascending: false })
  ]);

  [usersResult, rosterResult, tagsResult, tasksResult, subtasksResult, updatesResult, linksResult, historyResult, taskTagsResult, eventsResult, memosResult].forEach((result) => {
    if (result.error) throw result.error;
  });
  if (tagGroupsResult.error && tagGroupsResult.error.code !== "42P01") throw tagGroupsResult.error;
  if (preferencesResult.error) throw preferencesResult.error;
  if (postCategoriesResult.error && !isMissingTableError(postCategoriesResult.error)) throw postCategoriesResult.error;
  if (postsResult.error && !isMissingTableError(postsResult.error)) throw postsResult.error;

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
      id: update.id,
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
      id: entry.id,
      type: entry.change_type === "due_date" ? "dueDate" : entry.change_type,
      from: entry.from_value ?? "",
      to: entry.to_value,
      actorId: entry.actor_id,
      date: entry.created_at.slice(0, 10),
      note: entry.note ?? ""
    });
  });
  (postsResult.data ?? []).forEach((post) => {
    ensureRelations(post.task_id).posts.push(fromTaskPostRow(post));
  });
  taskTagsResult.data.forEach((tagRow) => {
    const tagName = tagRow.tags?.name;
    if (tagName) ensureRelations(tagRow.task_id).tags.push(tagName);
  });

  const preferences = preferencesResult.data ?? {};
  const rosterProfiles = rosterResult.data.map(fromRosterRow);
  const userProfiles = usersResult.data.map(fromUserRow);
  const linkedRosterAuthIds = new Set(rosterProfiles.map((person) => person.authUserId).filter(Boolean));
  const mergedProfiles = [
    ...rosterProfiles,
    ...userProfiles.filter((person) => !linkedRosterAuthIds.has(person.id))
  ];
  return createDashboardSnapshot({
    tasks: tasksResult.data.map((task) => fromTaskRow(task, ensureRelations(task.id))),
    availableTags: tagsResult.data.map((tag) => tag.name),
    tagGroups: (tagGroupsResult.data ?? []).map((group) => ({
      id: group.id,
      label: group.label,
      tags: group.tags ?? [],
      tone: group.tone ?? "custom"
    })),
    taskPostCategories: (postCategoriesResult.data ?? []).map(fromTaskPostCategoryRow),
    calendarEvents: eventsResult.data.map((event) => ({
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
    profileOverrides: toProfileOverrides(mergedProfiles)
  });
}

async function saveTaskPost(taskId, post) {
  if (!isUuid(taskId)) return { skipped: true, reason: "requires-saved-task" };
  const title = post?.title?.trim();
  const body = post?.body?.trim();
  if (!title || !body) return false;
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true, reason: "requires-auth" };
  const row = {
    scope: post.scope?.trim() || "기억할 점",
    title,
    body,
    url: post.url?.trim() || null,
    attachment: post.attachment ?? null,
    updated_at: new Date().toISOString()
  };
  if (isUuid(post.id)) {
    const { data, error } = await client
      .from("task_posts")
      .update(row)
      .eq("id", post.id)
      .select("id")
      .single();
    if (isMissingTableError(error) || isMissingColumnError(error, "attachment")) return { skipped: true, reason: "missing-task-posts-table" };
    if (error) throw error;
    return { id: data.id };
  }
  const { data, error } = await client
    .from("task_posts")
    .insert({
      ...row,
      task_id: taskId,
      author_id: currentUser.id,
      posted_at: post.date || TODAY
    })
    .select("id")
    .single();
  if (isMissingTableError(error) || isMissingColumnError(error, "attachment")) return { skipped: true, reason: "missing-task-posts-table" };
  if (error) throw error;
  return { id: data.id };
}

async function deleteTaskPost(postId) {
  if (!isUuid(postId)) return { skipped: true, reason: "requires-saved-post" };
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true, reason: "requires-auth" };
  const { error } = await client.from("task_posts").delete().eq("id", postId);
  if (isMissingTableError(error)) return { skipped: true, reason: "missing-task-posts-table" };
  if (error) throw error;
  return true;
}

async function saveTaskPostCategory(category) {
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser || currentUser.permissionRole !== "admin") return { skipped: true, reason: "requires-admin" };
  const cleanLabel = category?.label?.trim();
  if (!category?.id || !cleanLabel) return false;
  const row = {
    id: category.id,
    label: cleanLabel,
    tone: category.tone || "slate",
    active: category.active !== false,
    updated_by: currentUser.id,
    updated_at: new Date().toISOString()
  };
  const { error } = await client
    .from("task_post_categories")
    .upsert({ ...row, created_by: currentUser.id }, { onConflict: "id" });
  if (isMissingTableError(error)) return { skipped: true, reason: "missing-task-posts-table" };
  if (error) throw error;
  if (category.previousLabel && category.previousLabel !== cleanLabel) {
    const renameResult = await client
      .from("task_posts")
      .update({ scope: cleanLabel, updated_at: new Date().toISOString() })
      .eq("scope", category.previousLabel);
    if (isMissingTableError(renameResult.error)) return { skipped: true, reason: "missing-task-posts-table" };
    if (renameResult.error) throw renameResult.error;
  }
  return true;
}

async function deactivateTaskPostCategory(categoryId) {
  if (!categoryId) return false;
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser || currentUser.permissionRole !== "admin") return { skipped: true, reason: "requires-admin" };
  const { error } = await client
    .from("task_post_categories")
    .update({ active: false, updated_by: currentUser.id, updated_at: new Date().toISOString() })
    .eq("id", categoryId);
  if (isMissingTableError(error)) return { skipped: true, reason: "missing-task-posts-table" };
  if (error) throw error;
  return true;
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
  if (!isUuid(userId)) {
    const client = requireSupabaseClient();
    const currentUser = await readCurrentUser(client);
    if (!currentUser || currentUser.permissionRole !== "admin") return { skipped: true };
    const patch = {
      id: userId,
      name: adminPatch.name?.trim() || userId,
      title: adminPatch.title?.trim() || "팀원",
      profile_emoji: adminPatch.profileEmoji?.trim() || "🌿",
      permission_role: adminPatch.permissionRole || "member",
      is_team_member: typeof adminPatch.isTeamMember === "boolean" ? adminPatch.isTeamMember : true,
      is_active: typeof adminPatch.isActive === "boolean" ? adminPatch.isActive : true,
      expected_email: adminPatch.expectedEmail?.trim() || null,
      auth_user_id: isUuid(adminPatch.authUserId) ? adminPatch.authUserId : null
    };
    const { error } = await client.from("team_roster").upsert(patch, { onConflict: "id" });
    if (error) throw error;
    return true;
  }
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

async function saveTagGroup(group) {
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser || !group?.id || !group?.label?.trim()) return false;
  const { error } = await client
    .from("tag_groups")
    .upsert({
      id: group.id,
      label: group.label.trim(),
      tags: group.tags ?? [],
      tone: group.tone || "custom",
      created_by: currentUser.id,
      updated_at: new Date().toISOString()
    });
  if (error) throw error;
  return true;
}

async function deleteTagGroup(groupId) {
  const client = requireSupabaseClient();
  if (!groupId) return false;
  const { error } = await client.from("tag_groups").delete().eq("id", groupId);
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
  const isNewTask = !isUuid(task.id);
  await ensureRosterPeople(
    client,
    [task.ownerId, task.creatorId, task.assignerId],
    task.peopleDirectory ?? [],
    currentUser
  );
  const row = toTaskRow({ ...task, creatorId: task.creatorId || currentUser.id }, currentUser.id);
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

  const updates = isNewTask
    ? (task.updates ?? []).filter((update) => update.text?.trim())
    : [];
  if (updates.length) {
    const { error } = await client.from("task_updates").insert(
      updates.map((update) => ({
        task_id: taskId,
        author_id: isUuid(update.authorId) ? update.authorId : currentUser.id,
        body: update.text.trim(),
        created_at: update.date ? `${update.date}T00:00:00.000Z` : new Date().toISOString()
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

  const initialHistory = isNewTask
    ? (task.statusHistory ?? []).filter((entry) => entry?.type)
    : [];
  if (initialHistory.length) {
    const { error } = await client.from("task_change_history").insert(
      initialHistory.map((entry) => ({
        task_id: taskId,
        change_type: changeTypeToDb(entry.type),
        from_value: entry.from ?? null,
        to_value: entry.to ?? entry.note ?? "",
        actor_id: isUuid(entry.actorId) ? entry.actorId : currentUser.id,
        note: entry.note ?? null
      }))
    );
    if (error) throw error;
  }

  return { id: taskId };
}

async function importDashboardData(imported, options = {}) {
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser || currentUser.permissionRole !== "admin") {
    return { skipped: true, reason: "requires-admin" };
  }
  const directory = options.directory ?? [];
  const profileOverrides = imported?.profileOverrides ?? {};
  const tasks = Array.isArray(imported?.tasks) ? imported.tasks : [];
  const calendarEvents = Array.isArray(imported?.calendarEvents) ? imported.calendarEvents : [];
  const availableTags = Array.isArray(imported?.availableTags) ? imported.availableTags : [];
  const tagGroups = Array.isArray(imported?.tagGroups) ? imported.tagGroups : [];

  const rosterIds = Array.from(new Set([
    ...tasks.flatMap((task) => [rosterIdFor(task.ownerId), rosterIdFor(task.creatorId), rosterIdFor(task.assignerId)]),
    ...calendarEvents.map((event) => rosterIdFor(event.ownerId)),
    ...Object.keys(profileOverrides).map(rosterIdFor)
  ].filter(Boolean)));
  const knownDirectoryIds = new Set(directory.map((person) => person.id));
  const unknownRosterIds = rosterIds.filter((id) => !knownDirectoryIds.has(id));
  if (unknownRosterIds.length) {
    return { skipped: true, reason: "unknown-roster-ids", unknownRosterIds };
  }
  await ensureRosterPeople(client, rosterIds, directory, currentUser);
  for (const [personId, profile] of Object.entries(profileOverrides)) {
    if (!rosterIdFor(personId)) continue;
    await updateUserAdministration(personId, {
      name: profile.name,
      title: profile.role,
      profileEmoji: profile.emoji,
      permissionRole: profile.permissionRole,
      isTeamMember: profile.isTeamMember,
      isActive: profile.isActive,
      expectedEmail: profile.expectedEmail,
      authUserId: profile.authUserId
    });
  }

  const tagNames = Array.from(new Set([
    ...availableTags,
    ...tasks.flatMap((task) => task.tags ?? [])
  ].map((tag) => tag?.trim()).filter(Boolean)));
  if (tagNames.length) await ensureTags(client, tagNames, currentUser.id);
  for (const group of tagGroups) {
    if (group?.id && group?.label) await saveTagGroup(group);
  }

  const taskIdMap = new Map();
  const taskOrder = [
    ...tasks.filter((task) => !task.recurringTemplateId),
    ...tasks.filter((task) => task.recurringTemplateId)
  ];
  for (const task of taskOrder) {
    const mappedTemplateId = task.recurringTemplateId && taskIdMap.has(task.recurringTemplateId)
      ? taskIdMap.get(task.recurringTemplateId)
      : task.recurringTemplateId;
    const result = await saveTask({
      ...task,
      recurringTemplateId: mappedTemplateId,
      peopleDirectory: directory
    });
    if (result?.id) taskIdMap.set(task.id, result.id);
  }

  for (const event of calendarEvents) {
    await addCalendarEvent({ ...event, peopleDirectory: directory });
  }

  if (imported?.memoByPage) {
    await writeUserPreferences({
      activePage: options.activePage ?? "team",
      activeView: options.activeView ?? "board",
      category: "전체",
      timelineMode: options.timelineMode ?? "month",
      timelineMonth: options.timelineMonth ?? TODAY.slice(0, 7),
      timelineYear: options.timelineYear ?? TODAY.slice(0, 4),
      selectedTaskId: "",
      memoByPage: imported.memoByPage
    });
  }

  return {
    taskCount: tasks.length,
    calendarEventCount: calendarEvents.length,
    tagCount: tagNames.length,
    tagGroupCount: tagGroups.length,
    rosterCount: rosterIds.length
  };
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

async function updateTaskUpdate(updateId, text) {
  if (!isUuid(updateId)) return { skipped: true };
  const cleanText = text.trim();
  if (!cleanText) return false;
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { error } = await client
    .from("task_updates")
    .update({ body: cleanText })
    .eq("id", updateId);
  if (error) throw error;
  return true;
}

async function deleteTaskUpdate(updateId) {
  if (!isUuid(updateId)) return { skipped: true };
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { error } = await client.from("task_updates").delete().eq("id", updateId);
  if (error) throw error;
  return true;
}

async function updateTaskHistory(historyId, note) {
  if (!isUuid(historyId)) return { skipped: true };
  const cleanNote = note.trim();
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { error } = await client
    .from("task_change_history")
    .update({ note: cleanNote || null })
    .eq("id", historyId);
  if (error) throw error;
  return true;
}

async function deleteTaskHistory(historyId) {
  if (!isUuid(historyId)) return { skipped: true };
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const { error } = await client.from("task_change_history").delete().eq("id", historyId);
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

async function deleteFutureRecurringInstances(templateId, fromDate = TODAY) {
  if (!isUuid(templateId)) return { skipped: true };
  const client = requireSupabaseClient();
  const { error } = await client
    .from("tasks")
    .delete()
    .eq("recurring_template_id", templateId)
    .gt("start_date", fromDate);
  if (error) throw error;
  return true;
}

async function addCalendarEvent(event) {
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true };
  const scope = event.scope === "personal" ? "personal" : "team";
  await ensureRosterPeople(client, [event.ownerId], event.peopleDirectory ?? [], currentUser);
  const ownerAuthUserId = authUserIdFor(event.ownerId, event.peopleDirectory ?? []);
  const ownerId = isUuid(event.ownerId) ? event.ownerId : scope === "personal" ? ownerAuthUserId ?? currentUser.id : null;
  const row = {
    title: event.title.trim(),
    event_date: event.startDate || event.date || TODAY,
    start_date: event.startDate || event.date || TODAY,
    end_date: event.endDate || event.startDate || event.date || TODAY,
    scope,
    owner_id: ownerId,
    owner_roster_id: rosterIdFor(event.ownerId),
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
  await ensureRosterPeople(client, [event.ownerId], event.peopleDirectory ?? [], currentUser);
  const ownerAuthUserId = authUserIdFor(event.ownerId, event.peopleDirectory ?? []);
  const ownerId = isUuid(event.ownerId) ? event.ownerId : scope === "personal" ? ownerAuthUserId ?? currentUser.id : null;
  const { error } = await client
    .from("calendar_events")
    .update({
      title: event.title.trim(),
      event_date: event.startDate || event.date || TODAY,
      start_date: event.startDate || event.date || TODAY,
      end_date: event.endDate || event.startDate || event.date || TODAY,
      scope,
      owner_id: ownerId,
      owner_roster_id: rosterIdFor(event.ownerId),
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

function isMissingTableError(error) {
  return error?.code === "42P01";
}

function isMissingCanvasNodeDataError(error) {
  return error?.code === "PGRST204" && String(error?.message ?? "").includes("'data'");
}

function fromCanvasRows(tabs = [], nodes = [], links = []) {
  const nodesByTab = {};
  const linksByTab = {};
  tabs.forEach((tab) => {
    nodesByTab[tab.id] = [];
    linksByTab[tab.id] = [];
  });
  nodes.forEach((node) => {
    if (!nodesByTab[node.tab_id]) nodesByTab[node.tab_id] = [];
    nodesByTab[node.tab_id].push({
      id: node.id,
      title: node.title,
      body: node.body ?? "",
      template: node.template ?? "memo",
      parentId: node.parent_id ?? "",
      todoItems: Array.isArray(node.data?.todoItems) ? node.data.todoItems : [],
      x: node.x ?? 0,
      y: node.y ?? 0
    });
  });
  links.forEach((link) => {
    if (!linksByTab[link.tab_id]) linksByTab[link.tab_id] = [];
    linksByTab[link.tab_id].push({
      id: link.id,
      sourceId: link.source_id,
      targetId: link.target_id
    });
  });
  return normalizeCanvasState({
    activeTabId: tabs[0]?.id,
    tabs: tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      title: tab.title,
      description: tab.description ?? ""
    })),
    nodesByTab,
    linksByTab
  });
}

async function readSharedCanvasState() {
  if (!supabaseConfig.isConfigured) return null;
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true, reason: "requires-auth" };
  const [tabsResult, nodesResult, linksResult] = await Promise.all([
    client.from("canvas_tabs").select("*").order("sort_order", { ascending: true }),
    client.from("canvas_nodes").select("*").order("sort_order", { ascending: true }),
    client.from("canvas_links").select("*").order("created_at", { ascending: true })
  ]);
  const missingTable = [tabsResult, nodesResult, linksResult].find((result) => isMissingTableError(result.error));
  if (missingTable) return { skipped: true, reason: "missing-canvas-tables" };
  [tabsResult, nodesResult, linksResult].forEach((result) => {
    if (result.error) throw result.error;
  });
  if (!tabsResult.data?.length) return null;
  return fromCanvasRows(tabsResult.data, nodesResult.data ?? [], linksResult.data ?? []);
}

async function saveSharedCanvasState(state) {
  if (!supabaseConfig.isConfigured) return { skipped: true, reason: "not-configured" };
  const client = requireSupabaseClient();
  const currentUser = await readCurrentUser(client);
  if (!currentUser) return { skipped: true, reason: "requires-auth" };
  const normalized = normalizeCanvasState(state);
  const now = new Date().toISOString();
  const tabRows = normalized.tabs.map((tab, index) => ({
    id: tab.id,
    label: tab.label,
    title: tab.title,
    description: tab.description,
    sort_order: index,
    created_by: currentUser.id,
    updated_by: currentUser.id,
    updated_at: now
  }));
  const nodeRows = normalized.tabs.flatMap((tab) =>
    (normalized.nodesByTab[tab.id] ?? []).map((node, index) => ({
      tab_id: tab.id,
      id: node.id,
      title: node.title,
      body: node.body ?? "",
      template: node.template || "memo",
      parent_id: node.parentId || null,
      data: {
        todoItems: Array.isArray(node.todoItems) ? node.todoItems : []
      },
      x: node.x,
      y: node.y,
      sort_order: index,
      created_by: currentUser.id,
      updated_by: currentUser.id,
      updated_at: now
    }))
  );
  const linkRows = normalized.tabs.flatMap((tab) =>
    (normalized.linksByTab[tab.id] ?? []).map((link) => ({
      tab_id: tab.id,
      id: link.id,
      source_id: link.sourceId,
      target_id: link.targetId,
      created_by: currentUser.id,
      updated_by: currentUser.id,
      updated_at: now
    }))
  );

  const tabUpsert = await client.from("canvas_tabs").upsert(tabRows, { onConflict: "id" });
  if (isMissingTableError(tabUpsert.error)) return { skipped: true, reason: "missing-canvas-tables" };
  if (tabUpsert.error) throw tabUpsert.error;
  if (nodeRows.length) {
    const { error } = await client.from("canvas_nodes").upsert(nodeRows, { onConflict: "tab_id,id" });
    if (isMissingCanvasNodeDataError(error)) {
      const fallbackRows = nodeRows.map(({ data, ...row }) => row);
      const fallback = await client.from("canvas_nodes").upsert(fallbackRows, { onConflict: "tab_id,id" });
      if (fallback.error) throw fallback.error;
    } else if (error) {
      throw error;
    }
  }
  if (linkRows.length) {
    const { error } = await client.from("canvas_links").upsert(linkRows, { onConflict: "tab_id,id" });
    if (error) throw error;
  }

  await cleanupCanvasRows(client, normalized, "canvas_links", "linksByTab");
  await cleanupCanvasRows(client, normalized, "canvas_nodes", "nodesByTab");
  const existingTabs = await client.from("canvas_tabs").select("id");
  if (existingTabs.error) throw existingTabs.error;
  const nextTabIds = new Set(normalized.tabs.map((tab) => tab.id));
  const staleTabIds = (existingTabs.data ?? []).map((tab) => tab.id).filter((id) => !nextTabIds.has(id));
  if (staleTabIds.length) {
    const { error } = await client.from("canvas_tabs").delete().in("id", staleTabIds);
    if (error) throw error;
  }
  return true;
}

async function cleanupCanvasRows(client, state, table, key) {
  for (const tab of state.tabs) {
    const existing = await client.from(table).select("id").eq("tab_id", tab.id);
    if (existing.error) throw existing.error;
    const nextIds = new Set((state[key][tab.id] ?? []).map((item) => item.id));
    const staleIds = (existing.data ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));
    if (staleIds.length) {
      const { error } = await client.from(table).delete().eq("tab_id", tab.id).in("id", staleIds);
      if (error) throw error;
    }
  }
}

function seedUserMap() {
  return new Map(people.map((person) => [person.id, person.id]));
}

function seedSnapshot() {
  return createDashboardSnapshot({
    tasks: initialTasks,
    availableTags: [],
    calendarEvents: initialCalendarEvents,
    selectedPersonId: "kmryu",
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
    delete: deleteTag,
    saveGroup: saveTagGroup,
    deleteGroup: deleteTagGroup
  },
  tasks: {
    save: saveTask,
    updateStatus: updateTaskStatus,
    addUpdate: addTaskUpdate,
    updateLog: updateTaskUpdate,
    deleteLog: deleteTaskUpdate,
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
    read: readSharedCanvasState,
    save: saveSharedCanvasState
  },
  importData: importDashboardData,
  mappers: {
    fromTaskRow,
    toTaskRow,
    seedSnapshot,
    seedUserMap
  }
};
