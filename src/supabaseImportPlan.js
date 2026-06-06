const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && uuidPattern.test(value);
}

function compactUnique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko"));
}

function localPersonId(value) {
  if (typeof value !== "string" || !value.trim() || isUuid(value)) return "";
  return value.trim();
}

function addRosterReference(references, value, label) {
  const id = localPersonId(value);
  if (!id) return;
  const sourceCounts = references.get(id) ?? new Map();
  sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
  references.set(id, sourceCounts);
}

function formatRosterReferenceSummary(references, rosterIds) {
  return rosterIds.map((id) => ({
    id,
    sources: Array.from(references.get(id)?.entries() ?? [])
      .map(([label, count]) => `${label} ${count}건`)
  }));
}

export function buildSupabaseImportPlan({ imported, directory = [], selectedPerson = null }) {
  const tasks = Array.isArray(imported?.tasks) ? imported.tasks : [];
  const calendarEvents = Array.isArray(imported?.calendarEvents) ? imported.calendarEvents : [];
  const availableTags = Array.isArray(imported?.availableTags) ? imported.availableTags : [];
  const tagGroups = Array.isArray(imported?.tagGroups) ? imported.tagGroups : [];
  const profileOverrides = imported?.profileOverrides && typeof imported.profileOverrides === "object"
    ? imported.profileOverrides
    : {};
  const memoByPage = imported?.memoByPage && typeof imported.memoByPage === "object" ? imported.memoByPage : {};

  const rosterIds = compactUnique([
    ...tasks.flatMap((task) => [
      localPersonId(task.ownerId),
      localPersonId(task.creatorId),
      localPersonId(task.assignerId)
    ]),
    ...calendarEvents.map((event) => localPersonId(event.ownerId)),
    ...Object.keys(profileOverrides).map(localPersonId)
  ]);
  const rosterReferences = new Map();
  tasks.forEach((task) => {
    addRosterReference(rosterReferences, task.ownerId, "업무 담당자");
    addRosterReference(rosterReferences, task.creatorId, "업무 작성자");
    addRosterReference(rosterReferences, task.assignerId, "업무 배정자");
  });
  calendarEvents.forEach((event) => addRosterReference(rosterReferences, event.ownerId, "일정 담당자"));
  Object.keys(profileOverrides).forEach((personId) => addRosterReference(rosterReferences, personId, "프로필 보정"));
  const rosterReferenceSummary = formatRosterReferenceSummary(rosterReferences, rosterIds);
  const directoryIds = new Set(directory.map((person) => person.id));
  const unknownRosterIds = rosterIds.filter((id) => !directoryIds.has(id));
  const unknownRosterReferences = rosterReferenceSummary.filter((entry) => unknownRosterIds.includes(entry.id));
  const taskTagNames = tasks.flatMap((task) => (Array.isArray(task.tags) ? task.tags : []));
  const tagCount = compactUnique([...availableTags, ...taskTagNames]).length;
  const subtaskCount = tasks.reduce((sum, task) => sum + (Array.isArray(task.subtasks) ? task.subtasks.length : 0), 0);
  const linkCount = tasks.reduce((sum, task) => sum + (Array.isArray(task.links) ? task.links.length : 0), 0);
  const updateCount = tasks.reduce((sum, task) => sum + (Array.isArray(task.updates) ? task.updates.length : 0), 0);
  const personalEventCount = calendarEvents.filter((event) => event.scope === "personal").length;
  const memoPageCount = Object.values(memoByPage).filter((body) => typeof body === "string" && body.trim()).length;
  const profileOverrideCount = Object.keys(profileOverrides).length;
  const requiresAdmin = rosterIds.length > 0 || tagGroups.length > 0 || profileOverrideCount > 0;
  const currentUserRole = selectedPerson?.permissionRole ?? "member";
  const blockingIssues = [
    ...unknownRosterIds.map((id) => `현재 인원 목록에 없는 담당자 ID: ${id}`)
  ];
  const canRunFromCurrentUser = blockingIssues.length === 0 && (!requiresAdmin || currentUserRole === "admin");

  return {
    taskCount: tasks.length,
    calendarEventCount: calendarEvents.length,
    personalEventCount,
    tagCount,
    tagGroupCount: tagGroups.length,
    subtaskCount,
    linkCount,
    updateCount,
    memoPageCount,
    profileOverrideCount,
    rosterIds,
    rosterReferenceSummary,
    unknownRosterIds,
    unknownRosterReferences,
    requiresAdmin,
    blockingIssues,
    canRunFromCurrentUser
  };
}

export function formatSupabaseImportPlanMessage(plan) {
  const lines = [
    "Supabase 가져오기 준비 요약",
    "",
    `- 업무 ${plan.taskCount}건, 상세 항목 ${plan.subtaskCount}건`,
    `- 관련 링크 ${plan.linkCount}건, 업데이트 로그 ${plan.updateCount}건`,
    `- 일정 ${plan.calendarEventCount}건${plan.personalEventCount ? ` (개인 일정 ${plan.personalEventCount}건 포함)` : ""}`,
    `- 태그 ${plan.tagCount}개, Category ${plan.tagGroupCount}개`,
    `- 메모 페이지 ${plan.memoPageCount}개, 프로필/로스터 보정 ${plan.profileOverrideCount}건`
  ];

  if (plan.rosterIds.length) {
    lines.push(`- 로컬 담당자 ID ${plan.rosterIds.length}개를 team_roster와 연결해야 합니다: ${plan.rosterIds.join(", ")}`);
  }
  if (plan.unknownRosterIds.length) {
    lines.push("- 현재 화면의 인원 목록에 없는 ID가 있습니다:");
    plan.unknownRosterReferences.forEach((entry) => {
      const sourceText = entry.sources.length ? ` (${entry.sources.join(", ")})` : "";
      lines.push(`  · ${entry.id}${sourceText}`);
    });
    lines.push("- 위 ID는 team_roster에 실제 이름/직책/예상 이메일로 먼저 매핑해야 하므로 Supabase 가져오기를 실행하지 않습니다.");
  }
  if (!plan.canRunFromCurrentUser) {
    if (plan.blockingIssues.length) {
      lines.push("- 실행 차단 항목을 정리한 뒤 다시 가져오기를 시도해 주세요.");
    } else {
      lines.push("- 이 가져오기는 로스터/Category/프로필 보정이 포함되어 관리자 계정에서만 실행해야 합니다.");
    }
  }

  lines.push("", "라이브 Supabase DB 쓰기는 관리자 확인 후 병합/upsert 방식으로 실행됩니다.");
  return lines.join("\n");
}
