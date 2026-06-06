import assert from "node:assert/strict";

import { buildSupabaseImportPlan, formatSupabaseImportPlanMessage } from "../src/supabaseImportPlan.js";

const plan = buildSupabaseImportPlan({
  imported: {
    tasks: [
      {
        id: "local-task-1",
        ownerId: "juno",
        creatorId: "seoyeon",
        assignerId: "lead",
        tags: ["월간보고", "KPI"],
        subtasks: [{ title: "자료 취합", done: false }],
        links: [{ title: "보고서", url: "https://example.com" }],
        updates: [{ text: "초안 작성", authorId: "juno" }]
      }
    ],
    availableTags: ["월간보고", "KPI"],
    tagGroups: [{ id: "ops", label: "운영/KPI 묶음", tags: ["월간보고", "KPI"] }],
    calendarEvents: [{ id: "local-event-1", scope: "personal", ownerId: "juno" }],
    memoByPage: { my: "개인 메모", team: "팀 메모" },
    profileOverrides: {
      juno: { name: "이준호", role: "팀원", expectedEmail: "juno@example.com" }
    }
  },
  directory: [
    { id: "seoyeon", permissionRole: "admin" },
    { id: "juno", expectedEmail: "juno@example.com" },
    { id: "lead" }
  ],
  selectedPerson: { id: "seoyeon", permissionRole: "admin" }
});

assert.equal(plan.taskCount, 1);
assert.equal(plan.calendarEventCount, 1);
assert.equal(plan.tagCount, 2);
assert.deepEqual(plan.rosterIds, ["juno", "lead", "seoyeon"]);
assert.deepEqual(plan.rosterReferenceSummary.find((entry) => entry.id === "juno")?.sources, [
  "업무 담당자 1건",
  "일정 담당자 1건",
  "프로필 보정 1건"
]);
assert.deepEqual(plan.unknownRosterIds, []);
assert.equal(plan.requiresAdmin, true);
assert.equal(plan.canRunFromCurrentUser, true);
assert.match(formatSupabaseImportPlanMessage(plan), /병합\/upsert/);
assert.match(formatSupabaseImportPlanMessage(plan), /업무 1건/);

const memberPlan = buildSupabaseImportPlan({
  imported: {
    tasks: [{ ownerId: "juno", creatorId: "juno", assignerId: "juno", tags: ["운영"] }],
    availableTags: ["운영"],
    tagGroups: [],
    calendarEvents: [],
    memoByPage: {},
    profileOverrides: {}
  },
  directory: [{ id: "juno" }],
  selectedPerson: { id: "juno", permissionRole: "member" }
});

assert.equal(memberPlan.requiresAdmin, true);
assert.equal(memberPlan.canRunFromCurrentUser, false);
assert.match(formatSupabaseImportPlanMessage(memberPlan), /관리자 계정/);

const unknownRosterPlan = buildSupabaseImportPlan({
  imported: {
    tasks: [{ ownerId: "unknown-owner", creatorId: "juno", tags: [] }],
    calendarEvents: [],
    profileOverrides: {}
  },
  directory: [{ id: "juno", permissionRole: "admin" }],
  selectedPerson: { id: "juno", permissionRole: "admin" }
});

assert.deepEqual(unknownRosterPlan.unknownRosterIds, ["unknown-owner"]);
assert.deepEqual(unknownRosterPlan.unknownRosterReferences, [
  { id: "unknown-owner", sources: ["업무 담당자 1건"] }
]);
assert.equal(unknownRosterPlan.blockingIssues.length, 1);
assert.equal(unknownRosterPlan.canRunFromCurrentUser, false);
assert.match(formatSupabaseImportPlanMessage(unknownRosterPlan), /실행 차단/);
assert.match(formatSupabaseImportPlanMessage(unknownRosterPlan), /업무 담당자 1건/);
