import {
  buildPersonWorkStatusEvidence,
  buildRecentUpdatesEvidence,
  buildReportEvidence,
  buildTopicSearchEvidence,
  buildWorkstreamIssuesEvidence
} from "./aiEvidence.js";

export const defaultAiAssistantPrompts = [
  "내 진행 업무와 개인 메모를 정리해줘",
  "이번 주 업무현황을 보고서 형태로 정리해줘",
  "최근 업데이트된 업무만 요약해줘",
  "지연되거나 리스크가 있는 업무를 찾아줘",
  "회의 후속 업무 등록 초안을 만들어줘",
  "오늘 내가 꼭 확인해야 할 업무를 알려줘",
  "이번 주 마감 예정 업무만 모아줘",
  "내가 남긴 로그와 메모를 업무별로 정리해줘",
  "담당자별 진행 상황을 비교해서 보여줘",
  "전략과제 관련 리스크와 다음 액션을 정리해줘"
];

const statusWords = ["검토/대기", "계획", "진행중", "완료", "보류"];

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

function recordQuery(prompt) {
  return prompt
    .replace(/업무|기록|로그|메모|남겨줘|남겨|저장해줘|저장|회의록|회의|내용|관련|건/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function draftTitleFromText(text, fallback = "AI 업무 기록 초안") {
  return String(text ?? "")
    .replace(/업무|기록|로그|메모|남겨줘|남겨|저장해줘|저장|등록|추가|생성|업무화|해줘|해주세요/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64) || fallback;
}

function recordDestinationFromText(text) {
  if (/회의록|회의|자료|문서|보고서|메일|링크|url|첨부|결정사항|아이디어|리스크|참고/.test(String(text ?? "").toLowerCase())) {
    return "post";
  }
  return "update";
}

function recordScopeFromText(text) {
  const value = String(text ?? "");
  if (/회의록|회의/.test(value)) return "회의록";
  if (/메일/.test(value)) return "메일";
  if (/리스크/.test(value)) return "리스크";
  if (/아이디어/.test(value)) return "아이디어";
  if (/결정사항|결정/.test(value)) return "결정사항";
  if (/문서|보고서|자료|링크|url|첨부|참고/.test(value.toLowerCase())) return "참고자료";
  return "기억할 점";
}

function statusFromText(text) {
  const value = String(text ?? "");
  return statusWords.find((status) => value.includes(status))
    || (/완료|끝났|마무리/.test(value) ? "완료" : "")
    || (/진행|착수/.test(value) ? "진행중" : "")
    || (/보류|대기/.test(value) ? "보류" : "")
    || (/계획/.test(value) ? "계획" : "")
    || (/검토/.test(value) ? "검토/대기" : "");
}

function isSelfReference(text) {
  return /(^|\s)(나|내|내가|저|제|본인|나의|내\s*업무|제\s*업무)(\s|의|가|를|은|는|만|$)/.test(text);
}

function personalContextFrom({ briefingItems = [], currentPersonId = "", memoByPage = {} } = {}) {
  const items = Array.isArray(briefingItems)
    ? briefingItems
      .filter((item) => item && !item.deletedAt && item.scope !== "team")
      .filter((item) => item.ownerId === currentPersonId || (!item.ownerId && item.authorId === currentPersonId))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        status: item.status,
        updatedAt: item.updatedAt || item.createdAt
      }))
    : [];
  const memo = typeof memoByPage?.my === "string" ? memoByPage.my.trim() : "";
  return {
    memo,
    inboxItems: items,
    hasPrivateContext: Boolean(memo || items.length)
  };
}

export function classifyAssistantPrompt(prompt, { people = [], today = new Date().toISOString().slice(0, 10), currentPerson = null, mode = "question" } = {}) {
  const text = normalizePrompt(prompt);
  const week = weekRange(today);
  const month = monthRange(today);
  const lower = text.toLowerCase();
  const mentionedPerson = findMentionedPerson(text, people);
  const selfPerson = currentPerson && isSelfReference(text) ? currentPerson : null;

  if (mode === "task") {
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

  if (mode === "note") {
    const query = recordQuery(text) || keywordQuery(text) || text;
    return {
      kind: "work-record",
      label: "업무 Note",
      needsHumanApproval: true,
      params: {
        rawText: text,
        query,
        periodStart: month.start,
        periodEnd: month.end
      }
    };
  }

  if (mode === "status") {
    const query = recordQuery(text) || keywordQuery(text) || text;
    return {
      kind: "status-change",
      label: "상태 변경 확인",
      needsHumanApproval: true,
      params: {
        rawText: text,
        query,
        nextStatus: statusFromText(text),
        periodStart: month.start,
        periodEnd: month.end
      }
    };
  }

  if (/상태|완료|진행중|진행|보류|계획|검토/.test(text) && /변경|바꿔|처리|완료|넘겨|해줘|했어|끝났/.test(text)) {
    const query = recordQuery(text) || keywordQuery(text) || text;
    return {
      kind: "status-change",
      label: "상태 변경 확인",
      needsHumanApproval: true,
      params: {
        rawText: text,
        query,
        nextStatus: statusFromText(text),
        periodStart: month.start,
        periodEnd: month.end
      }
    };
  }

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

  if (/기록|로그|메모|남겨|저장|회의록|회의|후속|공유/.test(text)) {
    const query = recordQuery(text) || keywordQuery(text) || text;
    return {
      kind: "work-record",
      label: "업무 기록",
      needsHumanApproval: true,
      params: {
        rawText: text,
        query,
        periodStart: month.start,
        periodEnd: month.end
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

  if (selfPerson || mentionedPerson) {
    const person = selfPerson || mentionedPerson;
    return {
      kind: "person-work-status",
      label: selfPerson ? "내 업무현황" : `${person.name} 업무현황`,
      params: {
        person: person.name,
        personId: person.id,
        isSelf: Boolean(selfPerson),
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
  if (values.personId && !values.person) params.set("person", values.personId);
  if (values.person && intent.kind === "recent-updates") params.set("owner", values.person);
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

function summarizePersonalContext(context) {
  if (!context?.hasPrivateContext) return [];
  const lines = [];
  if (context.memo) {
    lines.push(`개인 메모: ${context.memo.slice(0, 90)}${context.memo.length > 90 ? "..." : ""}`);
  }
  context.inboxItems?.slice(0, 3).forEach((item) => {
    const body = item.body ? ` - ${item.body.slice(0, 70)}${item.body.length > 70 ? "..." : ""}` : "";
    lines.push(`개인 인박스: ${item.title}${body}`);
  });
  return lines;
}

export function summarizeAssistantEvidence(evidence, intent) {
  const items = evidence?.items ?? [];
  const personalLines = summarizePersonalContext(evidence?.personalContext);
  const teamReferenceItems = evidence?.teamReferenceItems ?? [];
  if (!items.length) {
    return [
      "조건에 맞는 업무 기록을 찾지 못했습니다. 기간이나 담당자, 주제어를 바꿔 다시 확인해 주세요.",
      ...personalLines,
      ...teamReferenceItems.slice(0, 2).map((item) => `참고 팀 업무: ${item.taskTitle} (${item.ownerName || "담당자 미상"}, ${item.status || "상태 미상"})`)
    ].join("\n");
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
  const teamLines = intent.params?.isSelf && teamReferenceItems.length
    ? teamReferenceItems.slice(0, 2).map((item) => `참고 팀 업무: ${item.taskTitle} (${item.ownerName || "담당자 미상"}, ${item.status || "상태 미상"})`)
    : [];
  return [headline, ...personalLines, ...lines, ...teamLines, "근거 업무와 업데이트 ID를 함께 보관했습니다."].join("\n");
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

export function buildWorkRecordReply(intent, evidence) {
  const items = evidence?.items ?? [];
  const rawText = intent.params.rawText;
  if (!items.length) {
    return {
      intent,
      evidence,
      answer: [
        "조건에 맞는 기존 업무를 찾지 못했습니다.",
        "이 내용은 새 업무 등록 초안으로 전환할 수 있습니다. 업무 추가 폼에서 제목, 담당자, 마감일을 확인한 뒤 저장하세요.",
        `기록 원문: ${rawText}`
      ].join("\n"),
      recordDraft: {
        mode: "task",
        rawText,
        title: draftTitleFromText(rawText),
        body: rawText
      },
      sources: []
    };
  }

  const primary = items[0];
  const destination = recordDestinationFromText(rawText);
  const options = items.slice(0, 5).map((item) => ({
    taskId: item.taskId,
    taskTitle: item.taskTitle,
    ownerName: item.ownerName,
    status: item.status
  }));
  return {
    intent,
    evidence,
    answer: [
      `관련 업무 후보 ${items.length}건을 찾았습니다.`,
      destination === "post"
        ? `우선 "${primary.taskTitle}" 업무의 업무자료로 저장할 수 있습니다.`
        : `우선 "${primary.taskTitle}" 업무의 로그로 저장할 수 있습니다.`,
      "저장 전 아래 기록 내용을 확인하세요."
    ].join("\n"),
    recordDraft: {
      mode: destination,
      rawText,
      body: rawText,
      scope: recordScopeFromText(rawText),
      title: draftTitleFromText(rawText, destination === "post" ? "AI 업무자료" : "AI 업무 로그"),
      taskId: primary.taskId,
      taskTitle: primary.taskTitle,
      options
    },
    sources: sourceRefs(items)
  };
}

export function buildStatusChangeReply(intent, evidence) {
  const items = evidence?.items ?? [];
  const rawText = intent.params.rawText;
  const nextStatus = intent.params.nextStatus || "진행중";
  if (!items.length) {
    return {
      intent,
      evidence,
      answer: [
        "상태를 바꿀 기존 업무를 찾지 못했습니다.",
        "이 요청이 새 업무라면 업무 등록 초안으로 전환할 수 있습니다.",
        `요청 원문: ${rawText}`
      ].join("\n"),
      statusDraft: {
        mode: "task",
        rawText,
        nextStatus,
        body: rawText
      },
      sources: []
    };
  }
  const primary = items[0];
  const options = items.slice(0, 5).map((item) => ({
    taskId: item.taskId,
    taskTitle: item.taskTitle,
    ownerName: item.ownerName,
    status: item.status
  }));
  return {
    intent,
    evidence,
    answer: [
      `관련 업무 후보 ${items.length}건을 찾았습니다.`,
      `"${primary.taskTitle}" 업무 상태를 ${nextStatus}(으)로 변경할까요?`,
      "저장 전 대상 업무와 상태를 확인하세요."
    ].join("\n"),
    statusDraft: {
      mode: "status",
      rawText,
      taskId: primary.taskId,
      taskTitle: primary.taskTitle,
      nextStatus,
      options
    },
    sources: sourceRefs(items)
  };
}

function localEvidenceForIntent(intent, { briefingItems = [], currentPerson = null, memoByPage = {}, tasks = [], people = [], today }) {
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
    const evidence = buildPersonWorkStatusEvidence({ ...base, personId: intent.params.personId, personName: intent.params.person });
    if (intent.params.isSelf && currentPerson?.id) {
      const teamEvidence = buildReportEvidence({ ...base, reportType: "monthly" });
      return {
        ...evidence,
        personalContext: personalContextFrom({ briefingItems, currentPersonId: currentPerson.id, memoByPage }),
        teamReferenceItems: teamEvidence.items.filter((item) => item.ownerId !== currentPerson.id && item.signals?.length).slice(0, 3)
      };
    }
    return evidence;
  }
  if (intent.kind === "workstream-issues") {
    return buildWorkstreamIssuesEvidence({ ...base, workstream: intent.params.workstream });
  }
  if (intent.kind === "recent-updates") {
    return buildRecentUpdatesEvidence({ ...base, filters: {} });
  }
  return buildTopicSearchEvidence({ ...base, query: intent.params.query });
}

export function buildLocalAssistantReply({ briefingItems = [], currentPerson = null, memoByPage = {}, mode = "question", prompt, tasks = [], people = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const intent = classifyAssistantPrompt(prompt, { people, today, currentPerson, mode });
  if (intent.kind === "task-draft") return buildTaskDraftReply(intent);
  const evidence = localEvidenceForIntent(intent, { briefingItems, currentPerson, memoByPage, tasks, people, today });
  if (intent.kind === "work-record") return buildWorkRecordReply(intent, evidence);
  if (intent.kind === "status-change") return buildStatusChangeReply(intent, evidence);
  return {
    intent,
    evidence,
    answer: summarizeAssistantEvidence(evidence, intent),
    sources: sourceRefs(evidence.items)
  };
}
