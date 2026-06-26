import {
  buildPersonWorkStatusEvidence,
  buildRecentUpdatesEvidence,
  buildReportEvidence,
  buildTopicSearchEvidence,
  buildWorkstreamIssuesEvidence
} from "./aiEvidence.js";

export const defaultAiAssistantPrompts = [
  "이번 주 업무현황 보고서 초안 만들어줘",
  "나의 진행 업무를 알려줘",
  "아이디어 관련 이슈 찾아줘",
  "최근 업데이트된 업무만 정리해줘",
  "회의 후속 업무를 등록해줘"
];

const routeByKind = {
  "report-evidence": "/ai/read/report-evidence",
  "person-work-status": "/ai/read/person-work-status",
  "topic-search": "/ai/read/topic-search",
  "workstream-issues": "/ai/read/workstream-issues",
  "recent-updates": "/ai/read/recent-updates"
};

function dateFromIso(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function weekRange(today) {
  const date = dateFromIso(today);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addDays(date, mondayOffset);
  return {
    start: isoDate(start),
    end: isoDate(addDays(start, 6))
  };
}

function monthRange(today) {
  const date = dateFromIso(today);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: isoDate(start),
    end: isoDate(end)
  };
}

function normalizePrompt(prompt) {
  return String(prompt ?? "").trim();
}

function findMentionedPerson(prompt, people = []) {
  return people.find((person) => {
    if (!person?.name) return false;
    return prompt.includes(person.name) || prompt.includes(`${person.name}님`);
  });
}

function keywordQuery(prompt) {
  const match = prompt.match(/(.+?)\s*(관련|이슈|리스크|진행|찾아|검색|정리)/);
  if (match?.[1]) {
    return match[1].replace(/이번 주|최근|요즘|업무|내용|주요|전체/g, "").trim();
  }
  return prompt.replace(/알려줘|정리해줘|찾아줘|검색해줘|뭐야|무엇/g, "").trim();
}

export function classifyAssistantPrompt(prompt, { people = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const text = normalizePrompt(prompt);
  const week = weekRange(today);
  const month = monthRange(today);
  const lower = text.toLowerCase();
  const mentionedPerson = findMentionedPerson(text, people);

  if (/등록|추가|생성|업무화/.test(text) && /업무|할일|태스크|후속/.test(text)) {
    return {
      kind: "task-draft",
      label: "업무 등록 초안",
      needsHumanApproval: true,
      params: {
        rawText: text,
        periodStart: week.start,
        periodEnd: week.end
      }
    };
  }

  if (/보고서|보고|현황|초안|주간|이번 주|월간/.test(text)) {
    const isMonthly = /월간|이번 달|이번달/.test(text);
    return {
      kind: "report-evidence",
      label: isMonthly ? "월간 업무현황" : "주간 업무현황",
      params: {
        periodStart: isMonthly ? month.start : week.start,
        periodEnd: isMonthly ? month.end : week.end,
        reportType: isMonthly ? "monthly" : "weekly"
      }
    };
  }

  if (mentionedPerson) {
    return {
      kind: "person-work-status",
      label: `${mentionedPerson.name} 업무현황`,
      params: {
        person: mentionedPerson.name,
        personId: mentionedPerson.id,
        periodStart: month.start,
        periodEnd: month.end
      }
    };
  }

  if (/최근|업데이트|로그/.test(text)) {
    return {
      kind: "recent-updates",
      label: "최근 업데이트",
      params: {
        periodStart: week.start,
        periodEnd: week.end
      }
    };
  }

  if (/업무흐름|흐름별|리스크|이슈|지연|의사결정/.test(text)) {
    const query = keywordQuery(text) || "";
    return {
      kind: query ? "topic-search" : "workstream-issues",
      label: query ? `${query} 검색` : "업무흐름 이슈",
      params: {
        query,
        workstream: query,
        periodStart: month.start,
        periodEnd: month.end
      }
    };
  }

  return {
    kind: "topic-search",
    label: "업무 검색",
    params: {
      query: keywordQuery(text) || text,
      periodStart: month.start,
      periodEnd: month.end
    }
  };
}

export function buildAiReadPath(intent) {
  const route = routeByKind[intent?.kind];
  if (!route) return "";
  const params = new URLSearchParams();
  const values = intent.params ?? {};
  if (values.periodStart) params.set("period_start", values.periodStart);
  if (values.periodEnd) params.set("period_end", values.periodEnd);
  if (values.reportType) params.set("report_type", values.reportType);
  if (values.person) params.set("person", values.person);
  if (values.query) params.set("query", values.query);
  if (values.workstream && intent.kind === "workstream-issues") params.set("workstream", values.workstream);
  return `${route}${params.toString() ? `?${params.toString()}` : ""}`;
}

function sourceRefs(items = []) {
  return items.slice(0, 4).map((item) => ({
    taskId: item.taskId,
    taskTitle: item.taskTitle,
    updateIds: (item.recentUpdates ?? []).map((update) => update.id),
    postIds: (item.recentPosts ?? []).map((post) => post.id)
  }));
}

function firstSignalText(item) {
  const signal = item.signals?.[0];
  if (!signal) return "";
  return `${signal.label}: ${signal.reason}`;
}

export function summarizeAssistantEvidence(evidence, intent) {
  const items = evidence?.items ?? [];
  if (!items.length) {
    return "조건에 맞는 기록을 찾지 못했습니다. 기간이나 담당자, 주제어를 바꿔 다시 확인해 주세요.";
  }

  if (intent.kind === "recent-updates") {
    const lines = items.slice(0, 5).map((item) => `- ${item.taskTitle}: ${item.body} (${item.date})`);
    return [`최근 업데이트 ${items.length}건을 찾았습니다.`, ...lines].join("\n");
  }

  const headline = intent.kind === "report-evidence"
    ? `${intent.label} 근거로 ${items.length}개 업무를 찾았습니다.`
    : `${intent.label} 기준으로 ${items.length}개 업무를 찾았습니다.`;
  const lines = items.slice(0, 4).map((item) => {
    const signal = firstSignalText(item);
    const updates = (item.recentUpdates ?? []).slice(0, 2).map((update) => update.body).join(" / ");
    const tail = signal || updates || (item.openSubtasks?.length ? `다음 확인: ${item.openSubtasks.join(", ")}` : "최근 기록 부족");
    return `- ${item.taskTitle}: ${item.status}, ${item.ownerName}, ${tail}`;
  });
  return [headline, ...lines, "근거 업무와 업데이트 ID를 함께 보관했습니다."].join("\n");
}

export function buildTaskDraftReply(intent) {
  return {
    intent,
    answer: [
      "등록 초안으로 처리할 수 있습니다.",
      "다만 AI가 바로 저장하지 않고, 제목/담당자/마감일/상세 체크리스트를 확인 카드로 보여준 뒤 사람이 확인해야 저장하는 흐름이 안전합니다.",
      `요청 원문: ${intent.params.rawText}`
    ].join("\n"),
    sources: [],
    evidence: null
  };
}

function localEvidenceForIntent(intent, { tasks = [], people = [], today }) {
  const base = {
    tasks,
    people,
    periodStart: intent.params.periodStart,
    periodEnd: intent.params.periodEnd,
    generatedAt: `${today}T00:00:00.000Z`
  };
  if (intent.kind === "report-evidence") {
    return buildReportEvidence({ ...base, reportType: intent.params.reportType });
  }
  if (intent.kind === "person-work-status") {
    return buildPersonWorkStatusEvidence({ ...base, personId: intent.params.personId, personName: intent.params.person });
  }
  if (intent.kind === "workstream-issues") {
    return buildWorkstreamIssuesEvidence({ ...base, workstream: intent.params.workstream });
  }
  if (intent.kind === "recent-updates") {
    return buildRecentUpdatesEvidence({ ...base, filters: {} });
  }
  return buildTopicSearchEvidence({ ...base, query: intent.params.query });
}

export function buildLocalAssistantReply({ prompt, tasks = [], people = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const intent = classifyAssistantPrompt(prompt, { people, today });
  if (intent.kind === "task-draft") return buildTaskDraftReply(intent);
  const evidence = localEvidenceForIntent(intent, { tasks, people, today });
  return {
    intent,
    evidence,
    answer: summarizeAssistantEvidence(evidence, intent),
    sources: sourceRefs(evidence.items)
  };
}
