import assert from "node:assert/strict";
import {
  buildAiReadPath,
  buildLocalAssistantReply,
  classifyAssistantPrompt,
  defaultAiAssistantPrompts
} from "../src/aiAssistant.js";

const people = [
  { id: "lead", name: "박경수", role: "팀장" },
  { id: "kmryu", name: "류강묵", role: "수석" }
];

const tasks = [
  {
    id: "task-idea",
    title: "AI 기반 혁신 아이디어 정리",
    description: "AI 활용 가능성과 아이디어 후보를 정리합니다.",
    ownerId: "kmryu",
    status: "진행중",
    priority: "높음",
    workstream: "혁신아이디어",
    tags: ["AI활용", "전략과제"],
    dueDate: "2026-06-07",
    progress: 50,
    subtasks: [
      { id: "sub-1", title: "후보 목록 정리", done: true },
      { id: "sub-2", title: "우선순위 확정", done: false }
    ],
    updates: [
      { id: "update-1", authorId: "kmryu", date: "2026-06-03", type: "note", text: "아이디어 후보 1차 분류 완료" },
      { id: "update-2", authorId: "lead", date: "2026-06-04", updateType: "issue", body: "자료 수급 지연으로 확인 필요" }
    ],
    postItems: [
      { id: "post-1", scope: "리스크", title: "외부 자료 미확보", body: "외부 자료 미확보로 일정 조정 필요", date: "2026-06-04" }
    ]
  },
  {
    id: "task-kpi",
    title: "월간 KPI 관리",
    ownerId: "lead",
    status: "검토/대기",
    priority: "보통",
    workstream: "월간 KPI 관리",
    tags: ["KPI"],
    dueDate: "2026-06-08",
    progress: 20,
    updates: []
  }
];

assert.ok(defaultAiAssistantPrompts.length >= 4, "assistant should expose starter prompts");

const reportIntent = classifyAssistantPrompt("이번 주 업무현황 보고서 초안 만들어줘", { people, today: "2026-06-04" });
assert.equal(reportIntent.kind, "report-evidence");
assert.equal(reportIntent.params.reportType, "weekly");

const personIntent = classifyAssistantPrompt("류강묵님 진행 업무 알려줘", { people, today: "2026-06-04" });
assert.equal(personIntent.kind, "person-work-status");
assert.equal(personIntent.params.person, "류강묵");

const topicIntent = classifyAssistantPrompt("아이디어 관련 이슈 찾아줘", { people, today: "2026-06-04" });
assert.equal(topicIntent.kind, "topic-search");
assert.equal(topicIntent.params.query, "아이디어");

const draftIntent = classifyAssistantPrompt("장형민님에게 다음 주까지 회의자료 정리 업무 등록해줘", { people, today: "2026-06-04" });
assert.equal(draftIntent.kind, "task-draft");
assert.equal(draftIntent.needsHumanApproval, true);

assert.equal(
  buildAiReadPath(reportIntent),
  "/ai/read/report-evidence?period_start=2026-06-01&period_end=2026-06-07&report_type=weekly"
);

const reply = buildLocalAssistantReply({
  prompt: "아이디어 관련 이슈 찾아줘",
  tasks,
  people,
  today: "2026-06-04"
});

assert.equal(reply.intent.kind, "topic-search");
assert.ok(reply.answer.includes("AI 기반 혁신 아이디어 정리"));
assert.ok(reply.answer.includes("자료 수급 지연"));
assert.ok(reply.sources.some((source) => source.taskId === "task-idea" && source.updateIds.includes("update-2")));
assert.equal(JSON.stringify(reply).includes("개인"), false, "reply should not add private data by itself");

const draftReply = buildLocalAssistantReply({
  prompt: "장형민님에게 다음 주까지 회의자료 정리 업무 등록해줘",
  tasks,
  people,
  today: "2026-06-04"
});

assert.equal(draftReply.intent.kind, "task-draft");
assert.ok(draftReply.answer.includes("등록 초안"));
assert.ok(draftReply.answer.includes("확인"));

console.log("AI assistant checks passed");
