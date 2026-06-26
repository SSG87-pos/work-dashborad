import assert from "node:assert/strict";

globalThis.__WORK_DASHBOARD_API_ENV__ = {
  VITE_API_BASE_URL: "http://127.0.0.1:18080/api/v1"
};

const calls = [];
const taskId = "33333333-3333-4333-8333-333333333333";
const subtaskId = "44444444-4444-4444-8444-444444444444";
const updateId = "55555555-5555-4555-8555-555555555555";
const historyId = "66666666-6666-4666-8666-666666666666";
const postId = "77777777-7777-4777-8777-777777777777";
const categoryId = "88888888-8888-4888-8888-888888888888";
const eventId = "99999999-9999-4999-8999-999999999999";
const tagId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const wikiPageId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const wikiDraftId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const responses = new Map([
  ["POST /auth/login", { access_token: "token-123", token_type: "bearer" }],
  ["GET /me", {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.com",
    name: "관리자",
    title: "그룹장",
    team: "연구기획그룹-전략",
    profile_emoji: "🌿",
    permission_role: "admin",
    is_team_member: true,
    is_active: true
  }],
  ["GET /admin/roster", [{
    id: "22222222-2222-4222-8222-222222222222",
    expected_email: "member@example.com",
    auth_user_id: null,
    name: "팀원",
    title: "연구원",
    profile_emoji: "👤",
    permission_role: "member",
    is_team_member: true,
    is_active: true
  }]],
  ["GET /tags", [{ id: tagId, name: "백엔드", tone: "blue" }]],
  ["GET /tag-groups", [{ id: "preset:operations", label: "운영/KPI", tags: ["백엔드"], tone: "operations" }]],
  ["GET /tasks", [{
    id: "33333333-3333-4333-8333-333333333333",
    title: "회사 백엔드 검증",
    description: "",
    workstream: "회사 운영",
    owner_id: null,
    owner_roster_id: "22222222-2222-4222-8222-222222222222",
    creator_id: "11111111-1111-4111-8111-111111111111",
    creator_email: "admin@example.com",
    assigner_type: "개인",
    status: "계획",
    priority: "보통",
    work_kind: "standard",
    start_date: "2026-06-25",
    due_date: "2026-06-30",
    progress: 0,
    archived_at: null,
    tags: ["백엔드"],
    recurring: "매월",
    recurring_detail: "매월 첫째 주",
    recurring_interval: 1,
    recurring_weekdays: [1],
    recurring_start_date: "2026-06-01",
    recurring_end_date: null,
    recurring_no_end: true,
    recurring_duration_days: 4,
    recurring_template_id: null
  }]],
  [`GET /tasks/${taskId}/subtasks`, [{ id: subtaskId, title: "마이그레이션 적용", done: false }]],
  [`GET /tasks/${taskId}/updates`, [{ id: updateId, author_id: "11111111-1111-4111-8111-111111111111", body: "초기 로그" }]],
  [`GET /tasks/${taskId}/links`, []],
  [`GET /tasks/${taskId}/history`, [{ id: historyId, change_type: "status", to_value: "진행", note: "초기 이력", actor_id: "11111111-1111-4111-8111-111111111111", created_at: "2026-06-25T00:00:00Z" }]],
  [`GET /tasks/${taskId}/posts`, [{ id: postId, category_id: categoryId, category_label: "결정사항", scope: "team", title: "초기 게시글", body: "본문", author_id: "11111111-1111-4111-8111-111111111111", posted_at: "2026-06-25", created_at: "2026-06-25T00:00:00Z" }]],
  ["GET /calendar/events", [{ id: eventId, title: "운영 점검", event_date: "2026-06-26", start_date: "2026-06-26", end_date: "2026-06-26", scope: "team", note: "" }]],
  ["GET /briefing-items", []],
  ["GET /post-categories", [{ id: categoryId, key: "decision", label: "결정사항", tone: "blue", active: true }]],
  ["GET /workstreams/suggestions", [{
    primary_label: "AI 연구기획 활용사례",
    candidate_label: "AI 보고 대응",
    score: 0.42,
    shared_terms: ["ai활용", "임원보고"],
    task_count: 2,
    reason: "공통 근거",
    tasks: []
  }]],
  ["GET /dashboard/insights", {
    scope: "team",
    today: "2026-06-26",
    generated_at: "2026-06-26T00:00:00Z",
    items: [
      { key: "stale", label: "업데이트 정체", count: 1, severity: "warning", caption: "7일 이상 새 로그 없음", tasks: [] },
      { key: "unclassified", label: "흐름 미지정", count: 1, severity: "warning", caption: "업무흐름 정리 필요", tasks: [] }
    ]
  }],
  ["GET /preferences/me", {
    user_id: "11111111-1111-4111-8111-111111111111",
    active_page: "team",
    active_view: "board",
    selected_tag: "전체",
    timeline_mode: "month",
    timeline_month: "2026-06",
    timeline_year: "2026",
    selected_task_id: null
  }],
  ["GET /dashboard-memos", { my: "", team: "공유 메모" }]
]);

responses.set(`POST /tasks/${taskId}/posts`, { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
responses.set(`DELETE /tasks/${taskId}/posts/${postId}`, true);
responses.set(`PATCH /tasks/${taskId}/history/${historyId}`, { id: historyId, note: "확정 이력" });
responses.set(`DELETE /tasks/${taskId}/history/${historyId}`, true);
responses.set(`PATCH /tasks/${taskId}/subtasks/${subtaskId}`, { id: subtaskId, done: true });
responses.set(`PATCH /tasks/${taskId}/updates/${updateId}`, { id: updateId, body: "수정 로그" });
responses.set(`DELETE /tasks/${taskId}/updates/${updateId}`, true);
responses.set(`DELETE /calendar/events/${eventId}`, true);
responses.set(`PATCH /tasks/${taskId}`, { id: taskId });
responses.set(`PUT /tasks/${taskId}/tags`, { id: taskId });
responses.set(`DELETE /tasks/${taskId}/recurring/future`, true);
responses.set(`PATCH /tags/${tagId}`, { id: tagId, name: "서버", tone: "blue" });
responses.set(`DELETE /tags/${tagId}`, true);
responses.set("PUT /tag-groups/preset%3Aoperations", { id: "preset:operations", label: "운영/KPI", tags: ["서버"], tone: "operations" });
responses.set("DELETE /tag-groups/preset%3Aoperations", true);
responses.set(`PATCH /post-categories/${categoryId}`, { id: categoryId, key: "decision", label: "논의사항", tone: "green", active: true });
responses.set(`PATCH /post-categories/${categoryId}`, { id: categoryId, key: "decision", label: "논의사항", tone: "green", active: true });
responses.set("GET /ai/wiki/search", { generated_at: "2026-06-26T00:00:00Z", query: "AI", items: [{ id: wikiPageId, title: "AI 업무 에이전트" }] });
responses.set(`GET /ai/wiki/pages/${wikiPageId}`, { id: wikiPageId, title: "AI 업무 에이전트", body_markdown: "# AI" });
responses.set(`GET /ai/wiki/pages/${wikiPageId}/sources`, [{ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", source_type: "task", source_id: taskId }]);
responses.set("GET /ai/wiki/drafts", [{ id: wikiDraftId, status: "pending", proposed_title: "AI 업무 에이전트" }]);
responses.set("POST /ai/wiki/drafts", { id: wikiDraftId, status: "pending" });
responses.set("POST /ai/wiki/drafts/from-dashboard", { id: wikiDraftId, status: "pending", proposed_title: "AI 업무 에이전트" });
responses.set(`PATCH /ai/wiki/drafts/${wikiDraftId}`, { id: wikiDraftId, status: "pending", proposed_title: "AI 업무 에이전트 운영 지식" });
responses.set(`POST /ai/wiki/drafts/${wikiDraftId}/approve`, { id: wikiPageId, status: "published" });
responses.set(`POST /ai/wiki/drafts/${wikiDraftId}/reject`, { id: wikiDraftId, status: "rejected" });
responses.set("POST /ai/wiki/error-book", { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", resolution_status: "open" });
responses.set("PATCH /admin/roster/22222222-2222-4222-8222-222222222222", {
  id: "22222222-2222-4222-8222-222222222222",
  expected_email: "member@example.com",
  name: "팀원2",
  title: "책임연구원",
  profile_emoji: "🙂",
  permission_role: "lead",
  is_team_member: true,
  is_active: true
});

globalThis.localStorage = {
  data: new Map(),
  getItem(key) {
    return this.data.get(key) ?? null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  },
  removeItem(key) {
    this.data.delete(key);
  }
};

globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(url);
  const method = options.method ?? "GET";
  const key = `${method} ${parsed.pathname.replace("/api/v1", "")}`;
  calls.push({ key, options });
  if (!responses.has(key)) {
    return { ok: false, status: 404, text: async () => `missing ${key}` };
  }
  return {
    ok: true,
    status: method === "POST" ? 201 : 200,
    json: async () => responses.get(key),
    text: async () => JSON.stringify(responses.get(key))
  };
};

const { apiConfig, apiDashboardStore } = await import("../src/apiStore.js");

assert.equal(apiConfig.isConfigured, true);
await apiDashboardStore.auth.signInWithPassword("admin@example.com", "pw");
const snapshot = await apiDashboardStore.read();

assert.equal(snapshot.isAuthenticated, true);
assert.equal(snapshot.selectedPersonId, "11111111-1111-4111-8111-111111111111");
assert.equal(snapshot.tasks[0].title, "회사 백엔드 검증");
assert.deepEqual(snapshot.tasks[0].tags, ["백엔드"]);
assert.equal(snapshot.tasks[0].recurring, "매월");
assert.deepEqual(snapshot.tasks[0].recurringWeekdays, [1]);
assert.equal(snapshot.tagGroups[0].label, "운영/KPI");
assert.equal(snapshot.profileOverrides["22222222-2222-4222-8222-222222222222"].name, "팀원");
assert.equal(snapshot.memoByPage.team, "공유 메모");

await apiDashboardStore.tasks.save({
  ...snapshot.tasks[0],
  recurring: "매주",
  recurringDetail: "격주 월요일",
  recurringInterval: 2,
  recurringWeekdays: [1],
  recurringStartDate: "2026-06-01",
  recurringEndDate: "2026-09-01",
  recurringNoEnd: false,
  recurringDurationDays: 1
});
await apiDashboardStore.tasks.savePost(taskId, {
  scope: "결정사항",
  title: "운영 결정",
  body: "회사 연결 전 확인",
  date: "2026-06-26"
});
await apiDashboardStore.tasks.deletePost(postId);
await apiDashboardStore.tasks.updateHistory(historyId, "확정 이력");
await apiDashboardStore.tasks.deleteHistory(historyId);
await apiDashboardStore.tasks.setSubtaskDone(subtaskId, true, 100);
await apiDashboardStore.tasks.updateLog(updateId, "수정 로그");
await apiDashboardStore.tasks.deleteLog(updateId);
await apiDashboardStore.tasks.deleteFutureInstances(taskId, "2026-06-26");
await apiDashboardStore.events.delete(eventId);
await apiDashboardStore.tags.rename("백엔드", "서버");
await apiDashboardStore.tags.delete("서버");
await apiDashboardStore.tags.saveGroup({ id: "preset:operations", label: "운영/KPI", tags: ["서버"], tone: "operations" });
await apiDashboardStore.tags.deleteGroup("preset:operations");
await apiDashboardStore.tasks.savePostCategory({ id: categoryId, key: "decision", label: "논의사항", tone: "green", active: true });
await apiDashboardStore.tasks.deactivatePostCategory(categoryId);
await apiDashboardStore.dashboard.insights({ scope: "team", today: "2026-06-26" });
await apiDashboardStore.workstreams.suggestions();
await apiDashboardStore.ai.wiki.search({ query: "AI" });
await apiDashboardStore.ai.wiki.readPage(wikiPageId);
await apiDashboardStore.ai.wiki.readSources(wikiPageId);
await apiDashboardStore.ai.wiki.listDrafts({ status: "pending" });
await apiDashboardStore.ai.wiki.createDraft({ proposed_title: "AI 업무 에이전트", proposed_body_markdown: "# AI" });
await apiDashboardStore.ai.wiki.createDraftFromDashboard({ source_type: "task", source_id: taskId });
await apiDashboardStore.ai.wiki.updateDraft(wikiDraftId, { proposed_title: "AI 업무 에이전트 운영 지식" });
await apiDashboardStore.ai.wiki.approveDraft(wikiDraftId, { change_reason: "검토 완료" });
await apiDashboardStore.ai.wiki.rejectDraft(wikiDraftId, { reason: "중복 초안" });
await apiDashboardStore.ai.wiki.recordError({ question: "원천?", correction: "PostgreSQL" });
await apiDashboardStore.profiles.updateAdministration("22222222-2222-4222-8222-222222222222", {
  name: "팀원2",
  title: "책임연구원",
  profileEmoji: "🙂",
  permissionRole: "lead",
  isTeamMember: true,
  isActive: true,
  expectedEmail: "member@example.com"
});

assert.ok(calls.some((call) => call.key === "GET /tasks"));
const postCall = calls.find((call) => call.key === `POST /tasks/${taskId}/posts`);
const taskPatchCall = calls.find((call) => call.key === `PATCH /tasks/${taskId}`);
assert.equal(JSON.parse(taskPatchCall.options.body).recurring, "매주");
assert.deepEqual(JSON.parse(taskPatchCall.options.body).recurring_weekdays, [1]);
assert.deepEqual(JSON.parse(postCall.options.body), {
  category_id: categoryId,
  scope: "team",
  title: "운영 결정",
  body: "회사 연결 전 확인",
  url: null,
  attachment: null,
  posted_at: "2026-06-26"
});
assert.ok(calls.some((call) => call.key === `DELETE /tasks/${taskId}/posts/${postId}`));
assert.ok(calls.some((call) => call.key === `PATCH /tasks/${taskId}/history/${historyId}`));
assert.ok(calls.some((call) => call.key === `DELETE /tasks/${taskId}/history/${historyId}`));
assert.ok(calls.some((call) => call.key === `PATCH /tasks/${taskId}/subtasks/${subtaskId}`));
assert.ok(calls.some((call) => call.key === `PATCH /tasks/${taskId}/updates/${updateId}`));
assert.ok(calls.some((call) => call.key === `DELETE /tasks/${taskId}/updates/${updateId}`));
assert.ok(calls.some((call) => call.key === `DELETE /tasks/${taskId}/recurring/future`));
assert.ok(calls.some((call) => call.key === `DELETE /calendar/events/${eventId}`));
assert.ok(calls.some((call) => call.key === `PATCH /tags/${tagId}`));
assert.ok(calls.some((call) => call.key === `DELETE /tags/${tagId}`));
assert.ok(calls.some((call) => call.key === "PUT /tag-groups/preset%3Aoperations"));
assert.ok(calls.some((call) => call.key === "DELETE /tag-groups/preset%3Aoperations"));
assert.ok(calls.some((call) => call.key === `PATCH /post-categories/${categoryId}`));
assert.ok(calls.some((call) => call.key === "GET /dashboard/insights"));
assert.ok(calls.some((call) => call.key === "GET /workstreams/suggestions"));
assert.ok(calls.some((call) => call.key === "GET /ai/wiki/search"));
assert.ok(calls.some((call) => call.key === `GET /ai/wiki/pages/${wikiPageId}`));
assert.ok(calls.some((call) => call.key === `GET /ai/wiki/pages/${wikiPageId}/sources`));
assert.ok(calls.some((call) => call.key === "GET /ai/wiki/drafts"));
assert.ok(calls.some((call) => call.key === "POST /ai/wiki/drafts"));
assert.ok(calls.some((call) => call.key === "POST /ai/wiki/drafts/from-dashboard"));
assert.ok(calls.some((call) => call.key === `PATCH /ai/wiki/drafts/${wikiDraftId}`));
assert.ok(calls.some((call) => call.key === `POST /ai/wiki/drafts/${wikiDraftId}/approve`));
assert.ok(calls.some((call) => call.key === `POST /ai/wiki/drafts/${wikiDraftId}/reject`));
assert.ok(calls.some((call) => call.key === "POST /ai/wiki/error-book"));
assert.ok(calls.some((call) => call.key === "PATCH /admin/roster/22222222-2222-4222-8222-222222222222"));
assert.ok(calls.every((call) => call.options.headers?.Authorization || call.key === "POST /auth/login"));

console.log("api store checks passed");
