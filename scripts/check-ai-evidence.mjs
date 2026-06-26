import assert from "node:assert/strict";
import {
  buildPersonWorkStatusEvidence,
  buildRecentUpdatesEvidence,
  buildReportEvidence,
  buildTopicSearchEvidence,
  buildWorkstreamIssuesEvidence
} from "../src/aiEvidence.js";

const people = [
  { id: "admin", name: "소슬기", role: "수석", permissionRole: "admin" },
  { id: "lead", name: "박경수", role: "팀장", permissionRole: "lead" },
  { id: "member-1", name: "류강묵", role: "수석", permissionRole: "member" }
];

const tasks = [
  {
    id: "task-ai-idea",
    title: "AI 기반 혁신 아이디어 정리",
    description: "AI 활용 가능성과 아이디어 후보를 정리합니다.",
    ownerId: "member-1",
    creatorId: "lead",
    status: "진행중",
    priority: "높음",
    workstream: "혁신아이디어",
    tags: ["AI활용", "전략과제"],
    dueDate: "2026-06-07",
    progress: 50,
    personalNotes: "개인 메모 비밀 내용",
    subtasks: [
      { id: "sub-ai-1", title: "후보 목록 정리", done: true },
      { id: "sub-ai-2", title: "우선순위 확정", done: false }
    ],
    updates: [
      {
        id: "update-ai-1",
        authorId: "member-1",
        date: "2026-06-03",
        type: "note",
        text: "아이디어 후보 1차 분류 완료"
      },
      {
        id: "update-ai-2",
        authorId: "lead",
        date: "2026-06-05",
        updateType: "issue",
        body: "자료 수급 지연으로 확인 필요"
      }
    ],
    postItems: [
      {
        id: "post-ai-1",
        scope: "리스크",
        title: "외부 자료 미확보",
        body: "외부 자료 미확보로 일정 조정 필요",
        date: "2026-06-05"
      }
    ]
  },
  {
    id: "task-kpi",
    title: "월간 KPI 관리",
    description: "월간보고용 KPI 자료를 취합합니다.",
    ownerId: "lead",
    status: "검토/대기",
    priority: "보통",
    workstream: "월간 KPI 관리",
    tags: ["KPI", "회의체"],
    dueDate: "2026-06-08",
    progress: 30,
    updates: [
      {
        id: "update-kpi-1",
        authorId: "lead",
        date: "2026-05-20",
        text: "이전 월 자료 확인"
      }
    ],
    subtasks: [{ id: "sub-kpi-1", title: "팀별 제출 현황 확인", done: false }]
  }
];

const privateCalendarEvents = [
  {
    id: "personal-event-1",
    scope: "personal",
    ownerId: "member-1",
    title: "비공개 임원 면담",
    note: "개인 일정 비밀 내용"
  }
];

const periodStart = "2026-06-01";
const periodEnd = "2026-06-07";
const generatedAt = "2026-06-07T00:00:00.000Z";

const report = buildReportEvidence({
  tasks,
  people,
  calendarEvents: privateCalendarEvents,
  periodStart,
  periodEnd,
  reportType: "weekly",
  generatedAt
});

assert.equal(report.questionType, "report-evidence");
assert.equal(report.generatedAt, generatedAt);
assert.equal(report.period.start, periodStart);
assert.equal(report.period.end, periodEnd);
assert.equal(report.excluded.personalNotes, true);
assert.equal(report.excluded.privateCalendarDetails, true);
assert.ok(report.items.length >= 2, "report evidence should include visible tasks");

const aiItem = report.items.find((item) => item.taskId === "task-ai-idea");
assert.ok(aiItem, "report evidence should include source task id");
assert.equal(aiItem.taskTitle, "AI 기반 혁신 아이디어 정리");
assert.equal(aiItem.ownerName, "류강묵");
assert.equal(aiItem.status, "진행중");
assert.equal(aiItem.priority, "높음");
assert.equal(aiItem.workstream, "혁신아이디어");
assert.equal(aiItem.dueDate, "2026-06-07");
assert.equal(aiItem.progress, 50);
assert.deepEqual(aiItem.openSubtasks, ["우선순위 확정"]);
assert.ok(aiItem.recentUpdates.some((update) => update.id === "update-ai-2" && update.type === "issue"));
assert.ok(aiItem.signals.some((signal) => signal.type === "explicit" && signal.label === "이슈"));

const kpiItem = report.items.find((item) => item.taskId === "task-kpi");
assert.ok(kpiItem.signals.some((signal) => signal.type === "inferred" && signal.label === "최근 기록 부족"));

const serializedReport = JSON.stringify(report);
assert.equal(serializedReport.includes("개인 메모 비밀 내용"), false, "personal notes must be excluded");
assert.equal(serializedReport.includes("개인 일정 비밀 내용"), false, "private calendar details must be excluded");

const topic = buildTopicSearchEvidence({ tasks, people, query: "아이디어", periodStart, periodEnd, generatedAt });
assert.equal(topic.questionType, "topic-search");
assert.equal(topic.query, "아이디어");
assert.ok(topic.items.some((item) => item.taskId === "task-ai-idea"), "topic search should find title/tag/update/post matches");

const person = buildPersonWorkStatusEvidence({ tasks, people, personId: "member-1", periodStart, periodEnd, generatedAt });
assert.equal(person.questionType, "person-work-status");
assert.equal(person.person.name, "류강묵");
assert.deepEqual(person.items.map((item) => item.taskId), ["task-ai-idea"]);

const workstream = buildWorkstreamIssuesEvidence({ tasks, people, workstream: "혁신아이디어", periodStart, periodEnd, generatedAt });
assert.equal(workstream.questionType, "workstream-issues");
assert.ok(workstream.items.every((item) => item.workstream === "혁신아이디어"));
assert.ok(workstream.items[0].signals.length > 0, "workstream issues should surface explicit or inferred signals");

const updates = buildRecentUpdatesEvidence({
  tasks,
  people,
  filters: { ownerId: "member-1" },
  periodStart,
  periodEnd,
  generatedAt
});
assert.equal(updates.questionType, "recent-updates");
assert.deepEqual(updates.items.map((item) => item.updateId), ["update-ai-2", "update-ai-1"]);
assert.ok(updates.items.every((item) => item.taskId === "task-ai-idea"));

console.log("AI evidence checks passed");
