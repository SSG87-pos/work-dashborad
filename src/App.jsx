import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  Database,
  Download,
  Edit3,
  Filter,
  FileText,
  FolderOpen,
  House,
  Info,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogIn,
  LogOut,
  MessageSquareText,
  Network,
  NotebookPen,
  PanelRightOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  TimerReset,
  Trash2,
  UserCog,
  SmilePlus,
  RotateCcw,
  Upload,
  X
} from "lucide-react";
import { TODAY, assignerTypes, categories, initialCalendarEvents, initialTasks, mindmapSampleTasks, people, statuses, tagOptions } from "./data.js";
import { localDashboardStore, localDisplayPreferenceStore, supabaseImportHistoryStore } from "./storage.js";
import { buildSupabaseImportPlan, formatSupabaseImportPlanMessage } from "./supabaseImportPlan.js";
import { apiConfig, apiDashboardStore } from "./apiStore.js";
import { supabaseConfig } from "./supabaseClient.js";
import { supabaseDashboardStore } from "./supabaseStore.js";
import {
  buildLocalAssistantReply,
  classifyAssistantPrompt,
  defaultAiAssistantPrompts,
  summarizeAssistantEvidence
} from "./aiAssistant.js";
import { summaryFilterLabels, summaryFilterMatches } from "./summaryFilters.js";
import { collectWorkstreams, groupTasksByWorkstream, recommendWorkstream } from "./workstreams.js";

const MindmapView = lazy(() => import("./MindmapView.jsx").then((module) => ({ default: module.MindmapView })));
const SharedCanvasView = lazy(() => import("./SharedCanvasView.jsx").then((module) => ({ default: module.SharedCanvasView })));
const PoslabLanyard = lazy(() => import("./PoslabLanyard.jsx"));

const dayMs = 24 * 60 * 60 * 1000;
const boardStatuses = ["검토/대기", "계획", "진행중", "완료", "보류"];
const priorityFilters = ["전체", "높음", "보통", "낮음"];
const workKindFilters = ["전체", "스팟"];
const workKindOptions = [
  { value: "standard", label: "일반 업무" },
  { value: "spot", label: "스팟 업무" }
];
const displayDensityOptions = ["standard", "comfortable"];
const taskPostToneOptions = ["blue", "green", "amber", "red", "violet", "slate"];
const briefingItemTypes = [
  { value: "mail", label: "메일" },
  { value: "meeting", label: "회의" },
  { value: "idea", label: "아이디어" },
  { value: "risk", label: "리스크" },
  { value: "reference", label: "참고" },
  { value: "todo", label: "할일" },
  { value: "note", label: "메모" }
];
const briefingItemStatuses = [
  { value: "new", label: "미처리" },
  { value: "reviewing", label: "확인중" },
  { value: "converted", label: "업무화" },
  { value: "archived", label: "보관" }
];
const defaultTaskPostCategories = [
  { id: "decision", label: "결정사항", tone: "blue", active: true },
  { id: "memory", label: "기억할 점", tone: "green", active: true },
  { id: "risk", label: "리스크", tone: "red", active: true },
  { id: "meeting", label: "회의록", tone: "slate", active: true },
  { id: "important-doc", label: "중요문서", tone: "violet", active: true },
  { id: "reference", label: "참고자료", tone: "slate", active: true },
  { id: "followup", label: "다음 확인", tone: "amber", active: true }
];
const UNASSIGNED_OWNER_ID = "unassigned";
const unassignedPerson = {
  id: UNASSIGNED_OWNER_ID,
  name: "미지정",
  role: "담당자 미정",
  permissionRole: "member",
  color: "#94a3b8",
  emoji: "•",
  isTeamMember: false,
  isActive: true
};
const statusMeanings = {
  "검토/대기": "검토·승인·자료 회신을 기다리는 상태",
  계획: "등록은 되었지만 아직 착수 전",
  진행중: "실제 작업을 진행 중",
  완료: "완료 처리되어 실적에 반영",
  보류: "재개 시점이 불확실해 별도 관리"
};
const statusStickerLabels = {
  "검토/대기": "⏳ 검토",
  계획: "📝 계획",
  진행중: "⚙️ 진행",
  완료: "✅ 완료",
  보류: "⏸ 보류"
};
const tagFilterDelimiter = "||";
const defaultAvailableTags = normalizeTags([...categories.filter((item) => item !== "전체"), ...tagOptions]);
const defaultTagFilterPresets = [
  { id: "preset:planning-report", label: "기획/임원보고", tags: ["기획보고", "임원보고"], tone: "report" },
  { id: "preset:strategy", label: "전략/투자", tags: ["전략과제", "투자검토", "시장동향"], tone: "strategy" },
  { id: "preset:research", label: "조사/근거", tags: ["자료조사", "외부자료", "정책"], tone: "research" },
  { id: "preset:operations", label: "운영/KPI", tags: ["월간보고", "회의체", "운영", "KPI"], tone: "operations" }
];
const viewOptions = ["board", "list", "timeline", "calendar", "recurring", "archive", "mindmap", "updates", "performance", "canvas", "admin"];
const fullPageViews = ["calendar", "updates", "performance", "canvas", "admin"];
const workflowFilterViews = ["board", "list", "timeline", "recurring", "archive", "mindmap"];
const pageOptions = ["my", "team"];
const timelineModeOptions = ["month", "year"];
const performanceModes = ["week", "month", "quarter", "year"];
const recurringTypes = ["매주", "매월"];
const weekdayOptions = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
  { value: 0, label: "일" }
];
const permissionLabels = {
  admin: "관리자",
  lead: "팀장",
  member: "팀원"
};
let peopleDirectory = people;

function timeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 7) return "조금 이른 시간이네요 🌙 오늘 할 일은 천천히 정리해봐요.";
  if (hour < 10) return "좋은 아침이에요 ☀️ 오늘도 무리 없이 하나씩 챙겨봐요.";
  if (hour < 12) return "좋은 오전이에요 🌿 중요한 일부터 차분히 잡아봐요.";
  if (hour < 17) return "오늘도 잘 이어가고 있어요 🙂 필요한 일부터 차분히 정리해봐요.";
  if (hour < 19) return "오늘 하루 마무리할 시간이네요 🌆 남은 일은 가볍게 정리해봐요.";
  if (hour < 22) return "오늘도 고생 많으셨어요 ✨ 내일로 넘길 일까지 편하게 정리해봐요.";
  return "늦은 시간까지 고생 많으셨어요 🌙 지금은 부담을 조금 내려놓아도 좋아요.";
}

function taskCountByBriefingTitle(briefing, title) {
  return briefing.find((group) => group.title === title)?.tasks.length ?? 0;
}

function personalBriefingGreeting(briefing, date = new Date()) {
  const base = timeGreeting(date);
  const overdue = taskCountByBriefingTitle(briefing, "지연 업무");
  const dueToday = taskCountByBriefingTitle(briefing, "오늘 마감 업무");
  const startToday = taskCountByBriefingTitle(briefing, "오늘 시작할 업무");
  const focus = taskCountByBriefingTitle(briefing, "오늘 집중 업무");
  if (overdue) return `${base} 지연 ${overdue}건부터 가볍게 확인해봐요.`;
  if (dueToday) return `${base} 오늘 마감 ${dueToday}건만 먼저 챙기면 한결 든든할 거예요.`;
  if (startToday) return `${base} 오늘 시작할 업무부터 편하게 열어볼까요?`;
  if (focus) return `${base} 중요한 업무 ${focus}건을 먼저 잡아두면 흐름이 좋아질 거예요.`;
  return base;
}

function roleLine(person) {
  return person.role;
}

function adminBadge(person) {
  return person.permissionRole === "admin" ? permissionLabels.admin : "";
}

function persistedArray(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

function withSpotDemoTask(value) {
  const tasks = Array.isArray(value) ? value : [];
  if (tasks.some((task) => task?.workKind === "spot" || task?.id === "t-spot-001")) {
    return tasks.map((task) =>
      task?.id === "t-spot-001" && task.title === "회의 직후 공유자료 스팟 정리"
        ? { ...task, title: "회의 직후 공유자료 빠른 정리" }
        : task
    );
  }
  const spotDemoTask = initialTasks.find((task) => task.id === "t-spot-001");
  return spotDemoTask ? [...tasks, cloneList([spotDemoTask])[0]] : tasks;
}

function cloneList(value) {
  return JSON.parse(JSON.stringify(value));
}

function persistedOption(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

function persistedPerson(value) {
  if (value === "seoyeon") return "kmryu";
  if (value === "haram") return "sugu05";
  return typeof value === "string" && value ? value : "kmryu";
}

function persistedObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function persistedString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function fallbackTextFingerprint(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fallback-${(hash >>> 0).toString(16).padStart(8, "0")}-${value.length}`;
}

async function textFingerprint(value) {
  if (typeof window !== "undefined" && window.crypto?.subtle && window.TextEncoder) {
    const buffer = await window.crypto.subtle.digest("SHA-256", new window.TextEncoder().encode(value));
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return fallbackTextFingerprint(value);
}

function formatImportHistoryDate(value) {
  if (!value) return "이전";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "이전";
  }
}

function initialSharedMemoFrom(persistedState) {
  if (typeof persistedState.sharedMemo === "string") return persistedState.sharedMemo;
  const legacyNotes = persistedObject(persistedState.personalNotes);
  return Object.values(legacyNotes).find((note) => typeof note === "string" && note.trim()) ?? "";
}

function initialMemoByPageFrom(persistedState) {
  if (persistedState.memoByPage && typeof persistedState.memoByPage === "object") {
    return {
      my: persistedString(persistedState.memoByPage.my),
      team: persistedString(persistedState.memoByPage.team)
    };
  }
  const legacyMemo = initialSharedMemoFrom(persistedState);
  return {
    my: legacyMemo,
    team: ""
  };
}

function normalizeBriefingItemType(value) {
  return briefingItemTypes.some((type) => type.value === value) ? value : "note";
}

function normalizeBriefingItemStatus(value, kind = "inbox") {
  if (kind === "todo") return value === "done" ? "done" : "open";
  return briefingItemStatuses.some((status) => status.value === value) ? value : "new";
}

function briefingItemTypeLabel(value) {
  return briefingItemTypes.find((type) => type.value === value)?.label ?? "메모";
}

function briefingItemStatusLabel(value) {
  return briefingItemStatuses.find((status) => status.value === value)?.label ?? "미처리";
}

function cleanBriefingItem(item, index) {
  const scope = item?.scope === "team" ? "team" : "my";
  const kind = item?.kind === "todo" || scope === "team" ? "todo" : "inbox";
  const body = persistedString(item?.body);
  const fallbackTitle = body.split("\n").find(Boolean)?.slice(0, 48) || (kind === "todo" ? "팀 체크 항목" : "업무 인박스 항목");
  const title = persistedString(item?.title, fallbackTitle).trim() || fallbackTitle;
  const done = Boolean(item?.done || item?.status === "done");
  return {
    id: persistedString(item?.id, `briefing-item-${index}-${Date.now().toString(36)}`),
    scope,
    kind,
    type: normalizeBriefingItemType(item?.type),
    title,
    body,
    url: persistedString(item?.url).trim(),
    status: kind === "todo" ? (done ? "done" : "open") : normalizeBriefingItemStatus(item?.status, kind),
    done,
    ownerId: persistedString(item?.ownerId),
    taskId: persistedString(item?.taskId),
    authorId: persistedString(item?.authorId, "admin"),
    createdAt: persistedString(item?.createdAt, TODAY),
    updatedAt: persistedString(item?.updatedAt),
    deletedAt: persistedString(item?.deletedAt)
  };
}

function initialBriefingItemsFrom(persistedState) {
  if (Array.isArray(persistedState.briefingItems)) {
    return uniqueById(persistedState.briefingItems.map(cleanBriefingItem)).filter((item) => !item.deletedAt);
  }
  const memoByPage = initialMemoByPageFrom(persistedState);
  const migrated = [];
  if (memoByPage.my.trim()) {
    migrated.push(cleanBriefingItem({
      id: "migrated-my-briefing-memo",
      scope: "my",
      kind: "inbox",
      type: "note",
      title: "이전 메모",
      body: memoByPage.my,
      authorId: persistedPerson(persistedState.selectedPersonId)
    }, 0));
  }
  if (memoByPage.team.trim()) {
    migrated.push(cleanBriefingItem({
      id: "migrated-team-briefing-memo",
      scope: "team",
      kind: "todo",
      type: "todo",
      title: memoByPage.team.split("\n").find(Boolean)?.slice(0, 48) || "이전 팀 메모",
      body: memoByPage.team,
      authorId: persistedPerson(persistedState.selectedPersonId)
    }, 1));
  }
  return migrated;
}

function persistedTaskId(value, taskList) {
  return taskList.some((task) => task.id === value) ? value : taskList[0]?.id ?? "";
}

function readTagFilterValues(value, presets = defaultTagFilterPresets) {
  if (!value || value === "전체") return [];
  const tokens = Array.isArray(value) ? value : String(value).split(tagFilterDelimiter);
  return normalizeTags(tokens.flatMap((token) => {
    const cleanToken = String(token).trim();
    if (!cleanToken || cleanToken === "전체") return [];
    const preset = presets.find((item) => item.id === cleanToken || item.label === cleanToken);
    return preset ? preset.tags : [cleanToken];
  }));
}

function serializeTagFilters(filters) {
  const cleanFilters = normalizeTags(filters);
  return cleanFilters.length ? cleanFilters.join(tagFilterDelimiter) : "전체";
}

function persistedTag(value, tags, presets = defaultTagFilterPresets) {
  const validTags = new Set([...tags, ...presets.flatMap((preset) => preset.tags)]);
  const filters = readTagFilterValues(value, presets).filter((tag) => validTags.has(tag));
  return serializeTagFilters(filters);
}

function tagFilterSummaryLabel(filters) {
  if (!filters.length) return "전체";
  if (filters.length === 1) return filters[0];
  if (filters.length === 2) return filters.join(", ");
  return `${filters[0]} 외 ${filters.length - 1}개`;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isDeletedTask(task) {
  return Boolean(task?.deletedAt);
}

function isISODate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function displayTaskTitle(task) {
  const title = typeof task?.title === "string" ? task.title.trim() : "";
  return title.replace(/\s*\((?:\d{1,2}월\s*)?\d{1,2}일\s*반복\)\s*$/u, "").trim() || title;
}

function taskWorkstreamLabel(task, existingWorkstreams = []) {
  if (!task?.workstream && !String(task?.title ?? "").trim()) return "";
  return recommendWorkstream(task, existingWorkstreams).label;
}

function cleanImportedTask(task, index, options = {}) {
  const knownPersonIds = options.knownPersonIds ?? new Set(people.map((person) => person.id));
  const ownerId = knownPersonIds.has(task.ownerId)
    ? task.ownerId
    : "kmryu";
  const tags = normalizeTags(Array.isArray(task.tags) ? task.tags : [task.category || "운영"]);
  const status = statuses.includes(task.status) ? task.status : "계획";
  const startDate = isISODate(task.startDate) ? task.startDate : TODAY;
  const dueDate = isISODate(task.dueDate) ? task.dueDate : startDate;
  const completedAt = isISODate(task.completedAt) && status === "완료" ? task.completedAt : "";
  const completedBy = completedAt && knownPersonIds.has(task.completedBy) ? task.completedBy : "";
  return {
    id: typeof task.id === "string" && task.id ? task.id : `imported-task-${Date.now()}-${index}`,
    title: typeof task.title === "string" && task.title.trim() ? displayTaskTitle(task) : "가져온 업무",
    description: typeof task.description === "string" ? task.description : "",
    ownerId,
    assignerId: task.assignerId || task.creatorId || ownerId,
    assignerType: assignerTypes.includes(task.assignerType) ? task.assignerType : defaultAssignerType(ownerId),
    creatorId: task.creatorId || ownerId,
    status,
    priority: ["낮음", "보통", "높음"].includes(task.priority) ? task.priority : "보통",
    workKind: task.workKind === "spot" ? "spot" : "standard",
    category: tags[0] ?? "운영",
    tags: tags.length ? tags : ["운영"],
    workstream: taskWorkstreamLabel(task),
    createdAt:
      typeof task.createdAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.createdAt)
        ? task.createdAt
        : task.isNewAssignment ? TODAY : startDate,
    startDate,
    dueDate,
    completedAt,
    completedBy,
    progress: Math.min(100, Math.max(0, Number(task.progress) || 0)),
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks
          .map((subtask, subtaskIndex) => ({
            id: subtask.id || `imported-subtask-${Date.now()}-${index}-${subtaskIndex}`,
            title: typeof subtask.title === "string" ? subtask.title.trim() : "",
            done: Boolean(subtask.done)
          }))
          .filter((subtask) => subtask.title)
      : [],
    archived: Boolean(task.archived),
    deletedAt: isISODate(task.deletedAt) ? task.deletedAt : "",
    isNewAssignment: false,
    recurring: recurringTypes.includes(task.recurring) ? task.recurring : null,
    recurringDetail: typeof task.recurringDetail === "string" ? task.recurringDetail : "",
    recurringInterval: Math.max(1, Number(task.recurringInterval) || 1),
    recurringWeekdays: normalizeRecurringWeekdays(task.recurringWeekdays, dueDate),
    recurringStartDate: typeof task.recurringStartDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.recurringStartDate) ? task.recurringStartDate : startDate,
    recurringEndDate: typeof task.recurringEndDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.recurringEndDate) ? task.recurringEndDate : "",
    recurringNoEnd: Boolean(task.recurringNoEnd || (task.recurring && !task.recurringEndDate)),
    recurringDurationDays: Math.max(1, Number(task.recurringDurationDays) || 1),
    isRecurringInstance: Boolean(task.isRecurringInstance),
    recurringTemplateId: typeof task.recurringTemplateId === "string" ? task.recurringTemplateId : undefined,
    links: Array.isArray(task.links)
      ? task.links
          .map((link) => ({
            title: typeof link.title === "string" ? link.title : "관련 링크",
            url: typeof link.url === "string" ? link.url : "",
            type: typeof link.type === "string" ? link.type : "링크"
          }))
          .filter((link) => link.title || link.url)
      : [],
    updates: Array.isArray(task.updates)
      ? task.updates
          .map((update) => ({
            authorId: update.authorId || ownerId,
            date: isISODate(update.date) ? update.date : TODAY,
            text: typeof update.text === "string" ? update.text.trim() : ""
          }))
          .filter((update) => update.text)
      : [],
    statusHistory: Array.isArray(task.statusHistory)
      ? task.statusHistory
          .map((entry) => {
            const type = entry.type === "dueDate" ? "dueDate" : "status";
            return {
              type,
              from: type === "dueDate" ? (isISODate(entry.from) ? entry.from : "") : (statuses.includes(entry.from) ? entry.from : ""),
              to: type === "dueDate" ? (isISODate(entry.to) ? entry.to : "") : (statuses.includes(entry.to) ? entry.to : status),
              actorId: entry.actorId || ownerId,
              date: isISODate(entry.date) ? entry.date : TODAY,
              note: typeof entry.note === "string" ? entry.note : ""
            };
          })
          .filter((entry) => entry.to)
      : []
  };
}

function cleanImportedEvent(event, index, options = {}) {
  const knownPersonIds = options.knownPersonIds ?? new Set(people.map((person) => person.id));
  const scope = event.scope === "personal" ? "personal" : "team";
  const ownerId = knownPersonIds.has(event.ownerId)
    ? event.ownerId
    : "lead";
  const creatorCandidate = event.creatorId || event.createdBy;
  const creatorId = knownPersonIds.has(creatorCandidate)
    ? creatorCandidate
    : ownerId;
  const startDate = isISODate(event.startDate) ? event.startDate : isISODate(event.date) ? event.date : TODAY;
  const endDateCandidate = isISODate(event.endDate) ? event.endDate : startDate;
  const endDate = diffDays(endDateCandidate, startDate) >= 0 ? endDateCandidate : startDate;
  return {
    id: typeof event.id === "string" && event.id ? event.id : `imported-event-${Date.now()}-${index}`,
    title: typeof event.title === "string" && event.title.trim() ? event.title.trim() : "가져온 일정",
    date: startDate,
    startDate,
    endDate,
    scope,
    ownerId,
    creatorId,
    note: typeof event.note === "string" ? event.note : ""
  };
}

function normalizeImportedDashboard(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("JSON 형식이 올바르지 않습니다.");
  }
  if (!Array.isArray(payload.tasks)) {
    throw new Error("tasks 배열이 있는 대시보드 JSON만 가져올 수 있습니다.");
  }
  const profileOverrides = persistedObject(payload.profileOverrides);
  const knownPersonIds = new Set([
    ...people.filter((person) => person.isTeamMember !== false).map((person) => person.id),
    ...Object.keys(profileOverrides)
  ]);
  const importedTasks = uniqueById(payload.tasks.map((task, index) => cleanImportedTask(task, index, { knownPersonIds })));
  if (!importedTasks.length) {
    throw new Error("가져올 업무가 없습니다.");
  }
  const importedTags = normalizeTags([
    ...(Array.isArray(payload.availableTags) ? payload.availableTags : []),
    ...importedTasks.flatMap((task) => task.tags)
  ]);
  return {
    tasks: importedTasks,
    availableTags: importedTags.length ? importedTags : normalizeTags(defaultAvailableTags),
    tagGroups: Array.isArray(payload.tagGroups) ? payload.tagGroups : defaultTagFilterPresets,
    calendarEvents: uniqueById((Array.isArray(payload.calendarEvents) ? payload.calendarEvents : []).map((event, index) => cleanImportedEvent(event, index, { knownPersonIds }))),
    memoByPage: initialMemoByPageFrom(payload),
    briefingItems: initialBriefingItemsFrom(payload),
    profileOverrides
  };
}

function persistedMonth(value) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? value : TODAY.slice(0, 7);
}

function persistedYear(value) {
  return typeof value === "string" && /^\d{4}$/.test(value) ? value : TODAY.slice(0, 4);
}

function toDate(value) {
  return new Date(`${value}T00:00:00+09:00`);
}

function diffDays(a, b) {
  return Math.round((toDate(a) - toDate(b)) / dayMs);
}

function isWeekend(value) {
  const day = toDate(value).getDay();
  return day === 0 || day === 6;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(toDate(value));
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eventStartDate(event) {
  return isISODate(event?.startDate) ? event.startDate : isISODate(event?.date) ? event.date : TODAY;
}

function eventEndDate(event) {
  const start = eventStartDate(event);
  const end = isISODate(event?.endDate) ? event.endDate : start;
  return diffDays(end, start) >= 0 ? end : start;
}

function eventSpansDate(event, date) {
  return diffDays(date, eventStartDate(event)) >= 0 && diffDays(eventEndDate(event), date) >= 0;
}

function eventRangeLabel(event) {
  const start = eventStartDate(event);
  const end = eventEndDate(event);
  return start === end ? formatDate(start) : `${formatDate(start)} - ${formatDate(end)}`;
}

function compactDate(value) {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function eventCompactRangeLabel(event) {
  const start = eventStartDate(event);
  const end = eventEndDate(event);
  return start === end ? compactDate(start) : `${compactDate(start)}~${compactDate(end)}`;
}

function eventCreatorId(event) {
  return event?.creatorId || event?.createdBy || event?.ownerId || "";
}

function weekdayOf(value) {
  return toDate(value).getDay();
}

function weekdayLabel(value) {
  return weekdayOptions.find((option) => option.value === Number(value))?.label ?? "월";
}

function normalizeRecurringWeekdays(value, fallbackDate = TODAY) {
  const fallback = weekdayOf(fallbackDate);
  const items = Array.isArray(value) ? value : [];
  const valid = Array.from(
    new Set(items.map((item) => Number(item)).filter((item) => weekdayOptions.some((option) => option.value === item)))
  );
  return valid.length ? valid.sort((a, b) => weekdayOptions.findIndex((item) => item.value === a) - weekdayOptions.findIndex((item) => item.value === b)) : [fallback];
}

function recurrenceInterval(task) {
  return Math.max(1, Number(task.recurringInterval) || 1);
}

function recurrenceStart(task) {
  return task.recurringStartDate || task.startDate || TODAY;
}

function recurrenceEnd(task, fallbackRangeEnd) {
  if (task.recurringNoEnd) return fallbackRangeEnd;
  return task.recurringEndDate || fallbackRangeEnd || task.dueDate;
}

function recurringUnitText(recurring, interval) {
  const unit = recurring === "매주" ? "주" : "개월";
  return interval === 1 ? recurring : `${interval}${unit}마다`;
}

function recurringDescription(task) {
  if (!task.recurring) return "";
  const interval = recurrenceInterval(task);
  const start = recurrenceStart(task).replaceAll("-", ".");
  const end = task.recurringNoEnd || !task.recurringEndDate ? "계속" : task.recurringEndDate.replaceAll("-", ".");
  const unit = recurringUnitText(task.recurring, interval);
  if (task.recurring === "매월") {
    const duration = Math.max(1, Number(task.recurringDurationDays) || 1);
    const anchorDay = toDate(recurrenceStart(task)).getDate();
    return `${start}부터 ${end}까지 ${unit} 반복, 매월 ${anchorDay}일부터 ${duration}일간 업무진행`;
  }
  const weekdayText = normalizeRecurringWeekdays(task.recurringWeekdays, task.dueDate)
    .map((day) => `${weekdayLabel(day)}요일`)
    .join(", ");
  return `${start}부터 ${end}까지 ${unit} ${weekdayText} 반복`;
}

function addCalendarStep(value, recurring, interval = 1) {
  const date = toDate(value);
  if (recurring === "매주") date.setDate(date.getDate() + 7 * interval);
  if (recurring === "매월") date.setMonth(date.getMonth() + interval);
  return toISODate(date);
}

function recurringDueDates(task, options = {}) {
  if (!task.recurring) return [];
  const { count = 3, rangeStart, rangeEnd, afterDate = task.dueDate, guardDays = 900 } = options;
  const interval = recurrenceInterval(task);
  const start = recurrenceStart(task);
  const fallbackEndDate = rangeEnd || addCalendarStep(start, "매월", 24);
  const end = recurrenceEnd(task, fallbackEndDate);
  const minDate = rangeStart && diffDays(rangeStart, start) > 0 ? rangeStart : start;
  const dueDates = [];

  if (task.recurring === "매주") {
    const weekdays = normalizeRecurringWeekdays(task.recurringWeekdays, task.dueDate);
    let cursor = toDate(minDate);
    let guard = 0;
    while (diffDays(toISODate(cursor), end) <= 0 && guard < guardDays && dueDates.length < count) {
      const cursorDate = toISODate(cursor);
      const weeksSinceStart = Math.floor(Math.max(0, diffDays(cursorDate, start)) / 7);
      const isRepeatWeek = weeksSinceStart % interval === 0;
      if (
        isRepeatWeek &&
        weekdays.includes(cursor.getDay()) &&
        diffDays(cursorDate, afterDate) > 0 &&
        (!rangeStart || diffDays(cursorDate, rangeStart) >= 0) &&
        (!rangeEnd || diffDays(cursorDate, rangeEnd) <= 0)
      ) {
        dueDates.push(cursorDate);
      }
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    return dueDates;
  }

  let dueDate = task.dueDate;
  let guard = 0;
  while (dueDates.length < count && guard < 80) {
    dueDate = addCalendarStep(dueDate, task.recurring, interval);
    if (diffDays(dueDate, end) > 0) break;
    if (
      diffDays(dueDate, afterDate) > 0 &&
      (!rangeStart || diffDays(dueDate, rangeStart) >= 0) &&
      (!rangeEnd || diffDays(dueDate, rangeEnd) <= 0)
    ) {
      dueDates.push(dueDate);
    }
    guard += 1;
  }
  return dueDates;
}

function occurrenceFromDueDate(task, dueDate) {
  if (task.recurring === "매주") {
    return {
      startDate: dueDate,
      dueDate,
      subtasks: task.subtasks?.filter((subtask) => subtask.title?.trim()).length ?? 0
    };
  }
  const duration = Math.max(1, Number(task.recurringDurationDays) || 1);
  const start = toDate(dueDate);
  start.setDate(start.getDate() - duration + 1);
  return {
    startDate: toISODate(start),
    dueDate,
    subtasks: task.subtasks?.filter((subtask) => subtask.title?.trim()).length ?? 0
  };
}

function nextRecurringOccurrences(task, count = 3) {
  if (!task.recurring) return [];
  const dueDates = recurringDueDates(task, {
    count,
    afterDate: diffDays(TODAY, task.dueDate) > 0 ? TODAY : task.dueDate
  });
  return dueDates.map((dueDate) => occurrenceFromDueDate(task, dueDate));
}

function recurringSchedulePreview(task, completedDueDates = new Set()) {
  if (!task.recurring) return [];
  const visibleCount = task.recurringNoEnd ? 6 : 60;
  const count = visibleCount + completedDueDates.size + 12;
  const dueDates = recurringDueDates(task, {
    count,
    afterDate: diffDays(TODAY, task.dueDate) > 0 ? TODAY : task.dueDate
  }).filter((dueDate) => !completedDueDates.has(dueDate));
  return dueDates.slice(0, visibleCount).map((dueDate) => occurrenceFromDueDate(task, dueDate));
}

function recurringOccurrencesInRange(task, rangeStart, rangeEnd, limit = 18) {
  if (!task.recurring || task.archived || task.isRecurringInstance || isDeletedTask(task)) return [];
  const occurrences = [];
  recurringDueDates(task, { count: limit, rangeStart, rangeEnd, afterDate: task.dueDate }).forEach((dueDate) => {
    const occurrence = occurrenceFromDueDate(task, dueDate);
    const startDate = occurrence.startDate;
    if (diffDays(dueDate, rangeStart) >= 0 && diffDays(startDate, rangeEnd) <= 0) {
      occurrences.push({
        ...task,
        id: `${task.id}__repeat__${dueDate}`,
        startDate,
        dueDate,
        status: "계획",
        completedAt: "",
        completedBy: "",
        progressBeforeComplete: undefined,
        progress: 0,
        updates: [],
        statusHistory: [],
        subtasks: (task.subtasks ?? []).map((subtask) => ({ ...subtask, done: false })),
        createdAt: "",
        isNewAssignment: false,
        isRecurringInstance: true,
        recurringTemplateId: task.id
      });
    }
  });
  return occurrences;
}

function tasksWithRecurringInstances(tasks, rangeStart, rangeEnd, limit = 18) {
  return [
    ...tasks.filter((task) => !isDeletedTask(task)),
    ...tasks.flatMap((task) =>
      recurringOccurrencesInRange(task, rangeStart, rangeEnd, limit).filter(
        (occurrence) =>
          !tasks.some((savedTask) => savedTask.recurringTemplateId === task.id && savedTask.dueDate === occurrence.dueDate)
      )
    )
  ];
}

function todayAgendaFor(tasks, events, personId, isTeam) {
  const todayTasks = tasks
    .filter((task) => !isDeletedTask(task) && !task.archived && task.dueDate === TODAY && (isTeam || task.ownerId === personId))
    .map((task) => ({
      id: `task-${task.id}`,
      tone: "task",
      label: "업무",
      title: task.title,
      actor: personName(task.ownerId),
      status: task.status,
      statusLabel: task.status !== "완료" && taskProgress(task) < 100 ? "계획대비 지연" : statusStickerLabels[task.status] ?? task.status,
      statusTone: task.status !== "완료" && taskProgress(task) < 100 ? "risk" : task.status.replace("/", "")
    }));
  const teamEvents = events
    .filter((event) => eventSpansDate(event, TODAY) && event.scope === "team")
    .map((event) => ({
      id: `team-${event.id}`,
      tone: "team",
      label: "팀",
      title: event.title,
      actor: "공유",
      dateText: eventRangeLabel(event),
      isRange: eventStartDate(event) !== eventEndDate(event),
      meta: event.note || ""
    }));
  const personalEvents = events
    .filter((event) => eventSpansDate(event, TODAY) && event.scope === "personal" && event.ownerId === personId)
    .map((event) => ({
      id: `personal-${event.id}`,
      tone: "personal",
      label: "개인",
      title: event.title,
      actor: personName(event.ownerId),
      dateText: eventRangeLabel(event),
      isRange: eventStartDate(event) !== eventEndDate(event),
      meta: event.note || ""
    }));
  return [...todayTasks, ...teamEvents, ...personalEvents].slice(0, 6);
}

function scheduleStatusSticker(task) {
  if (!task || task.archived || ["완료", "보류"].includes(task.status)) return null;
  const due = diffDays(task.dueDate, TODAY);
  const progress = taskProgress(task);
  if (due === 0 && progress < 100) return { label: "계획대비 지연", tone: "late", title: "계획된 종료일이 오늘이지만 아직 완료되지 않았습니다." };
  const insight = timelineRisk(task);
  if (insight?.label === "계획대비 지연") return { label: insight.label, tone: "late", title: insight.reason };
  return null;
}

function periodRange(mode, anchor = TODAY) {
  const date = toDate(anchor);
  if (mode === "week") {
    const day = date.getDay() || 7;
    const start = new Date(date);
    start.setDate(date.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toISODate(start), end: toISODate(end), label: `${formatDate(toISODate(start))} - ${formatDate(toISODate(end))}` };
  }
  if (mode === "month") {
    const start = `${anchor.slice(0, 7)}-01`;
    const end = `${anchor.slice(0, 7)}-${String(daysInMonth(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)))).padStart(2, "0")}`;
    return { start, end, label: `${Number(anchor.slice(5, 7))}월` };
  }
  if (mode === "quarter") {
    const year = Number(anchor.slice(0, 4));
    const quarter = Math.floor((Number(anchor.slice(5, 7)) - 1) / 3);
    const startMonth = quarter * 3 + 1;
    const endMonth = startMonth + 2;
    const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const end = `${year}-${String(endMonth).padStart(2, "0")}-${String(daysInMonth(year, endMonth)).padStart(2, "0")}`;
    return { start, end, label: `${year}년 ${quarter + 1}분기` };
  }
  const year = anchor.slice(0, 4);
  return { start: `${year}-01-01`, end: `${year}-12-31`, label: `${year}년` };
}

function shortYear(value) {
  return `'${String(value).slice(-2)}`;
}

function shortDateLabel(value, includeYear = false) {
  const [year, month, day] = value.split("-");
  return `${includeYear ? `${shortYear(year)}.` : ""}${Number(month)}.${Number(day)}`;
}

function periodReportTitle(mode, anchor, range) {
  const year = anchor.slice(0, 4);
  const month = Number(anchor.slice(5, 7));
  if (mode === "week") {
    const includeEndYear = range.start.slice(0, 4) !== range.end.slice(0, 4);
    return `[${shortDateLabel(range.start, true)}~${shortDateLabel(range.end, includeEndYear)}] 업무실적 정리`;
  }
  if (mode === "month") return `[${shortYear(year)}.${month}월] 업무실적 정리`;
  if (mode === "quarter") return `[${shortYear(year)}.${Math.floor((month - 1) / 3) + 1}분기] 업무실적 정리`;
  return `[${shortYear(year)}년] 업무실적 정리`;
}

function normalizeRecurringTitle(title) {
  return title
    .replace(/^\d{1,2}월\s+/g, "")
    .replace(/^(이번|지난)\s*달\s+/g, "")
    .replace(/\s*\(\d{1,2}월\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function recurringRangeLabel(tasks) {
  const months = Array.from(
    new Set(tasks.map((task) => task.dueDate.slice(0, 7)))
  ).sort();
  if (!months.length) return "";
  const formatMonth = (value, includeYear = false) => {
    const [year, month] = value.split("-");
    return `${includeYear ? `${shortYear(year)}.` : ""}${Number(month)}월`;
  };
  const first = months[0];
  const last = months[months.length - 1];
  const includeLastYear = first.slice(0, 4) !== last.slice(0, 4);
  if (first === last) return `${formatMonth(first)} 반복`;
  return `${formatMonth(first)}~${formatMonth(last, includeLastYear)} 반복`;
}

function inPeriod(value, range) {
  return diffDays(value, range.start) >= 0 && diffDays(value, range.end) <= 0;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function businessDatesInMonth(year, month) {
  const days = daysInMonth(year, month);
  return Array.from({ length: days }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`).filter(
    (date) => !isWeekend(date)
  );
}

function personName(id) {
  if (id === UNASSIGNED_OWNER_ID) return unassignedPerson.name;
  return peopleDirectory.find((person) => person.id === id)?.name ?? "미지정";
}

function personEmoji(id) {
  if (id === UNASSIGNED_OWNER_ID) return unassignedPerson.emoji;
  return peopleDirectory.find((person) => person.id === id)?.emoji ?? initials(personName(id));
}

function avatarStyle(personOrId) {
  const person = personOrId === UNASSIGNED_OWNER_ID
    ? unassignedPerson
    : typeof personOrId === "string" ? peopleDirectory.find((item) => item.id === personOrId) : personOrId;
  const color = person?.color ?? "#2563eb";
  return { "--avatar": color, "--avatar-bg": `${color}20` };
}

function initials(name) {
  return name.slice(-2);
}

function teamCompositionOrder(members) {
  const roleWeight = (role) => {
    if (role.includes("그룹장")) return 0;
    if (role.includes("팀장")) return 1;
    return 2;
  };
  return [...members].sort(
    (a, b) => roleWeight(a.role) - roleWeight(b.role) || a.name.localeCompare(b.name, "ko-KR")
  );
}

function teamAssignablePeople(directory = peopleDirectory) {
  return directory.filter((person) => person.isTeamMember !== false && person.isActive !== false);
}

function isUuidLike(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function personIdentityKey(person) {
  return `${person.name?.trim() ?? ""}|${person.role?.trim() ?? ""}`;
}

function isAuthBackedPerson(person) {
  return isUuidLike(person.id) || isUuidLike(person.authUserId);
}

function displayTeamMembers(directory = peopleDirectory, selectedPersonId = "") {
  const uniqueByIdentity = new Map();
  teamAssignablePeople(directory).forEach((person) => {
    const key = personIdentityKey(person);
    const existing = uniqueByIdentity.get(key);
    if (!existing) {
      uniqueByIdentity.set(key, person);
      return;
    }
    const shouldReplace =
      person.id === selectedPersonId ||
      (existing.id !== selectedPersonId && isAuthBackedPerson(person) && !isAuthBackedPerson(existing));
    if (shouldReplace) uniqueByIdentity.set(key, person);
  });
  return teamCompositionOrder(Array.from(uniqueByIdentity.values()));
}

function taskOwnerOptions(directory = peopleDirectory) {
  return [unassignedPerson, ...teamAssignablePeople(directory)];
}

function permissionRole(id) {
  return peopleDirectory.find((person) => person.id === id)?.permissionRole ?? "member";
}

function canManageTagsFor(personId) {
  return permissionRole(personId) === "admin";
}

function canManageTaskFor(task, personId) {
  if (!task) return false;
  const role = permissionRole(personId);
  return role === "admin" || role === "lead" || task.ownerId === personId || task.creatorId === personId;
}

function canAssignPersonalCalendarFor(personId) {
  const role = permissionRole(personId);
  return role === "admin" || role === "lead";
}

function canManageCalendarEventFor(event, personId) {
  if (!event) return false;
  const role = permissionRole(personId);
  return role === "admin" || role === "lead" || event.ownerId === personId || eventCreatorId(event) === personId;
}

function normalizeTags(tags) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function taskTags(task) {
  return normalizeTags([task.category, ...(task.tags ?? [])]);
}

function primaryTag(task) {
  return taskTags(task)[0] ?? "태그 없음";
}

function timelineTaskTags(task) {
  const tags = taskTags(task);
  if (!isSpotTask(task)) return tags;
  return normalizeTags(["⚡ 스팟", ...tags.filter((tag) => tag !== task.category)]);
}

function primaryTimelineTag(task) {
  return timelineTaskTags(task)[0] ?? "태그 없음";
}

function matchesTagFilter(taskTagList, filterValue, presets = defaultTagFilterPresets) {
  const selectedTags = readTagFilterValues(filterValue, presets);
  if (!selectedTags.length) return true;
  return selectedTags.some((tag) => taskTagList.includes(tag));
}

function recurringSummary(task) {
  if (!task.recurring) return "없음";
  const detail = recurringDescription(task) || task.recurringDetail?.trim();
  const duration = Number(task.recurringDurationDays);
  const durationText = task.recurring === "매월" && duration ? `업무기간 ${duration}일` : "";
  return [detail, durationText].filter(Boolean).join(" · ");
}

function recurringLabel(task) {
  return task.recurring ? `🔁 ${recurringSummary(task)}` : "없음";
}

function taskProgress(task) {
  const subtasks = task.subtasks?.filter((subtask) => subtask.title?.trim()) ?? [];
  if (!subtasks.length) return task.status === "완료" ? 100 : 0;
  return Math.round((subtasks.filter((subtask) => subtask.done).length / subtasks.length) * 100);
}

function taskWorkKind(task) {
  return task?.workKind === "spot" ? "spot" : "standard";
}

function isSpotTask(task) {
  return taskWorkKind(task) === "spot";
}

function completionDate(task) {
  return isISODate(task.completedAt) ? task.completedAt : "";
}

function effectiveReportDate(task) {
  if (task.status === "완료") return completionDate(task) || task.dueDate;
  if (task.status === "보류") return task.dueDate;
  return task.dueDate;
}

function statusHistoryText(from, to) {
  if (to === "완료") return "완료 처리";
  if (from === "완료") return "완료 처리 취소";
  return `${from || "신규"}에서 ${to}로 변경`;
}

function taskChangeText(entry) {
  if (entry.type === "dueDate") return entry.note || `마감일 변경: ${entry.from} → ${entry.to}`;
  if (entry.type === "recurring") return entry.note || "미수행 반복 일정 삭제";
  if (entry.type === "delete") return entry.note || "업무 삭제";
  return entry.note || statusHistoryText(entry.from, entry.to);
}

function dueDateHistoryEntry(previousDueDate, nextDueDate, actorId) {
  if (!previousDueDate || !nextDueDate || previousDueDate === nextDueDate) return null;
  return {
    type: "dueDate",
    from: previousDueDate,
    to: nextDueDate,
    actorId,
    date: TODAY,
    note: `마감일 변경: ${previousDueDate} → ${nextDueDate}`
  };
}

function recurringStopHistoryEntry(actorId) {
  return {
    type: "recurring",
    from: "반복",
    to: "중지",
    actorId,
    date: TODAY,
    note: "미수행 반복 일정 삭제"
  };
}

function applyStatusTransition(task, previousTask, actorId) {
  const previousStatus = previousTask?.status ?? "";
  const nextStatus = statuses.includes(task.status) ? task.status : "계획";
  const changed = previousTask ? previousStatus !== nextStatus : nextStatus === "완료";
  const history = Array.isArray(task.statusHistory) ? task.statusHistory : [];
  const entry = changed
    ? {
        from: previousStatus,
        to: nextStatus,
        actorId,
        date: TODAY,
        note: statusHistoryText(previousStatus, nextStatus)
      }
    : null;
  let nextTask = {
      ...task,
      status: nextStatus,
      statusHistory: entry ? [entry, ...history] : history
  };
  if (nextStatus === "완료") {
    nextTask = {
      ...nextTask,
      completedAt: completionDate(task) || TODAY,
      completedBy: task.completedBy || actorId,
      progressBeforeComplete: previousStatus === "완료" ? task.progressBeforeComplete : task.progress,
      progress: 100
    };
  } else if (previousStatus === "완료" || task.completedAt || task.completedBy) {
    nextTask = {
      ...nextTask,
      completedAt: "",
      completedBy: "",
      progressBeforeComplete: undefined,
      progress:
        previousStatus === "완료" &&
        !task.subtasks?.length &&
        Number.isFinite(Number(task.progressBeforeComplete))
          ? Number(task.progressBeforeComplete)
          : task.progress
    };
  }
  return nextTask;
}

function monthLabel(value) {
  const [year, month] = value.split("-");
  return `${year}년 ${Number(month)}월`;
}

function compactMonthLabel(value) {
  const [, month] = value.split("-");
  return `${Number(month)}월`;
}

function reportDateLabel(value, mode) {
  if (mode === "quarter" || mode === "year") return compactMonthLabel(value);
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function updatesInRange(task, range) {
  return (task.updates ?? []).filter((update) => inPeriod(update.date, range));
}

function conciseIssueText(text) {
  return text
    .replace(/보류 처리[.]?/g, "")
    .replace(/업데이트[.]?/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]$/, "");
}

function issueFromTask(task, rangeUpdates) {
  const issueWords = ["이슈", "지연", "보류", "대기", "확인 필요", "미제출", "리스크", "조정"];
  const issueUpdate = rangeUpdates.find((update) => issueWords.some((word) => update.text.includes(word)));
  if (issueUpdate) return conciseIssueText(issueUpdate.text);
  if (task.status === "보류") return "재개 조건과 확인 필요 자료 별도 관리";
  if (task.status !== "완료" && diffDays(task.dueDate, TODAY) < 0) return "마감일 경과, 일정 조정 필요";
  return "";
}

function latestTaskUpdate(task) {
  return [...(task.updates ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];
}

function nextActionContext(task) {
  const due = diffDays(task.dueDate, TODAY);
  const progress = taskProgress(task);
  const subtasks = (task.subtasks ?? []).filter((subtask) => subtask.title?.trim());
  const nextSubtask = subtasks.find((subtask) => !subtask.done);
  const allSubtasksDone = subtasks.length > 0 && subtasks.every((subtask) => subtask.done);
  const hasLinks = (task.links ?? []).some((link) => link.title?.trim() || link.url?.trim());
  const latestUpdate = latestTaskUpdate(task);
  const issueText = issueFromTask(task, task.updates ?? []);
  const daysSinceUpdate = latestUpdate ? diffDays(TODAY, latestUpdate.date) : null;

  return {
    allSubtasksDone,
    daysSinceUpdate,
    due,
    hasLinks,
    issueText,
    latestUpdate,
    nextSubtask,
    progress,
    task
  };
}

const nextActionPolicies = [
  {
    id: "archived",
    when: ({ task }) => task.archived,
    message: () => "보관된 업무입니다. 다시 이어가야 하면 복원 후 업데이트를 남겨주세요."
  },
  {
    id: "done-without-links",
    when: ({ hasLinks, task }) => task.status === "완료" && !hasLinks,
    message: () => "완료 근거를 나중에 찾기 쉽도록 관련 링크를 추가해두세요."
  },
  {
    id: "done",
    when: ({ task }) => task.status === "완료",
    message: () => "완료된 업무입니다. 메인에서 계속 볼 필요가 없으면 보관 처리하세요."
  },
  {
    id: "hold-with-issue",
    when: ({ issueText, task }) => task.status === "보류" && issueText,
    message: () => "보류 사유가 남아 있습니다. 재개 조건이나 확인 담당자를 업데이트해 주세요."
  },
  {
    id: "hold",
    when: ({ task }) => task.status === "보류",
    message: () => "보류 사유와 다시 시작할 조건을 업데이트 로그에 남겨주세요."
  },
  {
    id: "review-without-links",
    when: ({ hasLinks, task }) => task.status === "검토/대기" && !hasLinks,
    message: () => "검토자가 바로 볼 수 있도록 관련 자료 링크를 먼저 추가해 주세요."
  },
  {
    id: "review-without-update",
    when: ({ latestUpdate, task }) => task.status === "검토/대기" && !latestUpdate,
    message: () => "검토 요청 내용을 업데이트 로그에 짧게 남겨주세요."
  },
  {
    id: "review",
    when: ({ task }) => task.status === "검토/대기",
    message: () => "검토 의견이 오면 요청사항을 업데이트 로그에 이어서 남겨주세요."
  },
  {
    id: "overdue-with-subtask",
    when: ({ due, nextSubtask }) => due < 0 && nextSubtask,
    message: ({ nextSubtask }) => `지연된 업무입니다. 먼저 "${nextSubtask.title}" 진행 여부를 정리해 주세요.`
  },
  {
    id: "overdue-without-today-update",
    when: ({ due, latestUpdate }) => due < 0 && (!latestUpdate || latestUpdate.date !== TODAY),
    message: () => "지연 사유와 새 일정 기준을 업데이트 로그에 남겨주세요."
  },
  {
    id: "overdue",
    when: ({ due }) => due < 0,
    message: () => "오늘 남긴 지연 내용을 기준으로 일정 조정이 필요한지 확인해 주세요."
  },
  {
    id: "due-today-with-subtask",
    when: ({ due, nextSubtask }) => due === 0 && nextSubtask,
    message: ({ nextSubtask }) => `오늘 마감입니다. "${nextSubtask.title}"부터 확인해 주세요.`
  },
  {
    id: "due-today-without-links",
    when: ({ due, hasLinks }) => due === 0 && !hasLinks,
    message: () => "오늘 마감 전에 참고 자료 링크를 추가하고 상태를 정리해 주세요."
  },
  {
    id: "due-today",
    when: ({ due }) => due === 0,
    message: () => "오늘 마감 업무입니다. 남은 이슈가 있으면 업데이트 로그에 바로 남겨주세요."
  },
  {
    id: "planned-future",
    when: ({ task }) => task.status === "계획" && diffDays(task.startDate, TODAY) > 0,
    message: () => "시작 전 필요한 자료와 태그가 맞는지 확인해 주세요."
  },
  {
    id: "planned-with-subtask",
    when: ({ nextSubtask, task }) => task.status === "계획" && nextSubtask,
    message: ({ nextSubtask }) => `첫 상세 업무인 "${nextSubtask.title}"부터 시작해 주세요.`
  },
  {
    id: "planned",
    when: ({ task }) => task.status === "계획",
    message: () => "상세 업무 내용을 나눠두면 체크한 항목 기준으로 진행률을 더 정확히 볼 수 있습니다."
  },
  {
    id: "all-subtasks-done",
    when: ({ allSubtasksDone, task }) => allSubtasksDone && task.status !== "완료",
    message: () => "상세 업무 내용이 모두 끝났습니다. 상태를 완료 또는 검토/대기로 정리해 주세요."
  },
  {
    id: "early-progress-with-subtask",
    when: ({ nextSubtask, progress }) => progress < 50 && nextSubtask,
    message: ({ nextSubtask }) => `다음 상세 업무는 "${nextSubtask.title}"입니다. 진행 후 체크해 주세요.`
  },
  {
    id: "early-progress-without-links",
    when: ({ hasLinks, progress }) => progress < 50 && !hasLinks,
    message: () => "관련 자료 링크를 추가하고 현재 진행 내용을 업데이트해 주세요."
  },
  {
    id: "early-progress",
    when: ({ progress }) => progress < 50,
    message: () => "현재 진행 내용을 업데이트 로그에 짧게 남겨주세요."
  },
  {
    id: "without-links",
    when: ({ hasLinks }) => !hasLinks,
    message: () => "관련 자료 링크를 추가해 팀원이 맥락을 바로 확인할 수 있게 해주세요."
  },
  {
    id: "stale-update",
    when: ({ daysSinceUpdate }) => daysSinceUpdate !== null && daysSinceUpdate >= 3,
    message: () => "최근 업데이트가 뜸합니다. 현재 진행상황을 한 줄로 남겨주세요."
  },
  {
    id: "with-next-subtask",
    when: ({ nextSubtask }) => nextSubtask,
    message: ({ nextSubtask }) => `다음으로 "${nextSubtask.title}"을 확인해 주세요.`
  },
  {
    id: "fallback",
    when: () => true,
    message: () => "남은 확인사항을 업데이트 로그에 남기고 상태를 정리해 주세요."
  }
];

function nextActionForTask(task) {
  const context = nextActionContext(task);
  return nextActionPolicies.find((policy) => policy.when(context))?.message(context) ?? nextActionPolicies.at(-1).message(context);
}

function reportStatusLabel(task) {
  return statusStickerLabels[task.status] ?? task.status;
}

function reportStatusMeta(task) {
  const status = reportStatusLabel(task);
  const meta = {
    "✅ 완료": { icon: "", tone: "done" },
    "⚙️ 진행": { icon: "", tone: "active" },
    "📝 계획": { icon: "", tone: "plan" },
    "⏳ 검토": { icon: "", tone: "review" },
    "⏸ 보류": { icon: "", tone: "hold" }
  };
  return { label: status, ...(meta[status] ?? { icon: "•", tone: "default" }) };
}

function reportLineDate(task, mode) {
  if (["완료", "보류"].includes(task.status)) return reportDateLabel(effectiveReportDate(task), mode);
  return "";
}

function performanceItemDateLabel(item, mode) {
  if (!item?.tasks?.length) return "";
  const dates = itemReportDates(item);
  if ((item.workstreamLabel || item.tasks.length > 1) && dates.length > 1) {
    return `${reportDateLabel(dates[0], mode)}~${reportDateLabel(dates.at(-1), mode)}`;
  }
  const task = item.task;
  return reportLineDate({ ...task, status: item.status }, mode);
}

function reportDetailMeta(label) {
  const meta = {
    완료: { icon: "✓", tone: "done" },
    계획: { icon: "+", tone: "plan" },
    내용: { icon: "✎", tone: "note" },
    진행: { icon: "↗", tone: "active" }
  };
  return meta[label] ?? { icon: "✎", tone: "note" };
}

function reportDetailRows(task, rangeUpdates, mode, options = {}) {
  const doneSubtasks = (task.subtasks ?? []).filter((subtask) => subtask.done).map((subtask) => subtask.title);
  const plannedSubtasks = (task.subtasks ?? []).filter((subtask) => !subtask.done && subtask.title?.trim()).map((subtask) => subtask.title);
  const showLongDetails = Boolean(options.showLongDetails);
  const rows = [];
  if (doneSubtasks.length) rows.push({ label: "완료", text: doneSubtasks.join(", ") });
  if (plannedSubtasks.length) rows.push({ label: "계획", text: plannedSubtasks.join(", ") });
  if (mode !== "week" && !showLongDetails) return rows;
  if ((mode === "week" ? !rows.length : showLongDetails) && task.description) {
    rows.push({ label: "내용", text: task.description });
  }
  return rows;
}

function mergedStatus(tasks) {
  const statusesInGroup = tasks.map((task) => task.status);
  if (statusesInGroup.every((status) => status === "완료")) return "완료";
  if (statusesInGroup.includes("진행중")) return "진행중";
  if (statusesInGroup.includes("검토/대기")) return "검토/대기";
  if (statusesInGroup.includes("계획")) return "계획";
  if (statusesInGroup.includes("보류")) return "보류";
  return statusesInGroup[0] ?? "계획";
}

function mergeReportRows(rowGroups) {
  const order = ["완료", "계획", "내용", "진행"];
  return order
    .map((label) => {
      const values = normalizeTags(rowGroups.filter((row) => row.label === label).flatMap((row) => row.text.split(",").map((item) => item.trim())));
      return values.length ? { label, text: values.join(", ") } : null;
    })
    .filter(Boolean);
}

function workstreamTaskSummary(item) {
  if (!item?.workstreamTaskCount || item.workstreamTaskCount <= 1) return "";
  const titles = Array.from(new Set(item.tasks.map((task) => displayTaskTitle(task))));
  const preview = titles.slice(0, 4).join(", ");
  const hiddenCount = Math.max(0, titles.length - 4);
  return hiddenCount ? `${preview} 외 ${hiddenCount}건` : preview;
}

function performanceItemHasSpot(item) {
  return item?.tasks?.some((task) => isSpotTask(task)) || isSpotTask(item?.task);
}

function performanceItemsForTasks(tasks, mode, range, options = {}) {
  if (mode === "week") return tasks.map((task) => ({ id: task.id, task, tasks: [task], title: task.title, status: task.status }));
  const workstreamGroups = groupTasksByWorkstream(tasks, collectWorkstreams(tasks));
  const items = workstreamGroups.map((group) => {
    const sorted = group.tasks.sort((a, b) => toDate(effectiveReportDate(a)) - toDate(effectiveReportDate(b)));
    const firstTask = sorted[0];
    const rows = mergeReportRows(
      sorted.flatMap((task) => reportDetailRows(task, updatesInRange(task, range), mode, options))
    );
    return {
      id: `workstream-${group.label}`,
      task: firstTask,
      tasks: sorted,
      title: group.label,
      status: mergedStatus(sorted),
      workstreamLabel: group.label,
      workstreamTaskCount: sorted.length,
      recurringLabel: sorted.every((task) => task.recurring) ? recurringRangeLabel(sorted) : "",
      detailRows: rows
    };
  });
  return items.sort((a, b) => toDate(effectiveReportDate(a.tasks[0])) - toDate(effectiveReportDate(b.tasks[0])));
}

function itemMonths(item) {
  return Array.from(new Set(item.tasks.map((task) => effectiveReportDate(task).slice(0, 7)))).sort();
}

function itemReportDates(item) {
  return Array.from(new Set(item.tasks.map((task) => effectiveReportDate(task)))).sort();
}

function monthGroupLabel(monthValue) {
  return `${Number(monthValue.slice(5, 7))}월`;
}

function weekOfMonthNumber(value) {
  return Math.max(1, Math.ceil(Number(value.slice(8, 10)) / 7));
}

function quarterNumberFromDate(value) {
  return Math.floor((Number(value.slice(5, 7)) - 1) / 3) + 1;
}

function reportPeriodGroup(item, mode) {
  if (mode === "month") {
    const weeks = Array.from(new Set(itemReportDates(item).map(weekOfMonthNumber))).sort((a, b) => a - b);
    const firstWeek = weeks[0] ?? 1;
    const lastWeek = weeks[weeks.length - 1] ?? firstWeek;
    if ((item.recurringLabel || item.workstreamLabel) && weeks.length > 1) {
      return { label: `${firstWeek}~${lastWeek}주차 ${item.recurringLabel ? "반복" : "흐름"}`, sortKey: firstWeek };
    }
    return { label: `${firstWeek}주차`, sortKey: firstWeek };
  }
  const months = itemMonths(item);
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1] ?? firstMonth;
  if (mode === "quarter") {
    if ((item.recurringLabel || item.workstreamLabel) && months.length > 1) {
      return {
        label: `${monthGroupLabel(firstMonth)}~${monthGroupLabel(lastMonth)} 흐름`,
        sortKey: Number(firstMonth.slice(5, 7))
      };
    }
    return { label: monthGroupLabel(firstMonth), sortKey: Number(firstMonth.slice(5, 7)) };
  }
  if (mode === "year") {
    const quarters = Array.from(new Set(months.map((month) => quarterNumberFromDate(`${month}-01`)))).sort((a, b) => a - b);
    const firstQuarter = quarters[0];
    const lastQuarter = quarters[quarters.length - 1] ?? firstQuarter;
    if ((item.recurringLabel || item.workstreamLabel) && quarters.length > 1) {
      return { label: `${firstQuarter}~${lastQuarter}분기 흐름`, sortKey: firstQuarter };
    }
    return { label: `${firstQuarter}분기`, sortKey: firstQuarter };
  }
  return { label: "", sortKey: 0 };
}

function groupPerformanceItems(items, mode) {
  if (!["month", "quarter", "year"].includes(mode)) return [{ label: "", items }];
  const groups = new Map();
  items.forEach((item) => {
    const group = reportPeriodGroup(item, mode);
    if (!groups.has(group.label)) groups.set(group.label, { ...group, items: [] });
    groups.get(group.label).items.push(item);
  });
  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey);
}

function performanceItemMarkdown(item, mode, range, options = {}) {
  const task = item.task;
  const rangeUpdates = item.tasks.flatMap((entry) => updatesInRange(entry, range));
  const issue = mode === "week" || options.showLongDetails ? issueFromTask(task, rangeUpdates) : "";
  const hideLongRangeDetails = ["quarter", "year"].includes(mode) && !options.showLongDetails;
  const detailRows = hideLongRangeDetails ? [] : (item.detailRows ?? reportDetailRows(task, rangeUpdates, mode, options));
  const statusMeta = reportStatusMeta({ ...task, status: item.status });
  const reportDate = performanceItemDateLabel(item, mode);
  const titleParts = [
    `[${statusMeta.label}]`,
    reportDate,
    item.title,
    performanceItemHasSpot(item) ? "⚡" : "",
    item.workstreamTaskCount > 1 ? `(묶인 업무: ${item.workstreamTaskCount}건)` : "",
    item.recurringLabel ? `(반복: ${item.recurringLabel})` : ""
  ].filter(Boolean);
  const lines = [`- ${titleParts.join(" ")}`];
  if (issue) lines.push(`  - ${task.status === "보류" ? "보류" : "이슈"}: ${issue}`);
  const sourceTaskSummary = workstreamTaskSummary(item);
  if (sourceTaskSummary) lines.push(`  - 포함 업무: ${sourceTaskSummary}`);
  detailRows.forEach((row) => lines.push(`  - ${row.label}: ${row.text}`));
  return lines.join("\n");
}

function performanceSourceLine(item, range) {
  return item.tasks
    .map((task) => {
      const updateIds = updatesInRange(task, range).map((update, index) => `${update.date}:${update.authorId}:${index + 1}`);
      const tagLabel = taskTags(task).join(", ");
      const workstreamLabel = taskWorkstreamLabel(task);
      const doneLabel = completionDate(task) ? ` / 완료 ${completionDate(task)}(${personName(task.completedBy || task.ownerId)})` : "";
      return `- ${task.id}: ${task.title} / 상위 업무흐름 ${workstreamLabel} / 담당 ${personName(task.ownerId)} / 상태 ${task.status} / 기간 ${task.startDate}~${task.dueDate}${doneLabel} / 태그 ${tagLabel}${updateIds.length ? ` / 로그 ${updateIds.join(", ")}` : ""}`;
    })
    .join("\n");
}

function taskInPerformanceRange(task, range) {
  if ((task.updates ?? []).some((update) => inPeriod(update.date, range))) return true;
  if (task.status === "완료") return inPeriod(completionDate(task) || task.dueDate, range);
  return (
    inPeriod(task.startDate, range) ||
    inPeriod(task.dueDate, range) ||
    (diffDays(task.startDate, range.start) < 0 && diffDays(task.dueDate, range.end) > 0)
  );
}

function taskIncludedInPerformanceMode(task, mode, showLongDetails) {
  if (["quarter", "year"].includes(mode) && isSpotTask(task) && !showLongDetails) return false;
  return true;
}

function performanceReportMarkdown(activePeople, mode, range, reportTitle, options = {}) {
  const lines = [`# ${reportTitle}`, "", `기간: ${range.label}`, ""];
  if (!activePeople.length) {
    lines.push("선택한 기간에 집계할 업무가 없습니다.");
    return lines.join("\n");
  }
  activePeople.forEach(({ owned, person }) => {
    lines.push(`## ${person.name}`);
    groupPerformanceItems(owned, mode).forEach((periodGroup) => {
      if (periodGroup.label) lines.push("", `### ${periodGroup.label}`);
      periodGroup.items.forEach((item) => lines.push(performanceItemMarkdown(item, mode, range, options)));
    });
    lines.push("");
  });
  if (options.includeSources) {
    lines.push("## 근거 업무");
    activePeople.forEach(({ owned, person }) => {
      lines.push(`### ${person.name}`);
      groupPerformanceItems(owned, mode).forEach((periodGroup) => {
        if (periodGroup.label) lines.push(`#### ${periodGroup.label}`);
        periodGroup.items.forEach((item) => lines.push(performanceSourceLine(item, range)));
      });
      lines.push("");
    });
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeTaskPostCategoryLabel(label) {
  const cleanLabel = String(label ?? "").trim();
  if (cleanLabel === "회의 메모") return "회의록";
  if (cleanLabel === "참고 URL") return "중요문서";
  return cleanLabel;
}

function normalizeTaskPostCategories(categories) {
  const inputCategories = Array.isArray(categories) ? categories : [];
  const migratedInput = inputCategories.map((category) => ({
    ...category,
    label: normalizeTaskPostCategoryLabel(category?.label)
  }));
  const inputByLabel = new Map(migratedInput.filter((category) => category.label).map((category) => [category.label, category]));
  const defaultLabels = new Set(defaultTaskPostCategories.map((category) => category.label));
  const source = [
    ...defaultTaskPostCategories.map((category) => ({
      ...category,
      ...(inputByLabel.get(category.label) ?? {}),
      label: category.label
    })),
    ...migratedInput.filter((category) => category.label && !defaultLabels.has(category.label))
  ];
  const seen = new Set();
  const seenIds = new Set();
  const normalized = source
    .map((category, index) => {
      const label = normalizeTaskPostCategoryLabel(category?.label);
      if (!label || seen.has(label)) return null;
      seen.add(label);
      const baseId = String(category?.id ?? label)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-") || `post-type-${index}`;
      const id = seenIds.has(baseId) ? `${baseId}-${index}` : baseId;
      seenIds.add(id);
      const tone = taskPostToneOptions.includes(category?.tone) ? category.tone : taskPostToneOptions[index % taskPostToneOptions.length];
      return {
        id,
        label,
        tone,
        active: category?.active !== false
      };
    })
    .filter(Boolean);
  return normalized.length ? normalized : defaultTaskPostCategories;
}

function taskPostCategoryMeta(scope, categories = defaultTaskPostCategories) {
  return normalizeTaskPostCategories(categories).find((category) => category.label === scope) ?? {
    id: "custom",
    label: scope || "기억할 점",
    tone: "slate",
    active: true
  };
}

function seedTaskKnowledgePosts(task) {
  if (!task || isDeletedTask(task)) return [];
  const workstream = taskWorkstreamLabel(task);
  const taskTitle = displayTaskTitle(task);
  const baseDate = task.updates?.[0]?.date || task.dueDate || TODAY;
  const ownerId = task.ownerId;
  const creatorId = task.creatorId || task.ownerId;
  return [
    {
      id: `${task.id}-decision`,
      scope: "결정사항",
      title: "보고서 흐름은 현안 먼저 정리",
      authorId: ownerId,
      date: baseDate,
      body: "다음 공유 전까지 외부자료 검증 근거와 내부 검토 의견을 분리해서 남겨두기로 했습니다.",
      taskId: task.id,
      taskTitle,
      ownerId,
      workstream,
      url: "https://intra.research-strategy.local/docs/monthly-kpi-evidence",
      attachment: {
        label: "근거자료 캡처",
        caption: "월간보고 근거표 이미지",
        ocrText: "월간 KPI 근거표: 지연 업무 2건, 완료 4건, 검토 대기 1건",
        visionSummary: "월간보고 근거표 캡처로, 상태별 업무 수와 보완 필요 항목이 정리되어 있습니다."
      }
    },
    {
      id: `${task.id}-memory`,
      scope: "기억할 점",
      title: "팀즈 게시글처럼 나중에 찾아보기",
      authorId: creatorId,
      date: baseDate,
      body: "업무 상세에는 이 업무 관련 글만 보이고, 업무흐름 피드에서는 같은 흐름의 글을 날짜순으로 모아봅니다. 회의록뿐 아니라 기억할 점, 중요문서, 판단 근거를 같이 남길 수 있습니다.",
      taskId: task.id,
      taskTitle,
      ownerId,
      workstream
    },
    {
      id: `${task.id}-risk`,
      scope: "리스크",
      title: "자료 출처 보강 필요",
      authorId: ownerId,
      date: baseDate,
      body: "수치가 바뀔 수 있는 근거는 링크와 함께 남겨두고, 최종 보고 전 한 번 더 확인합니다.",
      taskId: task.id,
      taskTitle: `${workstream} 관련 업무`,
      ownerId,
      workstream,
      url: "https://intra.research-strategy.local/reference/kpi-source"
    },
    {
      id: `${task.id}-reference`,
      scope: "중요문서",
      title: "원본 문서 보관",
      authorId: ownerId,
      date: baseDate,
      body: "나중에 다시 찾기 쉬우도록 중요 문서 위치와 확인 기준을 같이 남깁니다.",
      taskId: task.id,
      taskTitle,
      ownerId,
      workstream,
      url: "https://intra.research-strategy.local/drive/monthly-report"
    },
    {
      id: `${task.id}-followup`,
      scope: "다음 확인",
      title: "최종 공유 전 확인할 질문",
      authorId: creatorId,
      date: baseDate,
      body: "다음 확인 전 물어볼 질문과 담당자에게 다시 확인할 내용을 정리합니다.",
      taskId: task.id,
      taskTitle: `${workstream} 관련 업무`,
      ownerId,
      workstream
    }
  ];
}

function normalizePostAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") return null;
  const label = String(attachment.label ?? attachment.fileName ?? "").trim();
  const caption = String(attachment.caption ?? "").trim();
  const ocrText = String(attachment.ocrText ?? attachment.extractedText ?? attachment.text ?? "").trim();
  const visionSummary = String(attachment.visionSummary ?? attachment.summary ?? "").trim();
  const source = String(attachment.source ?? "").trim();
  const imageDataUrl = typeof attachment.imageDataUrl === "string" && attachment.imageDataUrl.startsWith("data:image/")
    ? attachment.imageDataUrl
    : "";
  const mimeType = String(attachment.mimeType ?? "").trim();
  const fileName = String(attachment.fileName ?? "").trim();
  if (!label && !caption && !ocrText && !visionSummary && !imageDataUrl) return null;
  return {
    ...(label ? { label } : {}),
    ...(caption ? { caption } : {}),
    ...(ocrText ? { ocrText } : {}),
    ...(visionSummary ? { visionSummary } : {}),
    ...(source ? { source } : {}),
    ...(imageDataUrl ? { imageDataUrl } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(fileName ? { fileName } : {})
  };
}

function buildPostAttachmentFromDraft(draft) {
  return normalizePostAttachment({
    label: draft?.attachmentLabel,
    caption: draft?.attachmentCaption,
    ocrText: draft?.attachmentText,
    visionSummary: draft?.attachmentSummary,
    source: draft?.attachmentSource || "manual",
    imageDataUrl: draft?.attachmentImageDataUrl,
    mimeType: draft?.attachmentMimeType,
    fileName: draft?.attachmentFileName
  });
}

function attachmentEvidenceText(attachment) {
  const normalized = normalizePostAttachment(attachment);
  if (!normalized) return "";
  return [normalized.visionSummary, normalized.ocrText].filter(Boolean).join("\n\n");
}

function normalizeTaskPosts(posts, task, categories = defaultTaskPostCategories) {
  if (!Array.isArray(posts)) return seedTaskKnowledgePosts(task);
  const workstream = taskWorkstreamLabel(task);
  const taskTitle = displayTaskTitle(task);
  return posts
    .map((post, index) => {
      const scope = normalizeTaskPostCategoryLabel(post?.scope) || normalizeTaskPostCategories(categories)[0]?.label || "기억할 점";
      return {
        id: post?.id || `${task.id}-post-${index}`,
        scope,
        title: String(post?.title ?? "").trim() || "제목 없음",
        authorId: post?.authorId || task.creatorId || task.ownerId,
        date: post?.date || TODAY,
        body: String(post?.body ?? "").trim(),
        taskId: task.id,
        taskTitle,
        ownerId: task.ownerId,
        workstream,
        url: String(post?.url ?? "").trim(),
        attachment: normalizePostAttachment(post?.attachment),
        createdAt: post?.createdAt || post?.date || TODAY,
        updatedAt: post?.updatedAt || ""
      };
    })
    .filter((post) => post.title || post.body);
}

function taskKnowledgePosts(task, categories = defaultTaskPostCategories) {
  if (!task || isDeletedTask(task)) return [];
  return normalizeTaskPosts(task.postItems, task, categories);
}

async function copyText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback below.
    }
  }
  if (!localDashboardStore.canUse()) return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function defaultAssignerType(personId) {
  if (permissionRole(personId) === "admin") return "기타";
  return personId === "lead" ? "팀장님" : "개인";
}

function isRecentAssignment(task) {
  if (!isISODate(task.createdAt)) return false;
  const daysFromRegistration = diffDays(task.createdAt, TODAY);
  return daysFromRegistration >= 0 && daysFromRegistration < 3;
}

function taskBadges(task) {
  const daysToStart = diffDays(task.startDate, TODAY);
  const daysToDue = diffDays(task.dueDate, TODAY);
  const badges = [];
  if (task.archived) badges.push({ label: "보관됨", tone: "slate" });
  if (isRecentAssignment(task)) badges.push({ label: "New", tone: "blue" });
  if (task.status === "계획" && daysToStart > 0) badges.push({ label: `D-${daysToStart} 시작`, tone: "slate" });
  if (daysToStart === 0) badges.push({ label: "오늘 시작", tone: "teal" });
  if (daysToDue === 0) badges.push({ label: "오늘 마감", tone: "amber" });
  if (daysToDue < 0 && task.status !== "완료") badges.push({ label: "지연", tone: "red" });
  if (daysToDue > 0 && daysToDue <= 3 && task.status !== "완료") badges.push({ label: "마감 임박", tone: "amber" });
  return badges;
}

function timelineRisk(task) {
  if (["완료", "보류"].includes(task.status) || task.archived) return null;
  const progress = taskProgress(task);
  const daysToStart = diffDays(task.startDate, TODAY);
  const daysToDue = diffDays(task.dueDate, TODAY);
  if (daysToDue < 0) {
    return { label: "지연", tone: "red", reason: "마감일이 지났지만 아직 완료되지 않았습니다." };
  }
  if (daysToDue === 0) {
    return { label: "오늘 마감", tone: "amber", reason: "오늘 마감 예정인 미완료 업무입니다." };
  }
  if (task.status === "계획" && daysToStart < 0) {
    return { label: "시작 지연", tone: "red", reason: "시작일이 지났지만 아직 계획 상태입니다." };
  }
  const totalDays = Math.max(1, diffDays(task.dueDate, task.startDate) + 1);
  const elapsedDays = Math.max(0, Math.min(totalDays, diffDays(TODAY, task.startDate) + 1));
  const expectedProgress = Math.round((elapsedDays / totalDays) * 100);
  if (elapsedDays > 0 && expectedProgress - progress >= 25) {
    return { label: "계획대비 지연", tone: "amber", reason: `기간 기준 예상 ${expectedProgress}% 대비 현재 ${progress}%입니다.` };
  }
  return null;
}

function tagTone(tag) {
  if (["전략과제", "임원보고", "투자검토", "KPI"].includes(tag)) return "strategy";
  if (["기획보고", "월간보고", "회의체"].includes(tag)) return "report";
  if (["자료조사", "시장동향", "외부자료", "정책"].includes(tag)) return "research";
  if (["탄소중립", "AI활용"].includes(tag)) return "future";
  return "neutral";
}

function createBlankTask(ownerId, creatorId = ownerId) {
  return {
    id: "",
    title: "",
    description: "",
    ownerId,
    assignerId: creatorId,
    assignerType: defaultAssignerType(creatorId),
    creatorId,
    status: "계획",
    priority: "보통",
    workKind: "standard",
    category: "",
    tags: ["기획보고"],
    workstream: "",
    startDate: TODAY,
    dueDate: TODAY,
    completedAt: "",
    completedBy: "",
    statusHistory: [],
    progress: 0,
    subtasks: [],
    archived: false,
    createdAt: TODAY,
    isNewAssignment: false,
    recurring: null,
    recurringDetail: "",
    recurringInterval: 1,
    recurringWeekdays: [weekdayOf(TODAY)],
    recurringStartDate: TODAY,
    recurringEndDate: "",
    recurringNoEnd: false,
    recurringDurationDays: 1,
    links: [],
    updates: []
  };
}

function archiveDemoTasks(selectedPersonId) {
  const teamOwnerIds = ["kmryu", "junho", "minji", "sugu05", "lead"];
  const ownerIds = [selectedPersonId, ...teamOwnerIds.filter((id) => id !== selectedPersonId)];
  const completedTitles = [
    ["전략과제 5월 회의록 정리", ["회의체", "전략과제"], "기획회의 회의록과 후속 액션을 보관했습니다."],
    ["임원보고 참고자료 패키징", ["임원보고", "외부자료"], "보고 참고자료 링크와 원본 위치를 정리했습니다."],
    ["월간 KPI 원본 시트 검수", ["KPI", "월간보고"], "월간 실적 원본 시트 검수 결과를 보관했습니다."],
    ["AI 활용사례 1차 조사본", ["AI활용", "자료조사"], "AI 업무 활용사례 1차 조사본을 완료 처리했습니다."],
    ["정책 동향 주간 브리핑 보관", ["정책", "외부자료"], "주간 정책 브리핑 자료를 보관했습니다."],
    ["탄소중립 투자자료 색인", ["탄소중립", "투자검토"], "투자 검토용 자료 색인을 완료했습니다."],
    ["운영회의 안건별 결정사항 정리", ["운영", "회의체"], "운영회의 결정사항과 담당자를 정리했습니다."],
    ["시장동향 메모 5월 합본", ["시장동향", "자료조사"], "시장동향 메모를 월 단위로 묶어 보관했습니다."],
    ["기획보고 문구 검수 체크", ["기획보고", "임원보고"], "기획보고 핵심 문구 검수 체크를 마쳤습니다."],
    ["외부 자문 결과 요약", ["외부자료", "전략과제"], "외부 자문 결과를 업무 참고용으로 요약했습니다."],
    ["상반기 운영지표 백업", ["운영", "KPI"], "운영지표 백업본 위치와 설명을 남겼습니다."],
    ["보고서 템플릿 개정 이력", ["월간보고", "운영"], "보고서 템플릿 개정 이력을 정리했습니다."]
  ];
  const heldTitles = [
    ["중장기 투자 후보군 비교", ["투자검토", "전략과제"], "외부 기준 변경 대기 중이라 보류 보관했습니다."],
    ["신규 정책과제 제안서 초안", ["정책", "기획보고"], "상위 계획 확정 전까지 재개 시점을 보류했습니다."],
    ["AI 도구 PoC 검토 메모", ["AI활용", "운영"], "도구 보안 검토가 끝나면 다시 진행할 예정입니다."],
    ["탄소중립 협력기관 후보 조사", ["탄소중립", "외부자료"], "협력 범위 재정의 전까지 보류했습니다."],
    ["임원보고 부록 데이터 확장", ["임원보고", "KPI"], "본 보고 범위에서 제외되어 보류 상태로 보관했습니다."],
    ["시장전망 민감도 분석", ["시장동향", "투자검토"], "가정값 재검토 전까지 진행을 멈췄습니다."],
    ["월간보고 자동화 항목 정의", ["월간보고", "운영"], "자동화 범위 승인 전까지 보류했습니다."],
    ["연구기획 교육자료 개편", ["운영", "자료조사"], "교육 일정 재조정 후 다시 진행할 업무입니다."]
  ];

  function makeDemoTask(item, index, status) {
    const ownerId = ownerIds[index % ownerIds.length];
    const isCompleted = status === "완료";
    const monthDay = String((index % 24) + 1).padStart(2, "0");
    const startDay = String(Math.max(1, Number(monthDay) - 4)).padStart(2, "0");
    const dueDate = `2026-05-${monthDay}`;
    const completedAt = isCompleted ? `2026-05-${String(Math.min(28, Number(monthDay) + 1)).padStart(2, "0")}` : "";
    return {
      id: `archive-demo-${isCompleted ? "done" : "hold"}-${index + 1}`,
      title: item[0],
      description: item[2],
      ownerId,
      assignerId: "lead",
      assignerType: "팀장님",
      creatorId: ownerId,
      status,
      priority: index % 4 === 0 ? "높음" : index % 3 === 0 ? "낮음" : "보통",
      category: item[1][0],
      tags: item[1],
      startDate: `2026-05-${startDay}`,
      dueDate,
      completedAt,
      completedBy: isCompleted ? ownerId : "",
      progress: isCompleted ? 100 : 45,
      subtasks: [
        { id: `archive-demo-${isCompleted ? "done" : "hold"}-${index + 1}-1`, title: "자료 위치 확인", done: true },
        { id: `archive-demo-${isCompleted ? "done" : "hold"}-${index + 1}-2`, title: isCompleted ? "완료 근거 정리" : "재개 조건 정리", done: isCompleted }
      ],
      archived: true,
      isNewAssignment: false,
      recurring: null,
      recurringDetail: "",
      recurringInterval: 1,
      recurringWeekdays: [weekdayOf(dueDate)],
      recurringStartDate: `2026-05-${startDay}`,
      recurringEndDate: "",
      recurringNoEnd: false,
      recurringDurationDays: 1,
      links: [],
      updates: [
        {
          authorId: ownerId,
          date: completedAt || dueDate,
          text: isCompleted ? "완료 후 보관함 데모 기록으로 추가했습니다." : "보류 후 재개 조건을 남기고 보관함 데모 기록으로 추가했습니다."
        }
      ],
      statusHistory: [
        {
          from: isCompleted ? "진행중" : "검토/대기",
          to: status,
          actorId: ownerId,
          date: completedAt || dueDate,
          note: isCompleted ? "완료 처리" : "보류 처리"
        }
      ]
    };
  }

  return [
    ...completedTitles.map((item, index) => makeDemoTask(item, index, "완료")),
    ...heldTitles.map((item, index) => makeDemoTask(item, index, "보류"))
  ];
}

function makeBriefingGroup(title, caption, icon, tone, tasks) {
  const dueLabels = tasks.map((task) => briefingDueLabel(task));
  const uniqueDueLabels = [...new Set(dueLabels.filter(Boolean))];
  const dueText = tasks.length <= 1 && uniqueDueLabels.length <= 1 ? uniqueDueLabels[0] ?? "" : "";
  return { key: title, title, caption, icon, tone, tasks, dueText };
}

function briefingDueLabel(task) {
  const due = diffDays(task.dueDate, TODAY);
  return due < 0 ? `D+${Math.abs(due)}` : due === 0 ? "오늘" : due ? `D-${due}` : "";
}

function briefingFor(tasks, personId) {
  const pool = tasks.filter((task) => !isDeletedTask(task) && !task.archived && (!personId || task.ownerId === personId) && task.status !== "완료");
  const used = new Set();
  const pick = (matcher, limit = 2) =>
    pool
      .filter((task) => !used.has(task.id) && matcher(task))
      .sort((a, b) => diffDays(a.dueDate, b.dueDate))
      .slice(0, limit)
      .map((task) => {
        used.add(task.id);
        return task;
      });
  const overdue = pick((task) => diffDays(task.dueDate, TODAY) < 0, 2);
  const dueToday = pick((task) => diffDays(task.dueDate, TODAY) === 0, 2);
  const startToday = pick((task) => diffDays(task.startDate, TODAY) === 0, 2);
  const newItems = pick((task) => isRecentAssignment(task), 2);
  const recurring = pick((task) => task.recurring && !task.isRecurringInstance, 2);
  const focus = pick((task) => ["진행중", "계획"].includes(task.status) && diffDays(task.startDate, TODAY) <= 0, 2);
  return [
    makeBriefingGroup("오늘 시작할 업무", "오늘이 시작일인 업무", "🚀", "blue", startToday),
    makeBriefingGroup("오늘 마감 업무", "오늘 마감인 업무", "⏰", "amber", dueToday),
    makeBriefingGroup("지연 업무", "마감일이 지난 업무", "⚠️", "red", overdue),
    makeBriefingGroup("새로 배정된 업무", "최근 3일 내 배정", "📌", "blue", newItems),
    makeBriefingGroup("이번 달 반복 업무", "매월 진행하는 업무", "🔁", "green", recurring),
    makeBriefingGroup("오늘 집중 업무", "중요도 높은 업무", "🎯", "teal", focus)
  ].filter((group) => group.tasks.length);
}

function latestTaskUpdateDate(task) {
  return (task.updates ?? [])
    .map((update) => update.date || update.createdAt)
    .filter(Boolean)
    .map((value) => String(value).slice(0, 10))
    .sort()
    .reverse()[0] || "";
}

function mergeRemoteInsightItems(items, tasks, remoteInsights) {
  if (!remoteInsights?.items?.length) return items;
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const remoteByKey = new Map(remoteInsights.items.map((item) => [item.key, item]));
  return items.map((item) => {
    const remoteItem = remoteByKey.get(item.key);
    if (!remoteItem) return item;
    const preview = (remoteItem.tasks ?? []).map((remoteTask) => {
      const localTask = taskMap.get(remoteTask.id);
      if (localTask) return localTask;
      return {
        id: remoteTask.id,
        title: remoteTask.title,
        ownerId: remoteTask.owner_roster_id ?? remoteTask.owner_id ?? "",
        status: remoteTask.status,
        priority: remoteTask.priority,
        dueDate: remoteTask.due_date,
        workstream: remoteTask.workstream ?? "",
        updates: []
      };
    });
    return {
      ...item,
      value: remoteItem.count ?? item.value,
      label: remoteItem.label || item.label,
      caption: remoteItem.caption || item.caption,
      preview
    };
  });
}

function dashboardSummary(tasks, activePage, selectedPersonId, remoteInsights = null) {
  const scoped = (activePage === "my" ? tasks.filter((task) => task.ownerId === selectedPersonId) : tasks).filter(
    (task) => !isDeletedTask(task) && !task.archived
  );
  const open = scoped.filter((task) => task.status !== "완료");
  const overdue = open.filter((task) => diffDays(task.dueDate, TODAY) < 0);
  const dueSoon = open.filter((task) => {
    const days = diffDays(task.dueDate, TODAY);
    return days >= 0 && days <= 3;
  });
  const stale = open.filter((task) => {
    const latestDate = latestTaskUpdateDate(task);
    return diffDays(task.startDate, TODAY) <= 0 && (!latestDate || diffDays(latestDate, TODAY) < -7);
  });
  const unclassified = open.filter((task) => !String(task.workstream ?? "").trim());
  const completed = scoped.filter((task) => task.status === "완료");
  const archived = (activePage === "my" ? tasks.filter((task) => task.ownerId === selectedPersonId) : tasks).filter(
    (task) => !isDeletedTask(task) && task.archived
  );
  const averageProgress = open.length
    ? Math.round(open.reduce((sum, task) => sum + taskProgress(task), 0) / open.length)
    : 100;

  return mergeRemoteInsightItems([
    {
      key: "open",
      label: activePage === "my" ? "내 진행 업무" : "팀 진행 업무",
      value: open.length,
      caption: open.length ? `평균 진행률 ${averageProgress}%` : `정상 · 평균 ${averageProgress}%`,
      actionLabel: activePage === "my" ? "내 업무 보기 →" : "진행 업무 보기 →",
      tone: "blue",
      icon: Activity,
      preview: open
    },
    {
      key: "soon",
      label: "3일 내 마감",
      value: dueSoon.length,
      caption: dueSoon.length ? "오늘 먼저 확인" : "마감 여유",
      actionLabel: "마감 업무 보기 →",
      tone: "amber",
      icon: TimerReset,
      preview: dueSoon
    },
    {
      key: "overdue",
      label: "지연 업무",
      value: overdue.length,
      caption: overdue.length ? "조정 필요" : "지연 없음",
      actionLabel: "지연 업무 보기 →",
      tone: "red",
      icon: AlertTriangle,
      preview: overdue
    },
    {
      key: "stale",
      label: "업데이트 정체",
      value: stale.length,
      caption: stale.length ? "7일 이상 새 로그 없음" : "최근 로그 양호",
      actionLabel: "정체 업무 보기 →",
      tone: "amber",
      icon: CircleAlert,
      preview: stale
    },
    {
      key: "unclassified",
      label: "흐름 미지정",
      value: unclassified.length,
      caption: unclassified.length ? "업무흐름 정리 필요" : "흐름 정리됨",
      actionLabel: "미지정 업무 보기 →",
      tone: "amber",
      icon: Database,
      preview: unclassified
    },
    {
      key: "completed",
      label: "완료 업무",
      value: completed.length,
      caption: archived.length ? `보관 ${archived.length}건 별도 관리` : "보관 전 검토 가능",
      actionLabel: "완료 업무 보기 →",
      tone: "green",
      icon: CheckCircle2,
      preview: completed
    }
  ], tasks, remoteInsights);
}

function App() {
  const persisted = useMemo(localDashboardStore.read, []);
  const persistedDisplayPreferences = useMemo(localDisplayPreferenceStore.read, []);
  const remoteDashboardStore = apiConfig.isConfigured ? apiDashboardStore : supabaseDashboardStore;
  const isApiReady = apiConfig.isConfigured;
  const isSupabaseReady = apiConfig.isConfigured || supabaseConfig.isConfigured;
  const backendLabel = isApiReady ? "FastAPI" : "Supabase";
  const importInputRef = useRef(null);
  const detailColumnRef = useRef(null);
  const initialPersistedTasks = useMemo(() => withSpotDemoTask(persistedArray(persisted.tasks, initialTasks)), [persisted]);
  const initialPersistedTags = useMemo(
    () => normalizeTags(persistedArray(persisted.availableTags, defaultAvailableTags)),
    [persisted]
  );
  const initialPersistedEvents = useMemo(
    () => persistedArray(persisted.calendarEvents, initialCalendarEvents),
    [persisted]
  );
  const initialMemoByPage = useMemo(() => initialMemoByPageFrom(persisted), [persisted]);
  const initialBriefingItems = useMemo(() => initialBriefingItemsFrom(persisted), [persisted]);
  const initialProfileOverrides = useMemo(() => persistedObject(persisted.profileOverrides), [persisted]);
  const initialTagGroups = useMemo(
    () => Array.isArray(persisted.tagGroups) && persisted.tagGroups.length ? persisted.tagGroups : defaultTagFilterPresets,
    [persisted]
  );
  const initialTaskPostCategories = useMemo(
    () => normalizeTaskPostCategories(persisted.taskPostCategories),
    [persisted]
  );
  const [tasks, setTasks] = useState(initialPersistedTasks);
  const [selectedPersonId, setSelectedPersonId] = useState(() => persistedPerson(persisted.selectedPersonId));
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSupabaseReady ? false : persisted.isAuthenticated === true);
  const [hasEnteredDashboard, setHasEnteredDashboard] = useState(false);
  const [authStatus, setAuthStatus] = useState(isSupabaseReady ? "checking" : "local");
  const [authMessage, setAuthMessage] = useState("");
  const [category, setCategory] = useState(() => persistedTag(persisted.category, initialPersistedTags, initialTagGroups));
  const [priorityFilter, setPriorityFilter] = useState(() => persistedOption(persisted.priorityFilter, priorityFilters, "전체"));
  const [workKindFilter, setWorkKindFilter] = useState(() => persistedOption(persisted.workKindFilter, workKindFilters, "전체"));
  const [ownerFilter, setOwnerFilter] = useState(() => persistedString(persisted.ownerFilter, "전체"));
  const [summaryFilter, setSummaryFilter] = useState("");
  const [remoteInsights, setRemoteInsights] = useState(null);
  const [query, setQuery] = useState("");
  const [activeView, setActiveView] = useState(() => persistedOption(persisted.activeView, viewOptions, "board"));
  const [activePage, setActivePage] = useState(() => persistedOption(persisted.activePage, pageOptions, "my"));
  const [displayDensity, setDisplayDensity] = useState(() => persistedOption(persistedDisplayPreferences.displayDensity ?? persisted.displayDensity, displayDensityOptions, "standard"));
  const [timelineMode, setTimelineMode] = useState(() => persistedOption(persisted.timelineMode, timelineModeOptions, "month"));
  const [timelineMonth, setTimelineMonth] = useState(() => persistedMonth(persisted.timelineMonth));
  const [timelineYear, setTimelineYear] = useState(() => persistedYear(persisted.timelineYear));
  const [calendarEvents, setCalendarEvents] = useState(initialPersistedEvents);
  const [availableTags, setAvailableTags] = useState(initialPersistedTags);
  const [tagGroups, setTagGroups] = useState(initialTagGroups);
  const [taskPostCategories, setTaskPostCategories] = useState(initialTaskPostCategories);
  const [selectedTaskId, setSelectedTaskId] = useState(() => persistedTaskId(persisted.selectedTaskId, initialPersistedTasks));
  const [selectedBriefingKey, setSelectedBriefingKey] = useState("");
  const [detailContext, setDetailContext] = useState("briefing");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [briefingFeedbackKey, setBriefingFeedbackKey] = useState("");
  const [teamMemberPulseId, setTeamMemberPulseId] = useState("");
  const [selectedTaskPulseId, setSelectedTaskPulseId] = useState("");
  const [statusPulseTaskId, setStatusPulseTaskId] = useState("");
  const [navIndicatorStyle, setNavIndicatorStyle] = useState({ height: "38px", top: "0px" });
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskMode, setEditingTaskMode] = useState("task");
  const [pendingRecurringSave, setPendingRecurringSave] = useState(null);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isTagLibraryOpen, setIsTagLibraryOpen] = useState(false);
  const [memoByPage, setMemoByPage] = useState(initialMemoByPage);
  const [briefingItems, setBriefingItems] = useState(initialBriefingItems);
  const [profileOverrides, setProfileOverrides] = useState(initialProfileOverrides);
  const briefingFeedbackTimerRef = useRef(null);
  const teamMemberPulseTimerRef = useRef(null);
  const selectedTaskPulseTimerRef = useRef(null);
  const statusPulseTimerRef = useRef(null);
  const navListRef = useRef(null);
  const navigationScrollRef = useRef({ page: activePage, view: activeView });
  const workflowSurfaceRef = useRef(null);
  const workflowDetailColumnRef = useRef(null);
  const tagLibraryRef = useRef(null);
  const supabaseHydratedRef = useRef(false);
  const supabaseWriteTimerRef = useRef(null);
  const syncNoticeTimerRef = useRef(null);
  const autoRecurringGenerationRef = useRef(new Set());
  const [syncNotice, setSyncNotice] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState(defaultAiAssistantPrompts[0]);
  const [assistantResult, setAssistantResult] = useState(null);
  const [assistantStatus, setAssistantStatus] = useState("idle");
  const [assistantError, setAssistantError] = useState("");
  const [wikiDraftTaskId, setWikiDraftTaskId] = useState("");
  const [wikiReviewDrafts, setWikiReviewDrafts] = useState([]);
  const [wikiReviewStatus, setWikiReviewStatus] = useState("idle");
  const [wikiReviewError, setWikiReviewError] = useState("");
  const [wikiRecommendations, setWikiRecommendations] = useState([]);
  const [wikiRecommendationStatus, setWikiRecommendationStatus] = useState("idle");
  const [wikiRecommendationError, setWikiRecommendationError] = useState("");

  const directory = useMemo(
    () => {
      const baseIds = new Set(people.map((person) => person.id));
      const base = people.map((person) => ({ ...person, ...(profileOverrides[person.id] ?? {}) }));
      const extras = Object.entries(profileOverrides)
        .filter(([id]) => !baseIds.has(id))
        .map(([id, profile]) => ({
          id,
          name: profile.name ?? "새 사용자",
          role: profile.role ?? "팀원",
          permissionRole: profile.permissionRole ?? "member",
          color: profile.color ?? "#2563eb",
          emoji: profile.emoji ?? "🌿",
          isTeamMember: profile.isTeamMember ?? true,
          isActive: profile.isActive ?? true,
          expectedEmail: profile.expectedEmail ?? "",
          authUserId: profile.authUserId ?? ""
        }));
      return [unassignedPerson, ...base, ...extras.filter((person) => person.id !== UNASSIGNED_OWNER_ID)];
    },
    [profileOverrides]
  );
  peopleDirectory = directory;
  const selectedPerson = directory.find((person) => person.id === selectedPersonId) ?? directory.find((person) => person.id === "kmryu");
  const isSelectedAdmin = selectedPerson?.permissionRole === "admin";
  const defaultTaskOwnerId = selectedPerson?.isTeamMember === false ? "lead" : selectedPersonId;
  const canManageTags = canManageTagsFor(selectedPersonId);
  const teamMembers = useMemo(() => displayTeamMembers(directory, selectedPersonId), [directory, selectedPersonId]);
  const selectedTagFilters = useMemo(() => readTagFilterValues(category, tagGroups), [category, tagGroups]);
  const ownerFilterOptions = useMemo(
    () => directory.filter((person) => person.id === UNASSIGNED_OWNER_ID || (person.isActive !== false && person.isTeamMember !== false)),
    [directory]
  );
  const workstreamOptions = useMemo(
    () => groupTasksByWorkstream(tasks, collectWorkstreams(tasks)).map((group) => ({ label: group.label })),
    [tasks]
  );
  const tagFilterLabel = selectedTagFilters.length ? `선택됨 ${selectedTagFilters.length}개` : "전체";
  const tagFilterTitle = selectedTagFilters.length ? tagFilterSummaryLabel(selectedTagFilters) : "전체 태그";
  const selectedTask = tasks.find((task) => task.id === selectedTaskId && !isDeletedTask(task)) ?? null;
  const todayAgenda = useMemo(
    () => todayAgendaFor(tasks, calendarEvents, selectedPersonId, activePage === "team"),
    [activePage, calendarEvents, selectedPersonId, tasks]
  );

  function applySupabaseSnapshot(snapshot, options = {}) {
    const preservePrototypeTasks = Boolean(options.preservePrototypeTasks);
    if (!snapshot) return;
    if (Array.isArray(snapshot.tasks) && (!preservePrototypeTasks || snapshot.tasks.length > 0)) {
      setTasks(snapshot.tasks);
    }
    if (Array.isArray(snapshot.availableTags) && snapshot.availableTags.length > 0) {
      setAvailableTags(normalizeTags(snapshot.availableTags));
    }
    if (Array.isArray(snapshot.tagGroups)) {
      setTagGroups(snapshot.tagGroups);
    }
    if (Array.isArray(snapshot.taskPostCategories) && snapshot.taskPostCategories.length) {
      setTaskPostCategories(normalizeTaskPostCategories(snapshot.taskPostCategories));
    }
    if (Array.isArray(snapshot.calendarEvents) && (!preservePrototypeTasks || snapshot.calendarEvents.length > 0)) {
      setCalendarEvents(snapshot.calendarEvents);
    }
    if (snapshot.memoByPage) {
      setMemoByPage((current) => ({ ...current, ...snapshot.memoByPage }));
    }
    if (Array.isArray(snapshot.briefingItems)) {
      setBriefingItems(snapshot.briefingItems.map(cleanBriefingItem).filter((item) => !item.deletedAt));
    }
    if (snapshot.profileOverrides) {
      setProfileOverrides((current) => ({ ...current, ...snapshot.profileOverrides }));
    }
    const snapshotProfile = snapshot.profileOverrides?.[snapshot.selectedPersonId];
    const shouldUseTeamPage = snapshotProfile?.permissionRole === "admin" && snapshotProfile?.isTeamMember === false;
    if (snapshot.selectedPersonId) setSelectedPersonId(snapshot.selectedPersonId);
    if (shouldUseTeamPage) {
      setActivePage("team");
    } else if (snapshot.activePage && pageOptions.includes(snapshot.activePage)) {
      setActivePage(snapshot.activePage);
    }
    if (snapshot.activeView && viewOptions.includes(snapshot.activeView)) setActiveView(snapshot.activeView);
    if (snapshot.displayDensity && displayDensityOptions.includes(snapshot.displayDensity)) setDisplayDensity(snapshot.displayDensity);
    if (snapshot.category) setCategory(snapshot.category);
    if (snapshot.ownerFilter) setOwnerFilter(snapshot.ownerFilter);
    if (snapshot.workKindFilter && workKindFilters.includes(snapshot.workKindFilter)) setWorkKindFilter(snapshot.workKindFilter);
    if (snapshot.timelineMode && timelineModeOptions.includes(snapshot.timelineMode)) setTimelineMode(snapshot.timelineMode);
    if (snapshot.timelineMonth) setTimelineMonth(snapshot.timelineMonth);
    if (snapshot.timelineYear) setTimelineYear(snapshot.timelineYear);
    if (snapshot.selectedTaskId) setSelectedTaskId(snapshot.selectedTaskId);
  }

  function showSyncNotice(message) {
    if (syncNoticeTimerRef.current) {
      window.clearTimeout(syncNoticeTimerRef.current);
    }
    setSyncNotice(message);
    syncNoticeTimerRef.current = window.setTimeout(() => {
      setSyncNotice("");
      syncNoticeTimerRef.current = null;
    }, 3600);
  }

  function handleSupabaseWriteResult(result, skippedMessage) {
    if (result?.skipped && skippedMessage) {
      showSyncNotice(skippedMessage);
    }
  }

  function persistTaskToSupabase(task, previousLocalId = task.id) {
    if (!isSupabaseReady || !isAuthenticated) return;
    remoteDashboardStore.tasks.save(task)
      .then((result) => {
        handleSupabaseWriteResult(result, "아직 실제 계정과 연결되지 않은 샘플 업무라 로컬에만 저장됐습니다.");
        if (!result?.id || result.id === previousLocalId) return;
        setTasks((current) =>
          current.map((item) =>
            item.id === previousLocalId
              ? {
                  ...item,
                  id: result.id
                }
              : item
          )
        );
        setSelectedTaskId((current) => (current === previousLocalId ? result.id : current));
      })
      .catch((error) => {
        console.warn("Supabase 업무 저장에 실패했습니다.", error);
        showSyncNotice("업무 저장을 Supabase에 반영하지 못했습니다. 화면에는 임시로 유지됩니다.");
      });
  }

  function saveTaskPost(taskId, draft) {
    const title = String(draft?.title ?? "").trim();
    const body = String(draft?.body ?? "").trim();
    if (!title || !body) {
      showSyncNotice("게시글 제목과 본문을 입력해 주세요.");
      return false;
    }
    const scope = String(draft?.scope ?? "").trim() || taskPostCategories.find((category) => category.active)?.label || "기억할 점";
    const attachment = buildPostAttachmentFromDraft(draft) || normalizePostAttachment(draft?.attachment);
    const nowId = Date.now().toString(36);
    let savedPost = null;
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const currentPosts = taskKnowledgePosts(task, taskPostCategories);
        const existingPost = currentPosts.find((post) => post.id === draft.id);
        savedPost = {
          ...(existingPost ?? {}),
          id: draft.id || `post-${taskId}-${nowId}`,
          scope,
          title,
          body,
          url: String(draft.url ?? "").trim(),
          attachment,
          authorId: existingPost?.authorId || selectedPersonId,
          date: existingPost?.date || TODAY,
          createdAt: existingPost?.createdAt || TODAY,
          updatedAt: existingPost ? TODAY : ""
        };
        const nextPosts = existingPost
          ? currentPosts.map((post) => (post.id === existingPost.id ? savedPost : post))
          : [savedPost, ...currentPosts];
        return { ...task, postItems: nextPosts };
      })
    );
    if (isSupabaseReady && isAuthenticated && savedPost) {
      remoteDashboardStore.tasks.savePost(taskId, savedPost)
        .then((result) => {
          handleSupabaseWriteResult(result, "업무 노트 공유 저장은 020_task_posts 마이그레이션 적용 후 사용할 수 있습니다.");
          if (!result?.id || result.id === savedPost.id) return;
          setTasks((current) =>
            current.map((task) => {
              if (task.id !== taskId || !Array.isArray(task.postItems)) return task;
              return {
                ...task,
                postItems: task.postItems.map((post) => (post.id === savedPost.id ? { ...post, id: result.id } : post))
              };
            })
          );
        })
        .catch((error) => {
          console.warn("Supabase 업무 노트 저장에 실패했습니다.", error);
          showSyncNotice("업무 노트 저장을 Supabase에 반영하지 못했습니다. 화면에는 임시로 유지됩니다.");
        });
    }
    showSyncNotice("게시글을 저장했습니다.");
    return Boolean(savedPost);
  }

  function deleteTaskPost(taskId, postId) {
    if (!postId) return;
    const confirmed = window.confirm("이 게시글을 삭제할까요?");
    if (!confirmed) return;
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          postItems: taskKnowledgePosts(task, taskPostCategories).filter((post) => post.id !== postId)
        };
      })
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.deletePost(postId)
        .then((result) => {
          handleSupabaseWriteResult(result, "업무 노트 공유 삭제는 020_task_posts 마이그레이션 적용 후 사용할 수 있습니다.");
        })
        .catch((error) => {
          console.warn("Supabase 업무 노트 삭제에 실패했습니다.", error);
          showSyncNotice("업무 노트 삭제를 Supabase에 반영하지 못했습니다. 화면에서는 삭제됐습니다.");
        });
    }
    showSyncNotice("게시글을 삭제했습니다.");
  }

  function saveTaskPostCategory(category) {
    if (!isSelectedAdmin) return;
    const cleanLabel = String(category?.label ?? "").trim();
    if (!cleanLabel) return;
    const cleanId = category.id || `post-type-${Date.now().toString(36)}`;
    const nextCategory = {
      id: cleanId,
      label: cleanLabel,
      tone: taskPostToneOptions.includes(category.tone) ? category.tone : "slate",
      active: category.active !== false
    };
    setTaskPostCategories((current) => {
      const normalized = normalizeTaskPostCategories(current);
      return normalized.some((item) => item.id === cleanId)
        ? normalized.map((item) => (item.id === cleanId ? nextCategory : item))
        : [...normalized, nextCategory];
    });
    if (category.previousLabel && category.previousLabel !== cleanLabel) {
      setTasks((current) =>
        current.map((task) => {
          if (!Array.isArray(task.postItems)) return task;
          return {
            ...task,
            postItems: task.postItems.map((post) =>
              post.scope === category.previousLabel ? { ...post, scope: cleanLabel } : post
            )
          };
        })
      );
    }
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.savePostCategory({ ...nextCategory, previousLabel: category.previousLabel })
        .then((result) => {
          handleSupabaseWriteResult(result, "게시글 유형 공유 저장은 020_task_posts 마이그레이션 적용 후 사용할 수 있습니다.");
        })
        .catch((error) => {
          console.warn("Supabase 게시글 유형 저장에 실패했습니다.", error);
          showSyncNotice("게시글 유형 저장을 Supabase에 반영하지 못했습니다. 화면에는 임시로 유지됩니다.");
        });
    }
    showSyncNotice("게시글 유형을 저장했습니다.");
  }

  function deleteTaskPostCategory(categoryId) {
    if (!isSelectedAdmin) return;
    const target = taskPostCategories.find((category) => category.id === categoryId);
    if (!target) return;
    const confirmed = window.confirm(`${target.label} 유형을 비활성화할까요? 기존 게시글은 유지됩니다.`);
    if (!confirmed) return;
    setTaskPostCategories((current) =>
      normalizeTaskPostCategories(current).map((category) =>
        category.id === categoryId ? { ...category, active: false } : category
      )
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.deactivatePostCategory(categoryId)
        .then((result) => {
          handleSupabaseWriteResult(result, "게시글 유형 공유 저장은 020_task_posts 마이그레이션 적용 후 사용할 수 있습니다.");
        })
        .catch((error) => {
          console.warn("Supabase 게시글 유형 비활성화에 실패했습니다.", error);
          showSyncNotice("게시글 유형 비활성화를 Supabase에 반영하지 못했습니다. 화면에는 임시로 유지됩니다.");
        });
    }
    showSyncNotice("게시글 유형을 비활성화했습니다.");
  }

  function addBriefingItem(scope, draft) {
    const cleanScope = scope === "team" ? "team" : "my";
    const kind = cleanScope === "team" ? "todo" : "inbox";
    const title = String(draft?.title ?? "").trim();
    const body = String(draft?.body ?? "").trim();
    if (!title && !body) {
      showSyncNotice(cleanScope === "team" ? "팀 체크 항목을 입력해 주세요." : "업무 인박스 제목이나 내용을 입력해 주세요.");
      return false;
    }
    const nextItem = cleanBriefingItem({
      id: `briefing-${cleanScope}-${Date.now().toString(36)}`,
      scope: cleanScope,
      kind,
      type: kind === "todo" ? "todo" : draft?.type,
      title: title || body.split("\n").find(Boolean)?.slice(0, 48),
      body,
      url: draft?.url,
      status: kind === "todo" ? "open" : draft?.status,
      done: false,
      ownerId: cleanScope === "my" ? selectedPersonId : "",
      authorId: selectedPersonId,
      createdAt: TODAY
    }, briefingItems.length);
    setBriefingItems((current) => [nextItem, ...current]);
    showSyncNotice(cleanScope === "team" ? "팀 체크 항목을 추가했습니다." : "업무 인박스에 저장했습니다.");
    return true;
  }

  function updateBriefingItem(itemId, patch) {
    if (!itemId) return;
    setBriefingItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? cleanBriefingItem({
              ...item,
              ...patch,
              updatedAt: TODAY
            }, 0)
          : item
      )
    );
  }

  function toggleBriefingTodo(itemId) {
    setBriefingItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const done = !item.done;
        return {
          ...item,
          done,
          status: done ? "done" : "open",
          updatedAt: TODAY
        };
      })
    );
  }

  function deleteBriefingItem(itemId) {
    const target = briefingItems.find((item) => item.id === itemId);
    if (!target) return false;
    const confirmed = window.confirm(target.kind === "todo" ? "이 팀 체크 항목을 삭제할까요?" : "이 업무 인박스 항목을 삭제할까요?");
    if (!confirmed) return false;
    setBriefingItems((current) => current.filter((item) => item.id !== itemId));
    showSyncNotice(target.kind === "todo" ? "팀 체크 항목을 삭제했습니다." : "업무 인박스 항목을 삭제했습니다.");
    return true;
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (isDeletedTask(task)) return false;
      const tags = taskTags(task);
      const byCategory = matchesTagFilter(tags, category, tagGroups);
      const text = `${task.title} ${task.description} ${tags.join(" ")}`.toLowerCase();
      const byScope = activePage === "team" || task.ownerId === selectedPersonId;
      const byArchive = activeView === "archive" ? task.archived : !task.archived;
      const byPriority = !workflowFilterViews.includes(activeView) || priorityFilter === "전체" || task.priority === priorityFilter;
      const byWorkKind = !workflowFilterViews.includes(activeView) || workKindFilter === "전체" || isSpotTask(task);
      const byOwner = !workflowFilterViews.includes(activeView) || ownerFilter === "전체" || task.ownerId === ownerFilter;
      const bySummary = activeView !== "board" || summaryFilterMatches(task, summaryFilter, TODAY);
      return byScope && byCategory && byArchive && byPriority && byWorkKind && byOwner && bySummary && text.includes(query.trim().toLowerCase());
    });
  }, [activePage, activeView, category, ownerFilter, priorityFilter, query, selectedPersonId, summaryFilter, tagGroups, tasks, workKindFilter]);

  const mindmapTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (isDeletedTask(task)) return false;
      const tags = taskTags(task);
      const byCategory = matchesTagFilter(tags, category, tagGroups);
      const text = `${task.title} ${task.description} ${tags.join(" ")}`.toLowerCase();
      const byScope = activePage === "team" || task.ownerId === selectedPersonId;
      const byPriority = priorityFilter === "전체" || task.priority === priorityFilter;
      const byWorkKind = workKindFilter === "전체" || isSpotTask(task);
      const byOwner = ownerFilter === "전체" || task.ownerId === ownerFilter;
      return byScope && byCategory && byPriority && byWorkKind && byOwner && text.includes(query.trim().toLowerCase());
    });
  }, [activePage, category, ownerFilter, priorityFilter, query, selectedPersonId, tagGroups, tasks, workKindFilter]);

  const briefing = useMemo(
    () => briefingFor(tasks, activePage === "my" ? selectedPersonId : null),
    [activePage, tasks, selectedPersonId]
  );
  const selectedBriefingGroup = briefing.find((group) => group.key === selectedBriefingKey);
  const dashboardInsightRefreshKey = useMemo(
    () => tasks.map((task) => [
      task.id,
      task.status,
      task.dueDate,
      task.startDate,
      task.workstream,
      task.progress,
      task.archived ? "archived" : "active",
      task.updates?.length ?? 0
    ].join(":")).join("|"),
    [tasks]
  );
  const summary = useMemo(
    () => dashboardSummary(tasks, activePage, selectedPersonId, remoteInsights),
    [activePage, remoteInsights, selectedPersonId, tasks]
  );

  const counts = statuses.reduce((acc, status) => {
    acc[status] = filteredTasks.filter((task) => task.status === status).length;
    return acc;
  }, {});
  const archiveCount = tasks.filter(
    (task) => !isDeletedTask(task) && task.archived && (activePage === "team" || task.ownerId === selectedPersonId)
  ).length;
  const recurringCount = tasks.filter(
    (task) => !isDeletedTask(task) && task.recurring && !task.isRecurringInstance && !task.archived && (activePage === "team" || task.ownerId === selectedPersonId)
  ).length;

  useEffect(() => {
    localDisplayPreferenceStore.write({ displayDensity });
  }, [displayDensity]);

  useEffect(() => {
    if (ownerFilter === "전체") return;
    if (ownerFilterOptions.some((person) => person.id === ownerFilter)) return;
    setOwnerFilter("전체");
  }, [ownerFilter, ownerFilterOptions]);

  useEffect(() => {
    if (!isApiReady || authStatus !== "signed-in" || !isAuthenticated || !remoteDashboardStore.dashboard?.insights) {
      setRemoteInsights(null);
      return undefined;
    }
    let cancelled = false;
    const scope = activePage === "my" ? "mine" : "team";
    const ownerId = scope === "mine" && isUuidLike(selectedPersonId) ? selectedPersonId : "";
    remoteDashboardStore.dashboard.insights({ scope, ownerId, today: TODAY })
      .then((insights) => {
        if (!cancelled) setRemoteInsights(insights);
      })
      .catch((error) => {
        console.warn("DB 대시보드 인사이트를 불러오지 못했습니다.", error);
        if (!cancelled) setRemoteInsights(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activePage, authStatus, dashboardInsightRefreshKey, isApiReady, isAuthenticated, selectedPersonId]);

  useEffect(() => {
    if (isSupabaseReady) return;
    const nextState = {
      version: 1,
      tasks,
      availableTags,
      tagGroups,
      taskPostCategories,
      calendarEvents,
      isAuthenticated,
      selectedPersonId,
      activePage,
      activeView,
      category,
      ownerFilter,
      priorityFilter,
      workKindFilter,
      displayDensity,
      timelineMode,
      timelineMonth,
      timelineYear,
      selectedTaskId,
      memoByPage,
      briefingItems,
      profileOverrides
    };
    localDashboardStore.write(nextState);
  }, [
    activePage,
    activeView,
    availableTags,
    tagGroups,
    taskPostCategories,
    calendarEvents,
    category,
    displayDensity,
    isAuthenticated,
    selectedPersonId,
    selectedTaskId,
    profileOverrides,
    ownerFilter,
    priorityFilter,
    workKindFilter,
    memoByPage,
    briefingItems,
    tasks,
    isSupabaseReady,
    timelineMode,
    timelineMonth,
    timelineYear
  ]);

  useEffect(() => {
    if (!isSupabaseReady) return undefined;
    let cancelled = false;
    setAuthStatus("checking");
    remoteDashboardStore.read()
      .then((snapshot) => {
        if (cancelled) return;
        if (!snapshot?.isAuthenticated) {
          setIsAuthenticated(false);
          setAuthStatus("signed-out");
          return;
        }
        applySupabaseSnapshot(snapshot, { preservePrototypeTasks: true });
        setProfileOverrides((current) => ({
          ...current,
          ...snapshot.profileOverrides
        }));
        setIsAuthenticated(true);
        setAuthStatus("signed-in");
        supabaseHydratedRef.current = true;
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("Supabase 세션 확인에 실패했습니다.", error);
        setIsAuthenticated(false);
        setAuthStatus("signed-out");
        setAuthMessage("Supabase 세션을 확인하지 못했습니다. 다시 로그인해 주세요.");
      });
    return () => {
      cancelled = true;
    };
  }, [isSupabaseReady]);

  useEffect(() => () => {
    if (supabaseWriteTimerRef.current) {
      window.clearTimeout(supabaseWriteTimerRef.current);
    }
  }, []);

  useEffect(() => () => {
    if (syncNoticeTimerRef.current) {
      window.clearTimeout(syncNoticeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseReady || !isAuthenticated || authStatus !== "signed-in" || !supabaseHydratedRef.current) return undefined;
    if (supabaseWriteTimerRef.current) {
      window.clearTimeout(supabaseWriteTimerRef.current);
    }
    const nextState = {
      activePage,
      activeView,
      category,
      displayDensity,
      timelineMode,
      timelineMonth,
      timelineYear,
      selectedTaskId,
      memoByPage,
      briefingItems
    };
    supabaseWriteTimerRef.current = window.setTimeout(() => {
      remoteDashboardStore.write(nextState).catch((error) => {
        console.warn("Supabase 선호값 저장에 실패했습니다.", error);
      });
    }, 450);
    return () => {
      if (supabaseWriteTimerRef.current) {
        window.clearTimeout(supabaseWriteTimerRef.current);
      }
    };
  }, [
    activePage,
    activeView,
    authStatus,
    category,
    displayDensity,
    isAuthenticated,
    isSupabaseReady,
    briefingItems,
    memoByPage,
    selectedTaskId,
    timelineMode,
    timelineMonth,
    timelineYear
  ]);

  useEffect(() => {
    document.body.dataset.page = activePage;
    document.body.dataset.view = activeView;
    return () => {
      delete document.body.dataset.page;
      delete document.body.dataset.view;
    };
  }, [activePage, activeView]);

  useEffect(() => {
    if (activeView === "admin" && !isSelectedAdmin) {
      setActiveView("board");
    }
  }, [activeView, isSelectedAdmin]);

  useEffect(() => {
    if (activeView !== "admin" || !isSelectedAdmin) return;
    loadWikiReviewDrafts();
    loadWikiRecommendations();
  }, [activeView, authStatus, isApiReady, isAuthenticated, isSelectedAdmin]);

  useEffect(() => {
    const previous = navigationScrollRef.current;
    const changedPage = previous.page !== activePage;
    const enteredFullPage = fullPageViews.includes(activeView) && previous.view !== activeView;
    if (changedPage || enteredFullPage) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    navigationScrollRef.current = { page: activePage, view: activeView };
  }, [activePage, activeView]);

  useEffect(() => () => {
    if (briefingFeedbackTimerRef.current) {
      window.clearTimeout(briefingFeedbackTimerRef.current);
    }
  }, []);

  useEffect(() => () => {
    if (teamMemberPulseTimerRef.current) {
      window.clearTimeout(teamMemberPulseTimerRef.current);
    }
  }, []);

  useEffect(() => () => {
    if (selectedTaskPulseTimerRef.current) {
      window.clearTimeout(selectedTaskPulseTimerRef.current);
    }
    if (statusPulseTimerRef.current) {
      window.clearTimeout(statusPulseTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (selectedTaskId && tasks.some((task) => task.id === selectedTaskId && !isDeletedTask(task))) return;
    setSelectedTaskId(tasks.find((task) => !isDeletedTask(task) && !task.archived)?.id ?? tasks.find((task) => !isDeletedTask(task))?.id ?? "");
  }, [selectedTaskId, tasks]);

  useEffect(() => {
    if (!isAuthenticated || authStatus === "checking") return;
    const generated = [];
    const nextKeys = new Set(autoRecurringGenerationRef.current);
    tasks.forEach((task) => {
      if (!task.recurring || task.archived || task.isRecurringInstance || isDeletedTask(task)) return;
      const dueDates = recurringDueDates(task, { count: 8, afterDate: task.dueDate });
      dueDates.forEach((dueDate) => {
        const occurrence = occurrenceFromDueDate(task, dueDate);
        const key = `${task.id}:${dueDate}`;
        const alreadySaved = tasks.some((item) =>
          item.recurringTemplateId === task.id &&
          item.dueDate === dueDate &&
          !isDeletedTask(item)
        );
        if (alreadySaved || nextKeys.has(key) || diffDays(occurrence.startDate, TODAY) > 0) return;
        nextKeys.add(key);
        generated.push(buildMaterializedRecurringTask(task, occurrence, {
          id: `t-${Date.now()}-${generated.length}-${dueDate.replaceAll("-", "")}`,
          actorId: selectedPersonId,
          note: `${formatDate(occurrence.startDate)} 회차를 자동 생성`
        }));
      });
    });
    if (!generated.length) {
      autoRecurringGenerationRef.current = nextKeys;
      return;
    }
    autoRecurringGenerationRef.current = nextKeys;
    setTasks((current) => [...generated, ...current]);
    generated.forEach((task) => persistTaskToSupabase({ ...task, peopleDirectory: directory }, task.id));
    showSyncNotice(`시작일이 도래한 반복 회차 ${generated.length}건을 개별 업무로 만들었습니다.`);
  }, [authStatus, directory, isAuthenticated, selectedPersonId, tasks]);

  function saveTask(task, options = {}) {
    const isNew = !task.id;
    const previousTask = isNew ? null : tasks.find((item) => item.id === task.id);
    const isRecurringRuleEdit = Boolean(task.recurring || previousTask?.recurring) && !task.recurringTemplateId;
    const shouldChooseRecurringScope = !isNew && isRecurringRuleEdit && !options.recurringScope;
    if (shouldChooseRecurringScope) {
      setPendingRecurringSave({ task });
      return;
    }
    const recurringScope = options.recurringScope ?? "all";
    const nextTags = normalizeTags(task.tags).length ? normalizeTags(task.tags) : ["운영"];
    const nextSubtasks = (task.subtasks ?? [])
      .map((subtask, index) => ({
        id: subtask.id || `st-${Date.now()}-${index}`,
        title: subtask.title.trim(),
        done: Boolean(subtask.done)
      }))
      .filter((subtask) => subtask.title);
    const nextTask = {
      ...task,
      id: isNew ? `t-${Date.now()}` : task.id,
      createdAt: isNew ? TODAY : task.createdAt || TODAY,
      assignerType: task.assignerType || defaultAssignerType(task.ownerId),
      creatorId: task.creatorId || selectedPersonId,
      category: nextTags[0],
      workstream: taskWorkstreamLabel({ ...task, tags: nextTags }, workstreamOptions),
      archived: Boolean(task.archived),
      isNewAssignment: false,
      progress: nextSubtasks.length
        ? Math.round((nextSubtasks.filter((subtask) => subtask.done).length / nextSubtasks.length) * 100)
        : task.status === "완료" ? 100 : 0,
      subtasks: nextSubtasks,
      tags: nextTags,
      links: task.links.filter((link) => link.title || link.url),
      updates: task.updates.filter((update) => update.text),
      statusHistory: Array.isArray(task.statusHistory) ? task.statusHistory : [],
      completedAt: task.status === "완료" ? completionDate(task) : "",
      completedBy: task.status === "완료" ? task.completedBy || "" : ""
    };

    setAvailableTags((current) => normalizeTags([...current, ...nextTags]));
    setTasks((current) => {
      if (isNew) return [applyStatusTransition(nextTask, null, selectedPersonId), ...current];
      const scopedCurrent = recurringScope === "future"
        ? current.filter((item) => !(item.recurringTemplateId === nextTask.id && diffDays(item.startDate, TODAY) > 0))
        : current;
      return scopedCurrent.map((item) => {
        if (item.id !== nextTask.id) return item;
        const dueEntry = dueDateHistoryEntry(item.dueDate, nextTask.dueDate, selectedPersonId);
        const taskWithHistory = dueEntry
          ? { ...nextTask, statusHistory: [dueEntry, ...(nextTask.statusHistory ?? [])] }
          : nextTask;
        return applyStatusTransition(taskWithHistory, item, selectedPersonId);
      });
    });
    if (recurringScope === "future" && isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.deleteFutureInstances(nextTask.id, TODAY).catch((error) => {
        console.warn("Supabase 미래 반복 회차 정리에 실패했습니다.", error);
        showSyncNotice("미래 반복 회차 정리를 Supabase에 반영하지 못했습니다.");
      });
    }
    persistTaskToSupabase({ ...nextTask, peopleDirectory: directory }, nextTask.id);
    setSelectedBriefingKey("");
    setSelectedTaskId(nextTask.id);
    setEditingTask(null);
    setEditingTaskMode("task");
    setPendingRecurringSave(null);
  }

  function openTaskEditor(task, mode = "task") {
    setEditingTaskMode(mode);
    setEditingTask(task);
  }

  async function askAiAssistant(promptText = assistantPrompt) {
    const cleanPrompt = String(promptText ?? "").trim();
    if (!cleanPrompt || assistantStatus === "loading") return;
    setAssistantPrompt(cleanPrompt);
    setAssistantStatus("loading");
    setAssistantError("");

    const intent = classifyAssistantPrompt(cleanPrompt, { people: directory, today: TODAY });
    if (intent.kind === "task-draft") {
      setAssistantResult(buildLocalAssistantReply({ prompt: cleanPrompt, tasks, people: directory, today: TODAY }));
      setAssistantStatus("idle");
      return;
    }

    const canReadFromApi = isApiReady && isAuthenticated && authStatus === "signed-in" && remoteDashboardStore.ai?.readEvidence;
    if (canReadFromApi) {
      try {
        const evidence = await remoteDashboardStore.ai.readEvidence(intent);
        setAssistantResult({
          intent,
          evidence,
          answer: summarizeAssistantEvidence(evidence, intent),
          sources: []
        });
        setAssistantStatus("idle");
        return;
      } catch (error) {
        console.warn("AI 읽기 API 호출에 실패했습니다.", error);
        setAssistantError("FastAPI AI 읽기 API 호출에 실패해서 화면 데이터 기준으로 임시 답변했습니다.");
      }
    }

    setAssistantResult(buildLocalAssistantReply({ prompt: cleanPrompt, tasks, people: directory, today: TODAY }));
    setAssistantStatus("idle");
  }

  function createTaskFromAssistantDraft(ownerId = defaultTaskOwnerId, creatorId = selectedPersonId) {
    const rawText = assistantResult?.intent?.params?.rawText || assistantPrompt;
    const title = rawText
      .replace(/등록|추가|생성|업무화|해줘|해주세요/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 64) || "AI 등록 초안";
    openTaskEditor({
      ...createBlankTask(ownerId, creatorId),
      title,
      description: `AI 대화 원문: ${rawText}`,
      tags: ["기획보고", "AI활용"],
      category: "기획보고",
      subtasks: [
        { id: `st-ai-${Date.now()}-1`, title: "요청 내용 확인", done: false },
        { id: `st-ai-${Date.now()}-2`, title: "담당자와 마감일 확정", done: false }
      ]
    });
    showSyncNotice("AI 등록 초안을 업무 추가 창으로 열었습니다. 확인 후 저장해 주세요.");
  }

  async function createWikiDraftFromTask(task) {
    if (!task) return;
    if (!isApiReady || authStatus !== "signed-in" || !isAuthenticated || !remoteDashboardStore.ai?.wiki?.createDraftFromDashboard) {
      showSyncNotice("Wiki 초안 생성은 FastAPI 로그인 상태에서 사용할 수 있습니다.");
      return;
    }
    if (!isUuidLike(task.id)) {
      showSyncNotice("샘플/로컬 업무는 먼저 FastAPI에 저장된 뒤 Wiki 초안으로 정리할 수 있습니다.");
      return;
    }
    setWikiDraftTaskId(task.id);
    try {
      const draft = await remoteDashboardStore.ai.wiki.createDraftFromDashboard({
        source_type: "task",
        source_id: task.id,
        proposed_page_type: "workstream"
      });
      const title = draft?.proposed_title || taskWorkstreamLabel(task) || displayTaskTitle(task);
      showSyncNotice(`Wiki 초안 "${title}"을 만들었습니다. 관리자 승인 후 Wiki page로 발행됩니다.`);
      loadWikiReviewDrafts();
      loadWikiRecommendations();
    } catch (error) {
      console.warn("Wiki 초안 생성에 실패했습니다.", error);
      showSyncNotice("Wiki 초안 생성을 FastAPI에 반영하지 못했습니다.");
    } finally {
      setWikiDraftTaskId("");
    }
  }

  async function loadWikiReviewDrafts() {
    if (!isSelectedAdmin) return;
    if (!isApiReady || authStatus !== "signed-in" || !isAuthenticated || !remoteDashboardStore.ai?.wiki?.listDrafts) {
      setWikiReviewDrafts([]);
      setWikiReviewError("Wiki 초안 검토는 FastAPI 로그인 상태에서 사용할 수 있습니다.");
      return;
    }
    setWikiReviewStatus("loading");
    setWikiReviewError("");
    try {
      const drafts = await remoteDashboardStore.ai.wiki.listDrafts({ status: "pending" });
      setWikiReviewDrafts(Array.isArray(drafts) ? drafts : []);
      setWikiReviewStatus("idle");
    } catch (error) {
      console.warn("Wiki 초안 목록을 불러오지 못했습니다.", error);
      setWikiReviewError("Wiki 초안 목록을 FastAPI에서 불러오지 못했습니다.");
      setWikiReviewStatus("error");
    }
  }

  async function loadWikiRecommendations() {
    if (!isSelectedAdmin) return;
    if (!isApiReady || authStatus !== "signed-in" || !isAuthenticated || !remoteDashboardStore.ai?.wiki?.recommendations) {
      setWikiRecommendations([]);
      setWikiRecommendationError("Wiki 추천 후보는 FastAPI 로그인 상태에서 사용할 수 있습니다.");
      return;
    }
    setWikiRecommendationStatus("loading");
    setWikiRecommendationError("");
    try {
      const recommendations = await remoteDashboardStore.ai.wiki.recommendations();
      setWikiRecommendations(Array.isArray(recommendations) ? recommendations : []);
      setWikiRecommendationStatus("idle");
    } catch (error) {
      console.warn("Wiki 추천 후보를 불러오지 못했습니다.", error);
      setWikiRecommendationError("Wiki 추천 후보를 FastAPI에서 불러오지 못했습니다.");
      setWikiRecommendationStatus("error");
    }
  }

  async function createWikiDraftFromRecommendation(recommendation) {
    const taskId = recommendation?.task_id;
    if (!taskId) return;
    const task = tasks.find((item) => item.id === taskId) ?? {
      id: taskId,
      title: recommendation.task_title,
      workstream: recommendation.workstream,
      status: recommendation.status
    };
    await createWikiDraftFromTask(task);
    loadWikiRecommendations();
  }

  async function updateWikiReviewDraft(draftId, patch) {
    if (!draftId || !remoteDashboardStore.ai?.wiki?.updateDraft) return null;
    setWikiReviewStatus("saving");
    setWikiReviewError("");
    try {
      const updatedDraft = await remoteDashboardStore.ai.wiki.updateDraft(draftId, patch);
      setWikiReviewDrafts((current) => current.map((draft) => draft.id === draftId ? { ...draft, ...updatedDraft } : draft));
      setWikiReviewStatus("idle");
      showSyncNotice("Wiki 초안을 수정했습니다. 승인하면 수정본이 발행됩니다.");
      return updatedDraft;
    } catch (error) {
      console.warn("Wiki 초안 수정에 실패했습니다.", error);
      setWikiReviewError("Wiki 초안 수정을 FastAPI에 반영하지 못했습니다.");
      setWikiReviewStatus("error");
      return null;
    }
  }

  async function approveWikiReviewDraft(draftId) {
    if (!draftId || !remoteDashboardStore.ai?.wiki?.approveDraft) return;
    setWikiReviewStatus("saving");
    setWikiReviewError("");
    try {
      await remoteDashboardStore.ai.wiki.approveDraft(draftId, {
        change_reason: "관리자 검토 승인",
        visibility: "team",
        status: "published"
      });
      setWikiReviewDrafts((current) => current.filter((draft) => draft.id !== draftId));
      setWikiReviewStatus("idle");
      showSyncNotice("Wiki 초안을 승인해 게시했습니다.");
    } catch (error) {
      console.warn("Wiki 초안 승인에 실패했습니다.", error);
      setWikiReviewError("Wiki 초안 승인을 FastAPI에 반영하지 못했습니다.");
      setWikiReviewStatus("error");
    }
  }

  async function rejectWikiReviewDraft(draftId) {
    if (!draftId || !remoteDashboardStore.ai?.wiki?.rejectDraft) return;
    const reason = window.prompt("거절 사유를 입력하세요. 비워도 거절은 처리됩니다.", "중복 또는 보완 필요");
    if (reason === null) return;
    setWikiReviewStatus("saving");
    setWikiReviewError("");
    try {
      await remoteDashboardStore.ai.wiki.rejectDraft(draftId, { reason });
      setWikiReviewDrafts((current) => current.filter((draft) => draft.id !== draftId));
      setWikiReviewStatus("idle");
      showSyncNotice("Wiki 초안을 거절 처리했습니다.");
    } catch (error) {
      console.warn("Wiki 초안 거절에 실패했습니다.", error);
      setWikiReviewError("Wiki 초안 거절을 FastAPI에 반영하지 못했습니다.");
      setWikiReviewStatus("error");
    }
  }

  async function searchPublishedWikiPages({ query = "", pageType = "workstream" } = {}) {
    if (!isApiReady || authStatus !== "signed-in" || !isAuthenticated || !remoteDashboardStore.ai?.wiki?.search) {
      throw new Error("Wiki 검색은 FastAPI 로그인 상태에서 사용할 수 있습니다.");
    }
    return remoteDashboardStore.ai.wiki.search({ query, pageType });
  }

  async function readPublishedWikiPage(pageId) {
    if (!isApiReady || authStatus !== "signed-in" || !isAuthenticated || !remoteDashboardStore.ai?.wiki?.readPage) {
      throw new Error("Wiki page 읽기는 FastAPI 로그인 상태에서 사용할 수 있습니다.");
    }
    return remoteDashboardStore.ai.wiki.readPage(pageId);
  }

  async function loadWorkstreamSuggestionCandidates() {
    if (!isApiReady || authStatus !== "signed-in" || !isAuthenticated || !remoteDashboardStore.workstreams?.suggestions) {
      throw new Error("업무흐름 추천은 FastAPI 로그인 상태에서 사용할 수 있습니다.");
    }
    return remoteDashboardStore.workstreams.suggestions();
  }

  function enterDashboardWithAssistantDraft(personId = selectedPersonId) {
    const nextPerson = directory.find((person) => person.id === personId) ?? selectedPerson;
    const creatorId = nextPerson?.id ?? selectedPersonId;
    const ownerId = nextPerson?.isTeamMember === false ? "lead" : creatorId;
    if (!isAuthenticated && creatorId) loginAs(creatorId);
    setHasEnteredDashboard(true);
    window.setTimeout(() => createTaskFromAssistantDraft(ownerId, creatorId), 0);
  }

  function closeTaskEditor() {
    setEditingTask(null);
    setEditingTaskMode("task");
  }

  function updateStatus(taskId, nextStatus) {
    const previousTask = tasks.find((task) => task.id === taskId);
    if (previousTask?.status !== nextStatus) {
      if (statusPulseTimerRef.current) window.clearTimeout(statusPulseTimerRef.current);
      setStatusPulseTaskId(taskId);
      statusPulseTimerRef.current = window.setTimeout(() => {
        setStatusPulseTaskId("");
        statusPulseTimerRef.current = null;
      }, 920);
    }
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? applyStatusTransition({ ...task, status: nextStatus, archived: false }, task, selectedPersonId)
          : task
      )
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.updateStatus(taskId, nextStatus).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무 상태는 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 상태 변경 저장에 실패했습니다.", error);
        showSyncNotice("상태 변경을 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function addTaskUpdate(taskId, text) {
    const cleanText = text.trim();
    if (!cleanText) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              updates: [{ authorId: selectedPersonId, date: TODAY, text: cleanText }, ...task.updates]
            }
          : task
      )
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.addUpdate(taskId, cleanText).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무의 업데이트 로그는 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 업데이트 로그 저장에 실패했습니다.", error);
        showSyncNotice("업데이트 로그를 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function updateTaskHistoryEntry(taskId, entry, historyIndex, note) {
    const nextNote = note.trim();
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              statusHistory: (task.statusHistory ?? []).map((item, index) =>
                index === historyIndex ? { ...item, note: nextNote } : item
              )
            }
          : task
      )
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.updateHistory(entry.id, nextNote).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무 변경 이력은 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 변경 이력 수정에 실패했습니다.", error);
        showSyncNotice("변경 이력 수정을 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function deleteTaskHistoryEntry(taskId, entry, historyIndex) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              statusHistory: (task.statusHistory ?? []).filter((_, index) => index !== historyIndex)
            }
          : task
      )
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.deleteHistory(entry.id).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무 변경 이력은 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 변경 이력 삭제에 실패했습니다.", error);
        showSyncNotice("변경 이력 삭제를 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function updateTaskUpdateEntry(taskId, update, updateIndex, text) {
    const nextText = text.trim();
    if (!nextText) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              updates: (task.updates ?? []).map((item, index) =>
                index === updateIndex ? { ...item, text: nextText } : item
              )
            }
          : task
      )
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.updateLog(update.id, nextText).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무 업데이트 로그는 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 업데이트 로그 수정에 실패했습니다.", error);
        showSyncNotice("업데이트 로그 수정을 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function deleteTaskUpdateEntry(taskId, update, updateIndex) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              updates: (task.updates ?? []).filter((_, index) => index !== updateIndex)
            }
          : task
      )
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.deleteLog(update.id).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무 업데이트 로그는 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 업데이트 로그 삭제에 실패했습니다.", error);
        showSyncNotice("업데이트 로그 삭제를 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function addTaskLink(taskId, link) {
    const title = link.title.trim();
    const url = link.url.trim();
    const type = link.type.trim() || "링크";
    if (!url) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              links: [{ title: title || "관련 링크", url, type }, ...(task.links ?? [])]
            }
          : task
      )
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.addLink(taskId, { title, url, type }).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무의 관련 링크는 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 링크 저장에 실패했습니다.", error);
        showSyncNotice("관련 링크를 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function toggleSubtask(taskId, subtaskId) {
    const currentTask = tasks.find((task) => task.id === taskId);
    const nextSubtasks = (currentTask?.subtasks ?? []).map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
    );
    const nextDone = nextSubtasks.find((subtask) => subtask.id === subtaskId)?.done ?? false;
    const nextProgress = currentTask ? taskProgress({ ...currentTask, subtasks: nextSubtasks }) : 0;
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const subtasks = (task.subtasks ?? []).map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
        );
        const nextTask = { ...task, subtasks };
        return { ...nextTask, progress: nextProgress };
      })
    );
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.setSubtaskDone(subtaskId, nextDone, nextProgress).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무의 상세 업무 체크는 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 상세 업무 체크 저장에 실패했습니다.", error);
        showSyncNotice("상세 업무 체크를 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function addCalendarEvent(event) {
    const nextEvent = { ...event, id: event.id || `e-${Date.now()}` };
    setCalendarEvents((current) => [nextEvent, ...current]);
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.events.add({ ...nextEvent, peopleDirectory: directory })
        .then((result) => {
          handleSupabaseWriteResult(result, "일정은 현재 로컬에만 저장됐습니다.");
          if (!result?.id || result.id === nextEvent.id) return;
          setCalendarEvents((current) =>
            current.map((item) => (item.id === nextEvent.id ? { ...item, id: result.id } : item))
          );
        })
        .catch((error) => {
          console.warn("Supabase 일정 저장에 실패했습니다.", error);
          showSyncNotice("일정을 Supabase에 저장하지 못했습니다. 화면에는 임시로 유지됩니다.");
        });
    }
  }

  function updateCalendarEvent(event) {
    if (!canManageCalendarEventFor(event, selectedPersonId)) {
      showSyncNotice("이 일정은 수정 권한이 없습니다.");
      return;
    }
    const nextEvent = {
      ...event,
      title: event.title.trim(),
      date: eventStartDate(event),
      startDate: eventStartDate(event),
      endDate: eventEndDate(event),
      note: event.note?.trim() ?? ""
    };
    if (!nextEvent.title) return;
    setCalendarEvents((current) => current.map((item) => (item.id === nextEvent.id ? nextEvent : item)));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.events.update({ ...nextEvent, peopleDirectory: directory }).then((result) => {
        handleSupabaseWriteResult(result, "일정 수정은 현재 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 일정 수정에 실패했습니다.", error);
        showSyncNotice("일정 수정을 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function deleteCalendarEvent(eventId) {
    const targetEvent = calendarEvents.find((event) => event.id === eventId);
    if (!targetEvent) return;
    if (!canManageCalendarEventFor(targetEvent, selectedPersonId)) {
      showSyncNotice("이 일정은 삭제 권한이 없습니다.");
      return;
    }
    const confirmed = window.confirm(`${targetEvent.title} 일정을 삭제할까요?`);
    if (!confirmed) return;
    setCalendarEvents((current) => current.filter((event) => event.id !== eventId));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.events.delete(eventId).then((result) => {
        handleSupabaseWriteResult(result, "일정 삭제는 현재 로컬에만 반영됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 일정 삭제에 실패했습니다.", error);
        showSyncNotice("일정 삭제를 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function toggleArchive(taskId, archived) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, archived } : task)));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.setArchived(taskId, archived).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무의 보관 상태는 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 보관 상태 저장에 실패했습니다.", error);
        showSyncNotice("보관 상태를 Supabase에 반영하지 못했습니다.");
      });
    }
    setSelectedBriefingKey("");
    if (archived && selectedTaskId === taskId) {
      setIsDetailOpen(false);
      const nextVisibleTask = tasks.find((task) => task.id !== taskId && !isDeletedTask(task) && !task.archived && task.ownerId === selectedPersonId);
      if (nextVisibleTask) setSelectedTaskId(nextVisibleTask.id);
    }
  }

  function fillArchiveDemoData() {
    const demoTasks = archiveDemoTasks(selectedPersonId);
    const currentIds = new Set(tasks.map((task) => task.id));
    const missingDemoTasks = demoTasks.filter((task) => !currentIds.has(task.id));
    setTasks((current) => {
      if (!missingDemoTasks.length) return current;
      return [...current, ...missingDemoTasks];
    });
    setActiveView("archive");
    setDetailContext("workflow");
    closeTaskDetail();
    setCategory("전체");
    setPriorityFilter("전체");
    setSummaryFilter("");
    showSyncNotice(
      missingDemoTasks.length
        ? `보관함 데모 데이터 ${missingDemoTasks.length}건을 추가했습니다. 완료/보류 섹션 표를 확인해 보세요.`
        : "보관함 데모 데이터가 이미 추가되어 있습니다."
    );
  }

  function fillMindmapDemoData() {
    const currentIds = new Set(tasks.map((task) => task.id));
    const missingDemoTasks = cloneList(mindmapSampleTasks).filter((task) => !currentIds.has(task.id));
    setTasks((current) => {
      if (!missingDemoTasks.length) return current;
      return [...current, ...missingDemoTasks];
    });
    setActivePage("team");
    setActiveView("mindmap");
    setDetailContext("workflow");
    closeTaskDetail();
    setCategory("전체");
    setPriorityFilter("전체");
    setSummaryFilter("");
    showSyncNotice(
      missingDemoTasks.length
        ? `마인드맵 샘플 업무 ${missingDemoTasks.length}건을 추가했습니다. 혁신아이디어 흐름을 현재/전체 범위에서 확인해 보세요.`
        : "마인드맵 샘플 업무가 이미 추가되어 있습니다."
    );
  }

  function renameWorkstream(oldLabel, nextLabel) {
    if (!isSelectedAdmin) return;
    const cleanOldLabel = String(oldLabel ?? "").trim();
    const cleanNextLabel = String(nextLabel ?? "").trim();
    if (!cleanOldLabel || !cleanNextLabel || cleanOldLabel === cleanNextLabel) return;
    const matchedTaskIds = new Set(
      groupTasksByWorkstream(tasks.filter((task) => task && !isDeletedTask(task)), collectWorkstreams(tasks))
        .find((group) => group.label === cleanOldLabel)
        ?.tasks.map((task) => task.id) ?? []
    );
    if (!matchedTaskIds.size) return;
    setTasks((current) =>
      current.map((task) => (matchedTaskIds.has(task.id) ? { ...task, workstream: cleanNextLabel } : task))
    );
    if (isApiReady && authStatus === "signed-in" && isAuthenticated) {
      tasks
        .filter((task) => matchedTaskIds.has(task.id) && isUuidLike(task.id))
        .forEach((task) => {
          remoteDashboardStore.tasks.save({ ...task, workstream: cleanNextLabel }).catch((error) => {
            console.warn("업무흐름 DB 반영에 실패했습니다.", error);
          });
        });
    }
    showSyncNotice(
      isApiReady && authStatus === "signed-in" && isAuthenticated
        ? `${cleanOldLabel} 업무흐름을 ${cleanNextLabel}(으)로 수정하고 FastAPI 반영을 요청했습니다.`
        : isSupabaseReady
          ? "업무흐름 이름은 화면에 반영됐습니다. Supabase 공유 저장은 tasks.workstream 마이그레이션 후 적용됩니다."
        : `${cleanOldLabel} 업무흐름을 ${cleanNextLabel}(으)로 수정했습니다.`
    );
  }

  function stopRecurring(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !task.recurring || !canManageTaskFor(task, selectedPersonId)) return;
    const confirmed = window.confirm("미수행 반복 일정을 삭제할까요? 시작 전 미래 회차는 제거하고, 이미 진행된 기록은 유지됩니다.");
    if (!confirmed) return;
    const stoppedTask = {
      ...task,
      recurring: null,
      recurringDetail: "",
      recurringInterval: 1,
      recurringWeekdays: [],
      recurringEndDate: "",
      recurringNoEnd: false,
      statusHistory: [recurringStopHistoryEntry(selectedPersonId), ...(task.statusHistory ?? [])]
    };
    const nextTasks = tasks
      .filter((item) => !(item.recurringTemplateId === taskId && diffDays(item.startDate, TODAY) > 0))
      .map((item) =>
        item.id === taskId
          ? stoppedTask
          : item
      );
    setTasks(nextTasks);
    persistTaskToSupabase({ ...stoppedTask, peopleDirectory: directory }, stoppedTask.id);
    setSelectedBriefingKey("");
    setIsDetailOpen(false);
    if (!nextTasks.some((item) => item.id === selectedTaskId)) {
      const scoped = activePage === "team" ? nextTasks : nextTasks.filter((item) => item.ownerId === selectedPersonId);
      setSelectedTaskId(scoped.find((item) => !item.archived)?.id ?? nextTasks.find((item) => !item.archived)?.id ?? nextTasks[0]?.id ?? "");
    }
  }

  function deleteTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !canManageTaskFor(task, selectedPersonId)) return;
    const isRecurringOccurrence = Boolean(task.recurringTemplateId) && !task.recurring;
    const confirmed = window.confirm(
      isRecurringOccurrence
        ? `${displayTaskTitle(task)} 회차만 삭제할까요? 다른 반복 일정과 반복 규칙에는 영향이 없습니다.`
        : `${displayTaskTitle(task)} 업무를 삭제할까요? 반복업무 원본을 삭제하면 이미 저장된 하위 회차도 함께 삭제됩니다.`
    );
    if (!confirmed) return;
    if (isRecurringOccurrence) {
      const deletedTask = {
        ...task,
        archived: true,
        deletedAt: TODAY,
        statusHistory: [{
          date: TODAY,
          actorId: selectedPersonId,
          type: "delete",
          from: task.status,
          to: "삭제",
          note: "반복업무 중 선택한 회차만 삭제"
        }, ...(task.statusHistory ?? [])]
      };
      const nextTasks = tasks.map((item) => (item.id === taskId ? deletedTask : item));
      setTasks(nextTasks);
      persistTaskToSupabase({ ...deletedTask, peopleDirectory: directory }, deletedTask.id);
      setSelectedBriefingKey("");
      setIsDetailOpen(false);
      const scoped = activePage === "team" ? nextTasks : nextTasks.filter((item) => item.ownerId === selectedPersonId);
      setSelectedTaskId(scoped.find((item) => !isDeletedTask(item) && !item.archived)?.id ?? nextTasks.find((item) => !isDeletedTask(item) && !item.archived)?.id ?? "");
      if (editingTask?.id === taskId) closeTaskEditor();
      return;
    }
    const nextTasks = tasks.filter((item) => item.id !== taskId && item.recurringTemplateId !== taskId);
    setTasks(nextTasks);
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tasks.delete(taskId).then((result) => {
        handleSupabaseWriteResult(result, "샘플 업무 삭제는 로컬에만 반영됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 업무 삭제에 실패했습니다.", error);
        showSyncNotice("업무 삭제를 Supabase에 반영하지 못했습니다.");
      });
    }
    setSelectedBriefingKey("");
    setIsDetailOpen(false);
    if (!nextTasks.some((item) => item.id === selectedTaskId)) {
      const scoped = activePage === "team" ? nextTasks : nextTasks.filter((item) => item.ownerId === selectedPersonId);
      setSelectedTaskId(scoped.find((item) => !item.archived)?.id ?? nextTasks.find((item) => !item.archived)?.id ?? nextTasks[0]?.id ?? "");
    }
    if (editingTask?.id === taskId) closeTaskEditor();
  }

  function addTag(tag) {
    const nextTag = tag.trim();
    if (!nextTag) return;
    setAvailableTags((current) => normalizeTags([...current, nextTag]));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tags.add(nextTag).catch((error) => {
        console.warn("Supabase 태그 추가에 실패했습니다.", error);
        showSyncNotice("태그 추가를 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function renameTag(oldTag, nextTag) {
    if (!canManageTagsFor(selectedPersonId)) return;
    const cleanTag = nextTag.trim();
    if (!cleanTag || cleanTag === oldTag) return;
    setAvailableTags((current) => normalizeTags(current.map((tag) => (tag === oldTag ? cleanTag : tag))));
    const nextGroups = tagGroups.map((group) => ({
      ...group,
      tags: normalizeTags(group.tags.map((tag) => (tag === oldTag ? cleanTag : tag)))
    }));
    setTagGroups(nextGroups);
    setTasks((current) =>
      current.map((task) => ({
        ...task,
        tags: normalizeTags(task.tags.map((tag) => (tag === oldTag ? cleanTag : tag)))
      }))
    );
    setCategory((current) => serializeTagFilters(readTagFilterValues(current, tagGroups).map((tag) => (tag === oldTag ? cleanTag : tag))));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tags.rename(oldTag, cleanTag).catch((error) => {
        console.warn("Supabase 태그 수정에 실패했습니다.", error);
        showSyncNotice("태그 수정을 Supabase에 반영하지 못했습니다.");
      });
      nextGroups
        .filter((group) => group.tags.includes(cleanTag))
        .forEach((group) => {
          remoteDashboardStore.tags.saveGroup(group).catch((error) => {
            console.warn("Supabase 태그 Category 갱신에 실패했습니다.", error);
          });
        });
    }
  }

  function deleteTag(tagToDelete) {
    if (!canManageTagsFor(selectedPersonId)) return;
    setAvailableTags((current) => current.filter((tag) => tag !== tagToDelete));
    const nextGroups = tagGroups.map((group) => ({
      ...group,
      tags: group.tags.filter((tag) => tag !== tagToDelete)
    }));
    setTagGroups(nextGroups);
    setTasks((current) =>
      current.map((task) => ({ ...task, tags: task.tags.filter((tag) => tag !== tagToDelete) }))
    );
    setCategory((current) => serializeTagFilters(readTagFilterValues(current, tagGroups).filter((tag) => tag !== tagToDelete)));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tags.delete(tagToDelete).catch((error) => {
        console.warn("Supabase 태그 삭제에 실패했습니다.", error);
        showSyncNotice("태그 삭제를 Supabase에 반영하지 못했습니다.");
      });
      nextGroups
        .filter((group) => group.tags.length)
        .forEach((group) => {
          remoteDashboardStore.tags.saveGroup(group).catch((error) => {
            console.warn("Supabase 태그 Category 갱신에 실패했습니다.", error);
          });
        });
    }
  }

  function saveTagGroup(group) {
    if (!canManageTagsFor(selectedPersonId)) return;
    const cleanLabel = group.label.trim();
    const cleanTags = normalizeTags(group.tags ?? []);
    if (!cleanLabel || !cleanTags.length) return;
    const id = group.id || `preset:${cleanLabel.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
    const nextGroup = {
      id,
      label: cleanLabel,
      tags: cleanTags,
      tone: group.tone || "custom"
    };
    setAvailableTags((current) => normalizeTags([...current, ...cleanTags]));
    setTagGroups((current) => {
      const exists = current.some((item) => item.id === id);
      return exists
        ? current.map((item) => (item.id === id ? nextGroup : item))
        : [...current, nextGroup];
    });
    if (isSupabaseReady && isAuthenticated) {
      cleanTags.forEach((tag) => {
        remoteDashboardStore.tags.add(tag).catch((error) => {
          console.warn("Supabase 태그 추가에 실패했습니다.", error);
        });
      });
      remoteDashboardStore.tags.saveGroup(nextGroup).catch((error) => {
        console.warn("Supabase 태그 Category 저장에 실패했습니다.", error);
        showSyncNotice("태그 Category 저장은 마이그레이션 적용 후 Supabase에 반영됩니다.");
      });
    }
  }

  function moveTagToPreset(tag, targetGroupId) {
    if (!canManageTagsFor(selectedPersonId)) return;
    const cleanTag = String(tag ?? "").trim();
    if (!cleanTag) return;
    setAvailableTags((current) => normalizeTags([...current, cleanTag]));
    const nextGroups = tagGroups.map((group) => ({
      ...group,
      tags: normalizeTags(
        group.id === targetGroupId
          ? [...group.tags, cleanTag]
          : group.tags.filter((item) => item !== cleanTag)
      )
    }));
    setTagGroups(nextGroups);
    if (isSupabaseReady && isAuthenticated) {
      nextGroups.forEach((group) => {
        remoteDashboardStore.tags.saveGroup(group).catch((error) => {
          console.warn("Supabase 태그 Category 이동 저장에 실패했습니다.", error);
        });
      });
    }
  }

  function deleteTagGroup(groupId) {
    if (!canManageTagsFor(selectedPersonId)) return;
    const groupToDelete = tagGroups.find((group) => group.id === groupId);
    setTagGroups((current) => current.filter((group) => group.id !== groupId));
    if (groupToDelete) {
      setCategory((current) => serializeTagFilters(readTagFilterValues(current, tagGroups).filter((tag) => !groupToDelete.tags.includes(tag))));
    }
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.tags.deleteGroup(groupId).catch((error) => {
        console.warn("Supabase 태그 Category 삭제에 실패했습니다.", error);
        showSyncNotice("태그 Category 삭제는 마이그레이션 적용 후 Supabase에 반영됩니다.");
      });
    }
  }

  function openTagFilterPanel() {
    setIsTagLibraryOpen(true);
    window.requestAnimationFrame(() => {
      tagLibraryRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function changePage(page) {
    setActivePage(page);
    setSelectedBriefingKey("");
    setDetailContext("briefing");
    setIsDetailOpen(false);
    if (page === "my" && !tasks.some((task) => task.id === selectedTaskId && task.ownerId === selectedPersonId)) {
      setSelectedTaskId(tasks.find((task) => task.ownerId === selectedPersonId)?.id ?? tasks[0].id);
    }
  }

  function changePerson(personId) {
    setSelectedPersonId(personId);
    if (teamMemberPulseTimerRef.current) window.clearTimeout(teamMemberPulseTimerRef.current);
    setTeamMemberPulseId(personId);
    teamMemberPulseTimerRef.current = window.setTimeout(() => setTeamMemberPulseId(""), 1200);
    setSelectedBriefingKey("");
    setDetailContext("briefing");
    setIsDetailOpen(false);
    if (activePage === "my") {
      setSelectedTaskId(tasks.find((task) => task.ownerId === personId)?.id ?? tasks[0].id);
    }
  }

  function closeTaskDetail() {
    setIsDetailOpen(false);
    setSelectedBriefingKey("");
  }

  function changeWorkflowView(view) {
    setActiveView(view);
    setDetailContext("workflow");
    closeTaskDetail();
  }

  function applyMindmapTagFilter(tags) {
    setCategory(serializeTagFilters(tags));
    setSummaryFilter("");
    setActiveView("board");
    setDetailContext("workflow");
    closeTaskDetail();
  }

  function applySummaryFilter(filterKey) {
    setSummaryFilter(filterKey);
    setCategory("전체");
    setPriorityFilter("전체");
    setQuery("");
    setActiveView("board");
    setDetailContext("workflow");
    closeTaskDetail();
    window.setTimeout(() => {
      const workflowTarget = workflowSurfaceRef.current?.querySelector(".board-view") ?? workflowSurfaceRef.current;
      if (!workflowTarget) return;
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const targetTop = window.scrollY + workflowTarget.getBoundingClientRect().top - 12;
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    }, 90);
  }

  async function authenticateWithSupabase(payload) {
    if (!isSupabaseReady) return;
    setAuthStatus("submitting");
    setAuthMessage("");
    try {
      if (payload.mode === "signup") {
        await remoteDashboardStore.auth.signUpWithPassword({
          email: payload.email,
          password: payload.password,
          name: payload.name,
          profileEmoji: payload.profileEmoji
        });
        setAuthMessage("회원가입 요청이 완료됐습니다. 이메일 확인이 켜져 있다면 메일 인증 후 로그인해 주세요.");
      } else {
        await remoteDashboardStore.auth.signInWithPassword(payload.email, payload.password);
      }
      const snapshot = await remoteDashboardStore.read();
      if (snapshot?.isAuthenticated) {
        applySupabaseSnapshot(
          {
            ...snapshot,
            activePage: snapshot.activePage || "team",
            activeView: snapshot.activeView || "board"
          },
          { preservePrototypeTasks: true }
        );
        setIsAuthenticated(true);
        setAuthStatus("signed-in");
        supabaseHydratedRef.current = true;
        return;
      }
      setIsAuthenticated(false);
      setAuthStatus("signed-out");
    } catch (error) {
      setAuthStatus("signed-out");
      setAuthMessage(error.message || "로그인 처리 중 문제가 생겼습니다.");
    }
  }

  function loginAs(personId) {
    const nextPerson = peopleDirectory.find((person) => person.id === personId);
    if (!nextPerson) return;
    setIsAuthenticated(true);
    setSelectedPersonId(personId);
    setSelectedBriefingKey("");
    setIsDetailOpen(false);
    setIsAccountOpen(false);
    if (nextPerson.permissionRole === "admin") {
      setActivePage("team");
      setActiveView("board");
      setSelectedTaskId(tasks.find((task) => !isDeletedTask(task) && !task.archived)?.id ?? tasks.find((task) => !isDeletedTask(task))?.id ?? "");
      return;
    }
    setActivePage("my");
    setActiveView("board");
    setSelectedTaskId(tasks.find((task) => !isDeletedTask(task) && !task.archived && task.ownerId === personId)?.id ?? tasks.find((task) => !isDeletedTask(task) && !task.archived)?.id ?? tasks.find((task) => !isDeletedTask(task))?.id ?? "");
  }

  function enterDashboardAs(personId) {
    loginAs(personId);
    setHasEnteredDashboard(true);
  }

  async function logout() {
    if (isSupabaseReady) {
      try {
        await remoteDashboardStore.auth.signOut();
      } catch (error) {
        console.warn("Supabase 로그아웃에 실패했습니다.", error);
      }
    }
    setIsAuthenticated(false);
    setHasEnteredDashboard(false);
    setIsAccountOpen(false);
    setAuthStatus(isSupabaseReady ? "signed-out" : "local");
  }

  function updateProfileEmoji(personId, emoji) {
    setProfileOverrides((current) => ({
      ...current,
      [personId]: {
        ...(current[personId] ?? {}),
        emoji
      }
    }));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.profiles.updateEmoji(personId, emoji).then((result) => {
        handleSupabaseWriteResult(result, "샘플 계정 이모지는 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 프로필 이모지 저장에 실패했습니다.", error);
        showSyncNotice("프로필 이모지를 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function updateProfile(personId, profile) {
    const cleanProfile = {
      name: profile.name?.trim(),
      role: profile.role?.trim(),
      emoji: profile.emoji?.trim()
    };
    setProfileOverrides((current) => ({
      ...current,
      [personId]: {
        ...(current[personId] ?? {}),
        ...(cleanProfile.name ? { name: cleanProfile.name } : {}),
        ...(cleanProfile.role ? { role: cleanProfile.role } : {}),
        ...(cleanProfile.emoji ? { emoji: cleanProfile.emoji } : {})
      }
    }));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.profiles.update(personId, {
        name: cleanProfile.name,
        title: cleanProfile.role,
        profileEmoji: cleanProfile.emoji
      }).then((result) => {
        handleSupabaseWriteResult(result, "샘플 계정 프로필은 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 프로필 저장에 실패했습니다.", error);
        showSyncNotice("프로필 변경을 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function updateUserAdministration(personId, patch) {
    const person = directory.find((item) => item.id === personId);
    const nextPatch = {
      ...patch,
      name: patch.name ?? person?.name,
      title: patch.title ?? person?.role,
      profileEmoji: patch.profileEmoji ?? person?.emoji,
      permissionRole: patch.permissionRole ?? person?.permissionRole,
      isTeamMember: typeof patch.isTeamMember === "boolean" ? patch.isTeamMember : person?.isTeamMember,
      isActive: typeof patch.isActive === "boolean" ? patch.isActive : person?.isActive,
      expectedEmail: patch.expectedEmail ?? person?.expectedEmail,
      authUserId: patch.authUserId ?? person?.authUserId
    };
    setProfileOverrides((current) => ({
      ...current,
      [personId]: {
        ...(current[personId] ?? {}),
        ...(typeof nextPatch.name === "string" && nextPatch.name.trim() ? { name: nextPatch.name.trim() } : {}),
        ...(typeof nextPatch.title === "string" && nextPatch.title.trim() ? { role: nextPatch.title.trim() } : {}),
        ...(typeof nextPatch.profileEmoji === "string" && nextPatch.profileEmoji.trim() ? { emoji: nextPatch.profileEmoji.trim() } : {}),
        ...(nextPatch.permissionRole ? { permissionRole: nextPatch.permissionRole } : {}),
        ...(typeof nextPatch.isTeamMember === "boolean" ? { isTeamMember: nextPatch.isTeamMember } : {}),
        ...(typeof nextPatch.isActive === "boolean" ? { isActive: nextPatch.isActive } : {}),
        ...(typeof nextPatch.expectedEmail === "string" ? { expectedEmail: nextPatch.expectedEmail } : {}),
        ...(typeof nextPatch.authUserId === "string" ? { authUserId: nextPatch.authUserId } : {})
      }
    }));
    if (isSupabaseReady && isAuthenticated) {
      remoteDashboardStore.profiles.updateAdministration(personId, nextPatch).then((result) => {
        handleSupabaseWriteResult(result, "샘플 계정 권한 변경은 로컬에만 저장됐습니다.");
      }).catch((error) => {
        console.warn("Supabase 사용자 권한 저장에 실패했습니다.", error);
        showSyncNotice("사용자 권한 변경을 Supabase에 반영하지 못했습니다.");
      });
    }
  }

  function buildMaterializedRecurringTask(source, instance, options = {}) {
    return {
      ...source,
      ...instance,
      id: options.id || `t-${Date.now()}-${instance.dueDate.replaceAll("-", "")}`,
      recurring: null,
      recurringDetail: "",
      recurringInterval: 1,
      recurringWeekdays: [],
      recurringStartDate: "",
      recurringEndDate: "",
      recurringNoEnd: false,
      recurringDurationDays: 1,
      isRecurringInstance: false,
      recurringTemplateId: instance.recurringTemplateId,
      createdAt: TODAY,
      status: instance.status || "계획",
      progress: 0,
      completedAt: "",
      completedBy: "",
      updates: [],
      statusHistory: [{
        date: TODAY,
        actorId: options.actorId || selectedPersonId,
        type: "recurring",
        from: "반복 예정",
        to: "개별 업무",
        note: options.note || `${formatDate(instance.startDate)} 회차를 개별 업무로 전환`
      }],
      subtasks: (source.subtasks ?? []).map((subtask, index) => ({
        ...subtask,
        id: `st-${Date.now()}-${index}`,
        done: false
      }))
    };
  }

  function materializeRecurringInstance(instance) {
    if (!instance?.isRecurringInstance || !instance.recurringTemplateId) return instance?.id ?? "";
    const existing = tasks.find((task) => task.recurringTemplateId === instance.recurringTemplateId && task.dueDate === instance.dueDate);
    if (existing) return existing.id;
    const source = tasks.find((task) => task.id === instance.recurringTemplateId) ?? instance;
    const nextTask = buildMaterializedRecurringTask(source, instance);
    setTasks((current) => [nextTask, ...current]);
    persistTaskToSupabase({ ...nextTask, peopleDirectory: directory }, nextTask.id);
    showSyncNotice("반복 회차를 개별 업무로 만들었습니다.");
    return nextTask.id;
  }

  function selectTask(taskOrId, context = "workflow") {
    const taskId = typeof taskOrId === "object" ? materializeRecurringInstance(taskOrId) : taskOrId;
    if (taskId) {
      if (selectedTaskPulseTimerRef.current) window.clearTimeout(selectedTaskPulseTimerRef.current);
      setSelectedTaskPulseId(taskId);
      selectedTaskPulseTimerRef.current = window.setTimeout(() => {
        setSelectedTaskPulseId("");
        selectedTaskPulseTimerRef.current = null;
      }, 720);
    }
    if (context === "briefing" && activeView !== "board") {
      setActiveView("board");
    }
    setDetailContext(context);
    setIsDetailOpen(true);
    setSelectedBriefingKey("");
    setSelectedTaskId(taskId);
    window.setTimeout(() => {
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const targetColumn = context === "briefing" ? detailColumnRef.current : workflowDetailColumnRef.current;
      const detailTarget = targetColumn?.querySelector(".detail-panel") ?? targetColumn;
      if (!detailTarget) return;
      const targetTop = window.scrollY + detailTarget.getBoundingClientRect().top - 16;
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }, 80);
    return taskId;
  }

  function selectBriefingGroup(group) {
    if (group.tasks.length <= 1) {
      if (briefingFeedbackTimerRef.current) {
        window.clearTimeout(briefingFeedbackTimerRef.current);
      }
      setBriefingFeedbackKey(group.key);
      setSelectedBriefingKey(group.key);
      setDetailContext("briefing");
      setActiveView("board");
      if (group.tasks[0]) {
        window.setTimeout(() => selectTask(group.tasks[0].id, "briefing"), 220);
      }
      briefingFeedbackTimerRef.current = window.setTimeout(() => {
        setBriefingFeedbackKey("");
        briefingFeedbackTimerRef.current = null;
      }, 520);
      return;
    }
    setBriefingFeedbackKey("");
    if (group.tasks[0]) {
      setSelectedTaskId(group.tasks[0].id);
    }
    setDetailContext("briefing");
    setActiveView("board");
    setIsDetailOpen(true);
    setSelectedBriefingKey(group.key);
  }

  function exportDashboardData() {
    if (!localDashboardStore.canUse()) return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      team: "연구기획그룹-전략",
      tasks,
      availableTags,
      tagGroups,
      calendarEvents,
      memoByPage,
      briefingItems,
      profileOverrides
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `research-strategy-dashboard-${TODAY}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setIsDataMenuOpen(false);
  }

  async function importDashboardData(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const importFingerprint = await textFingerprint(text);
      const imported = normalizeImportedDashboard(JSON.parse(text));
      if (isSupabaseReady && isAuthenticated) {
        const plan = buildSupabaseImportPlan({ imported, directory, selectedPerson });
        if (plan.blockingIssues.length) {
          window.alert(`${formatSupabaseImportPlanMessage(plan)}\n\n담당자 매핑이 불명확해서 Supabase 가져오기를 중단했습니다.`);
          setIsDataMenuOpen(false);
          return;
        }
        const previousImport = supabaseImportHistoryStore.find(importFingerprint);
        const duplicateWarning = previousImport
          ? `\n\n주의: 같은 JSON 파일을 ${formatImportHistoryDate(previousImport.importedAt)}에 이미 Supabase로 가져온 기록이 있습니다. 로컬 ID 자료는 다시 실행하면 중복 업무/일정이 생길 수 있습니다.`
          : "";
        const confirmed = window.confirm(
          `${formatSupabaseImportPlanMessage(plan)}\n\n` +
          "라이브 Supabase DB에 가져오기를 실행할까요? 기존 DB에 없는 로컬 ID 행은 새로 추가되고, 같은 UUID 행은 갱신될 수 있습니다." +
          duplicateWarning
        );
        if (!confirmed) {
          setIsDataMenuOpen(false);
          return;
        }
        if (previousImport) {
          const reconfirmed = window.confirm(
            "같은 JSON 가져오기 기록이 있습니다. 그래도 다시 실행할까요?\n\n로컬 ID 업무/일정은 새 행으로 다시 추가될 수 있습니다."
          );
          if (!reconfirmed) {
            setIsDataMenuOpen(false);
            return;
          }
        }
        if (!plan.canRunFromCurrentUser) {
          window.alert("이 가져오기는 관리자 계정에서만 실행할 수 있습니다.");
          setIsDataMenuOpen(false);
          return;
        }
        const result = await remoteDashboardStore.importData(imported, {
          directory,
          activePage,
          activeView,
          timelineMode,
          timelineMonth,
          timelineYear
        });
        if (result?.skipped) {
          if (result.reason === "unknown-roster-ids") {
            const unknownIds = result.unknownRosterIds?.join(", ") || "확인되지 않은 담당자 ID";
            window.alert(`Supabase 가져오기를 실행하지 못했습니다.\n\n현재 인원 목록에 없는 담당자 ID가 있습니다: ${unknownIds}\n먼저 실제 이름/직책/예상 이메일로 로스터 매핑을 정리해 주세요.`);
          } else {
            window.alert("Supabase 가져오기를 실행하지 못했습니다. 관리자 권한과 로그인 상태를 확인해 주세요.");
          }
          setIsDataMenuOpen(false);
          return;
        }
        const snapshot = await remoteDashboardStore.read();
        applySupabaseSnapshot(snapshot);
        setCategory("전체");
        setSelectedBriefingKey("");
        setIsDetailOpen(false);
        closeTaskEditor();
        setActiveView("board");
        supabaseImportHistoryStore.write({
          fingerprint: importFingerprint,
          fileName: file.name,
          fileSize: file.size,
          taskCount: result.taskCount,
          calendarEventCount: result.calendarEventCount,
          tagCount: result.tagCount,
          rosterCount: result.rosterCount
        });
        showSyncNotice(`Supabase 가져오기 완료: 업무 ${result.taskCount}건, 일정 ${result.calendarEventCount}건`);
        setIsDataMenuOpen(false);
        return;
      }
      const confirmed = window.confirm(
        `업무 ${imported.tasks.length}건, 일정 ${imported.calendarEvents.length}건을 가져와 현재 저장 데이터를 교체할까요?`
      );
      if (!confirmed) return;
      setTasks(imported.tasks);
      setAvailableTags(imported.availableTags);
      setTagGroups(imported.tagGroups);
      setCalendarEvents(imported.calendarEvents);
      setMemoByPage(imported.memoByPage);
      setBriefingItems(imported.briefingItems);
      setProfileOverrides(imported.profileOverrides);
      setCategory("전체");
      setSelectedBriefingKey("");
      setIsDetailOpen(false);
      closeTaskEditor();
      setActiveView("board");
      setSelectedTaskId(imported.tasks.find((task) => !task.archived)?.id ?? imported.tasks[0]?.id ?? "");
      setIsDataMenuOpen(false);
      window.alert("대시보드 데이터를 가져왔습니다.");
    } catch (error) {
      window.alert(`가져오기에 실패했습니다. ${error.message}`);
    }
  }

  function resetDashboardData() {
    const confirmed = window.confirm("저장된 프로토타입 데이터를 초기 상태로 되돌릴까요?");
    if (!confirmed) return;
    const resetTags = normalizeTags(defaultAvailableTags);
    const resetTasks = cloneList(initialTasks);
    setTasks(resetTasks);
    setAvailableTags(resetTags);
    setCalendarEvents(cloneList(initialCalendarEvents));
    setSelectedPersonId("kmryu");
    setIsAuthenticated(true);
    setActivePage("my");
    setActiveView("board");
    setCategory("전체");
    setTimelineMode("month");
    setTimelineMonth(TODAY.slice(0, 7));
    setTimelineYear(TODAY.slice(0, 4));
    setSelectedBriefingKey("");
    setIsDetailOpen(false);
    setSelectedTaskId(resetTasks[0]?.id ?? "");
    closeTaskEditor();
    setMemoByPage({ my: "", team: "" });
    setBriefingItems([]);
    setProfileOverrides({});
    localDashboardStore.clear();
    setIsDataMenuOpen(false);
  }

  const activeNavIndex = (() => {
    if (activePage === "my" && !fullPageViews.includes(activeView)) return 0;
    if (activePage === "team" && !fullPageViews.includes(activeView)) return 1;
    if (activeView === "calendar") return 2;
    if (activeView === "updates") return 3;
    if (activeView === "performance") return 4;
    if (activeView === "canvas") return 5;
    if (activeView === "admin") return 6;
    return 0;
  })();

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const navList = navListRef.current;
      const activeItem = navList?.querySelector(".nav-item.active");
      if (!navList || !activeItem) return;
      setNavIndicatorStyle({
        height: `${activeItem.offsetHeight}px`,
        top: `${activeItem.offsetTop}px`
      });
    };
    const frame = window.requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeNavIndex, hasEnteredDashboard, isAuthenticated, isSelectedAdmin]);

  if (!hasEnteredDashboard || !isAuthenticated) {
    return (
      <LoginScreen
        authMessage={authMessage}
        authStatus={authStatus}
        isAlreadyAuthenticated={isAuthenticated}
        isSupabaseReady={isSupabaseReady}
        assistantError={assistantError}
        assistantPrompt={assistantPrompt}
        assistantResult={assistantResult}
        assistantStatus={assistantStatus}
        isAssistantRemoteReady={isApiReady && isAuthenticated && authStatus === "signed-in"}
        onAssistantAsk={askAiAssistant}
        onAssistantDraftTask={enterDashboardWithAssistantDraft}
        onAssistantPromptChange={setAssistantPrompt}
        onEnterDashboard={() => setHasEnteredDashboard(true)}
        onLogin={enterDashboardAs}
        onSupabaseAuth={authenticateWithSupabase}
        people={directory}
      />
    );
  }

  const hasTaskDetail = isDetailOpen && Boolean(selectedTask);
  const detailPanel = hasTaskDetail ? (
    <TaskDetail
      onArchive={() => toggleArchive(selectedTask.id, true)}
      onClose={closeTaskDetail}
      onDelete={() => deleteTask(selectedTask.id)}
      onEdit={() => openTaskEditor(selectedTask)}
      onDeleteHistory={(entry, index) => deleteTaskHistoryEntry(selectedTask.id, entry, index)}
      onDeleteUpdate={(update, index) => deleteTaskUpdateEntry(selectedTask.id, update, index)}
      onUpdateHistory={(entry, index, note) => updateTaskHistoryEntry(selectedTask.id, entry, index, note)}
      onUpdateLog={(update, index, text) => updateTaskUpdateEntry(selectedTask.id, update, index, text)}
      onRestore={() => toggleArchive(selectedTask.id, false)}
      onAddLink={(link) => addTaskLink(selectedTask.id, link)}
      onAddUpdate={(text) => addTaskUpdate(selectedTask.id, text)}
      onToggleSubtask={toggleSubtask}
      onDeletePost={(postId) => deleteTaskPost(selectedTask.id, postId)}
      onSavePost={(draft) => saveTaskPost(selectedTask.id, draft)}
      onCreateWikiDraft={() => createWikiDraftFromTask(selectedTask)}
      canManage={canManageTaskFor(selectedTask, selectedPersonId)}
      postCategories={taskPostCategories}
      selectedPersonId={selectedPersonId}
      task={selectedTask}
      wikiDraftStatus={wikiDraftTaskId === selectedTask.id ? "saving" : ""}
    />
  ) : null;
  const isWorkflowDetailContext = hasTaskDetail && !fullPageViews.includes(activeView) && detailContext === "workflow";
  const isBriefingDetailContext = isDetailOpen && !fullPageViews.includes(activeView) && detailContext === "briefing";

  return (
    <div className={`app-shell ${displayDensity === "comfortable" ? "comfortable-density" : ""}`}>
      <aside className="sidebar" aria-label="주요 메뉴">
        <div className="brand-block">
          <div className="brand-wordmark">
            <strong>연구기획그룹</strong>
            <span>전략 TEAM</span>
          </div>
        </div>
        <nav
          className="nav-list"
          ref={navListRef}
          style={{
            "--active-nav-height": navIndicatorStyle.height,
            "--active-nav-top": navIndicatorStyle.top
          }}
        >
          <button
            className={`nav-item ${activePage === "my" && !fullPageViews.includes(activeView) ? "active" : ""}`}
            onClick={() => {
              changePage("my");
              changeWorkflowView("board");
            }}
            type="button"
            title="My Desk"
          >
            <LayoutDashboard size={18} />
            <span>My Desk</span>
          </button>
          <button
            className={`nav-item ${activePage === "team" && !fullPageViews.includes(activeView) ? "active" : ""}`}
            onClick={() => {
              changePage("team");
              changeWorkflowView("board");
            }}
            type="button"
            title="Team Flow"
          >
            <ClipboardList size={18} />
            <span>Team Flow</span>
          </button>
          <button
            className={`nav-item ${activeView === "calendar" ? "active" : ""}`}
            onClick={() => {
              setActivePage("team");
              setActiveView("calendar");
              closeTaskDetail();
            }}
            type="button"
            title="Calendar"
          >
            <CalendarDays size={18} />
            <span>Calendar</span>
          </button>
          <button
            className={`nav-item ${activeView === "updates" ? "active" : ""}`}
            onClick={() => {
              setActiveView("updates");
              closeTaskDetail();
            }}
            type="button"
            title="Updates"
          >
            <MessageSquareText size={18} />
            <span>Updates</span>
          </button>
          <button
            className={`nav-item ${activeView === "performance" ? "active" : ""}`}
            onClick={() => {
              setActivePage("team");
              setActiveView("performance");
              closeTaskDetail();
            }}
            type="button"
            title="Highlights"
          >
            <Sparkles size={18} />
            <span>Highlights</span>
          </button>
          <button
            className={`nav-item ${activeView === "canvas" ? "active" : ""}`}
            onClick={() => {
              setActivePage("team");
              setActiveView("canvas");
              closeTaskDetail();
            }}
            type="button"
            title="Canvas"
          >
            <NotebookPen size={18} />
            <span>Canvas</span>
          </button>
          {isSelectedAdmin && (
            <button
              className={`nav-item ${activeView === "admin" ? "active" : ""}`}
              onClick={() => {
                setActivePage("team");
                setActiveView("admin");
                closeTaskDetail();
              }}
              type="button"
              title="관리자"
            >
              <ShieldCheck size={18} />
              <span>관리자</span>
            </button>
          )}
        </nav>
        <div className="team-stack">
          <span className="panel-label">Team Members</span>
          {teamMembers.map((person) => (
            <button
              className={`person-pill ${selectedPersonId === person.id ? "selected" : ""} ${teamMemberPulseId === person.id ? "is-pulsing" : ""}`}
              key={person.id}
              onClick={() => changePerson(person.id)}
              type="button"
            >
              <span className="profile-emoji" style={avatarStyle(person)}>
                {person.emoji}
              </span>
              <span className="person-label">
                <strong>{person.name}</strong>
                <small>{person.role}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="workspace">
        {syncNotice && (
          <div className="sync-notice" role="status">
            <Info size={14} />
            <span>{syncNotice}</span>
          </div>
        )}
        <header className="topbar">
          <div>
            <h1>Strategy Work Hub</h1>
          </div>
          <div className="top-actions">
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="업무 검색"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="업무, 태그, 자료 검색"
                value={query}
              />
            </label>
            <button className="icon-button" type="button" title="알림">
              <Bell size={18} />
            </button>
            <button
              aria-pressed={displayDensity === "comfortable"}
              className={`view-density-button ${displayDensity === "comfortable" ? "active" : ""}`}
              onClick={() => setDisplayDensity((current) => current === "comfortable" ? "standard" : "comfortable")}
              title={displayDensity === "comfortable" ? "기본 보기로 전환" : "넓게 보기로 전환"}
              type="button"
            >
              <PanelRightOpen size={16} />
              <span>{displayDensity === "comfortable" ? "기본" : "넓게"}</span>
            </button>
            <button
              className="icon-button"
              onClick={() => setHasEnteredDashboard(false)}
              type="button"
              title="입장 화면으로 돌아가기"
              aria-label="입장 화면으로 돌아가기"
            >
              <House size={18} />
            </button>
            <span
              className={`backend-status ${isSupabaseReady ? "connected" : "local"}`}
              title={
                isSupabaseReady
                  ? authStatus === "signed-in"
                    ? `${backendLabel}에 로그인되어 실데이터를 사용합니다.`
                    : `${backendLabel} 환경변수가 설정되어 있습니다.`
                  : "백엔드 환경변수가 없어 로컬 프로토타입 저장소를 사용합니다."
              }
            >
              <Database size={14} />
              {isSupabaseReady ? (authStatus === "signed-in" ? `${backendLabel} 연결` : `${backendLabel} 준비`) : "로컬 저장"}
            </span>
            <div className="data-menu-wrap">
              <button
                className={`icon-button ${isDataMenuOpen ? "active" : ""}`}
                onClick={() => setIsDataMenuOpen((current) => !current)}
                type="button"
                title="데이터 관리"
              >
                <Database size={18} />
              </button>
              {isDataMenuOpen && (
                <div className="data-menu" role="menu" aria-label="데이터 관리">
                  <button onClick={exportDashboardData} type="button">
                    <Download size={16} />
                    JSON 내보내기
                  </button>
                  <button onClick={() => importInputRef.current?.click()} type="button">
                    <Upload size={16} />
                    JSON 가져오기
                  </button>
                  <button className="danger" onClick={resetDashboardData} type="button">
                    <RotateCcw size={16} />
                    데이터 초기화
                  </button>
                </div>
              )}
              <input
                accept="application/json,.json"
                className="data-import-input"
                onChange={importDashboardData}
                ref={importInputRef}
                type="file"
              />
            </div>
            <button className="account-button" onClick={() => setIsAccountOpen(true)} type="button" title="계정 및 프로필">
              <span className="profile-emoji" style={avatarStyle(selectedPerson)}>
                {selectedPerson.emoji}
              </span>
              <span className="account-identity">
                <strong>{selectedPerson.name}</strong>
                {selectedPerson.role !== "관리자" && <small>{roleLine(selectedPerson)}</small>}
                {adminBadge(selectedPerson) && <em className="account-admin-badge">{adminBadge(selectedPerson)}</em>}
              </span>
            </button>
            <button className="primary-button" onClick={() => openTaskEditor(createBlankTask(defaultTaskOwnerId, selectedPersonId))} type="button">
              <Plus size={18} />
              업무 추가
            </button>
          </div>
        </header>

        {!["performance", "canvas", "admin"].includes(activeView) && <InsightStrip activeFilter={summaryFilter} onSelect={applySummaryFilter} summary={summary} />}

        <section className={`dashboard-grid ${activeView === "timeline" ? "timeline-layout" : ""} ${fullPageViews.includes(activeView) ? "calendar-layout" : ""} ${activeView === "admin" ? "admin-layout" : ""} ${isWorkflowDetailContext ? "workflow-detail-mode" : ""} ${isBriefingDetailContext ? "briefing-detail-mode" : ""}`}>
          <div className="main-column">
            {!fullPageViews.includes(activeView) && (
              <BriefingPanel
                briefing={briefing}
                briefingFeedbackKey={briefingFeedbackKey}
                briefingItems={briefingItems}
                isTeam={activePage === "team"}
                onAddBriefingItem={addBriefingItem}
                onDeleteBriefingItem={deleteBriefingItem}
                onSelectGroup={selectBriefingGroup}
                onToggleBriefingTodo={toggleBriefingTodo}
                onUpdateBriefingItem={updateBriefingItem}
                selectedPerson={selectedPerson}
                selectedBriefingKey={selectedBriefingKey}
                selectedTaskId={selectedTaskId}
                todayAgenda={todayAgenda}
              />
            )}

            {!fullPageViews.includes(activeView) && (
              <div className="control-row">
                <div className="segmented" role="tablist" aria-label="보기 전환">
                  {[
                    ["board", "보드", ListChecks],
                    ["list", "리스트", ClipboardList],
                    ["timeline", "타임라인", CalendarDays],
                    ["recurring", recurringCount ? `반복 업무 ${recurringCount}` : "반복 업무", Clock3],
                    ["archive", `보관함 ${archiveCount}`, Archive],
                    ["mindmap", "마인드맵", Network]
                  ].map(([key, label, Icon]) => (
                    <button
                      className={activeView === key ? "active" : ""}
                      key={key}
                      onClick={() => changeWorkflowView(key)}
                      type="button"
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
                {summaryFilter && activeView === "board" && (
                  <button className="summary-filter-pill" onClick={() => setSummaryFilter("")} type="button">
                    요약: {summaryFilterLabels[summaryFilter]}
                    <X size={13} />
                  </button>
                )}
                <div className={`filter-select tag-filter-select ${selectedTagFilters.length ? "is-filtered" : ""}`}>
                  <Filter size={16} />
                  <button
                    aria-controls="tag-library-content"
                    aria-expanded={isTagLibraryOpen}
                    className="tag-filter-open-button"
                    onClick={openTagFilterPanel}
                    title={tagFilterTitle}
                    type="button"
                  >
                    태그: {tagFilterLabel}
                  </button>
                </div>
                {workflowFilterViews.includes(activeView) && (
                  <label className={`filter-select owner-filter ${ownerFilter !== "전체" ? "is-filtered" : ""}`}>
                    <select aria-label="담당자 필터" onChange={(event) => setOwnerFilter(event.target.value)} value={ownerFilter}>
                      <option value="전체">사람: 전체</option>
                      {ownerFilterOptions.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.id === UNASSIGNED_OWNER_ID ? "사람: 미지정" : `사람: ${person.name}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {workflowFilterViews.includes(activeView) && (
                  <label className={`filter-select priority-filter ${priorityFilter !== "전체" ? "is-filtered" : ""}`}>
                    <select aria-label="중요도 필터" onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}>
                      {priorityFilters.map((priority) => (
                        <option key={priority} value={priority}>
                          중요: {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {workflowFilterViews.includes(activeView) && (
                  <label className={`filter-select work-kind-filter ${workKindFilter !== "전체" ? "is-filtered" : ""}`}>
                    <select aria-label="스팟 업무 필터" onChange={(event) => setWorkKindFilter(event.target.value)} value={workKindFilter}>
                      {workKindFilters.map((filter) => (
                        <option key={filter} value={filter}>
                          {filter === "전체" ? "스팟: 전체" : "스팟만"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            {!fullPageViews.includes(activeView) && (
              <TagLibrary
                activeTags={selectedTagFilters}
                canManageTags={canManageTags}
                isOpen={isTagLibraryOpen}
                onAdd={addTag}
                onClearFilters={() => setCategory("전체")}
                onDelete={deleteTag}
                onDeletePreset={deleteTagGroup}
                onFilter={setCategory}
                onRename={renameTag}
                onSavePreset={saveTagGroup}
                onToggleOpen={setIsTagLibraryOpen}
                presets={tagGroups}
                libraryRef={tagLibraryRef}
                tags={availableTags}
              />
            )}

            {activeView === "board" && (
              <section className={`workflow-context-grid ${isWorkflowDetailContext ? "has-context-detail" : ""}`} ref={workflowSurfaceRef}>
                <BoardView
                  canManageTask={(task) => canManageTaskFor(task, selectedPersonId)}
                  counts={counts}
                  onEdit={(task) => openTaskEditor(task)}
                  onArchive={(task) => toggleArchive(task.id, true)}
                  onSelect={(taskId) => selectTask(taskId, "workflow")}
                  onStatusChange={updateStatus}
                  selectedTaskPulseId={selectedTaskPulseId}
                  selectedTaskId={isWorkflowDetailContext ? selectedTaskId : ""}
                  showOwner={activePage === "team"}
                  statusPulseTaskId={statusPulseTaskId}
                  tasks={filteredTasks}
                />
                {isWorkflowDetailContext && (
                  <aside className="workflow-detail-column" ref={workflowDetailColumnRef}>
                    {detailPanel}
                  </aside>
                )}
              </section>
            )}
            {activeView === "list" && (
              <section className={`workflow-context-grid ${isWorkflowDetailContext ? "has-context-detail" : ""}`} ref={workflowSurfaceRef}>
                <TaskListView
                  onSelect={(taskId) => selectTask(taskId, "workflow")}
                  selectedTaskId={isWorkflowDetailContext ? selectedTaskId : ""}
                  showOwner={activePage === "team"}
                  tasks={filteredTasks}
                />
                {isWorkflowDetailContext && (
                  <aside className="workflow-detail-column" ref={workflowDetailColumnRef}>
                    {detailPanel}
                  </aside>
                )}
              </section>
            )}
            {activeView === "timeline" && (
              <section className={`workflow-context-grid ${isWorkflowDetailContext ? "has-context-detail" : ""}`}>
                <TimelineView
                  mode={timelineMode}
                  month={timelineMonth}
                  onModeChange={setTimelineMode}
                  onMonthChange={setTimelineMonth}
                  onSelect={(taskId) => selectTask(taskId, "workflow")}
                  onYearChange={setTimelineYear}
                  tasks={filteredTasks}
                  year={timelineYear}
                />
                {isWorkflowDetailContext && (
                  <aside className="workflow-detail-column" ref={workflowDetailColumnRef}>
                    {detailPanel}
                  </aside>
                )}
              </section>
            )}
            {activeView === "calendar" && (
              <CalendarView
                canManageEvent={(event) => canManageCalendarEventFor(event, selectedPersonId)}
                canManageTask={(task) => canManageTaskFor(task, selectedPersonId)}
                events={calendarEvents}
                month={timelineMonth}
                onAddEvent={addCalendarEvent}
                onAddLink={addTaskLink}
                onAddUpdate={addTaskUpdate}
                onArchive={(task) => toggleArchive(task.id, true)}
                onDeleteEvent={deleteCalendarEvent}
                onDelete={(task) => deleteTask(task.id)}
                onDeleteHistory={(task, entry, index) => deleteTaskHistoryEntry(task.id, entry, index)}
                onDeleteUpdate={(task, update, index) => deleteTaskUpdateEntry(task.id, update, index)}
                onEdit={(task) => openTaskEditor(tasks.find((item) => item.id === task.id) || task)}
                onMonthChange={setTimelineMonth}
                onRestore={(task) => toggleArchive(task.id, false)}
                onSelectTask={selectTask}
                onToggleSubtask={toggleSubtask}
                onUpdateHistory={(task, entry, index, note) => updateTaskHistoryEntry(task.id, entry, index, note)}
                onUpdateLog={(task, update, index, text) => updateTaskUpdateEntry(task.id, update, index, text)}
                onUpdateEvent={updateCalendarEvent}
                selectedPersonId={selectedPersonId}
                tasks={filteredTasks}
              />
            )}
            {activeView === "recurring" && (
              <section className={`workflow-context-grid ${isWorkflowDetailContext ? "has-context-detail" : ""}`}>
                <RecurringView
                  canManageTask={(task) => canManageTaskFor(task, selectedPersonId)}
                  onEditRecurring={(task) => openTaskEditor(task, "recurringRule")}
                  onSelect={(taskId) => selectTask(taskId, "workflow")}
                  onSelectOccurrence={(task) => selectTask(task, "workflow")}
                  onStopRecurring={stopRecurring}
                  tasks={filteredTasks}
                />
                {isWorkflowDetailContext && (
                  <aside className="workflow-detail-column" ref={workflowDetailColumnRef}>
                    {detailPanel}
                  </aside>
                )}
              </section>
            )}
            {activeView === "archive" && (
              <section className={`workflow-context-grid ${isWorkflowDetailContext ? "has-context-detail" : ""}`}>
                <ArchiveView
                  isTeamScope={activePage === "team"}
                  onFillDemo={!isSupabaseReady ? fillArchiveDemoData : null}
                  onRestore={(task) => toggleArchive(task.id, false)}
                  onSelect={(taskId) => selectTask(taskId, "workflow")}
                  people={teamMembers}
                  tasks={filteredTasks}
                />
                {isWorkflowDetailContext && (
                  <aside className="workflow-detail-column" ref={workflowDetailColumnRef}>
                    {detailPanel}
                  </aside>
                )}
              </section>
            )}
            {activeView === "mindmap" && (
              <section className={`workflow-context-grid ${isWorkflowDetailContext ? "has-context-detail" : ""}`}>
                <Suspense fallback={<div className="mindmap-loading">마인드맵을 불러오는 중입니다.</div>}>
                  <MindmapView
                    onFillDemo={fillMindmapDemoData}
                    onFilterTags={applyMindmapTagFilter}
                    onSelectTask={(taskId) => selectTask(taskId, "workflow")}
                    people={directory}
                    presets={tagGroups}
                    tasks={mindmapTasks}
                  />
                </Suspense>
                {isWorkflowDetailContext && (
                  <aside className="workflow-detail-column" ref={workflowDetailColumnRef}>
                    {detailPanel}
                  </aside>
                )}
              </section>
            )}
            {activeView === "updates" && (
              <UpdatesView
                initialScope={activePage === "team" ? "team" : "mine"}
                onAddUpdate={addTaskUpdate}
                onSelect={selectTask}
                selectedPersonId={selectedPersonId}
                tasks={tasks.filter((task) => !isDeletedTask(task) && !task.archived)}
              />
            )}
            {activeView === "performance" && (
              <PerformanceView
                isWikiReady={isApiReady && authStatus === "signed-in" && isAuthenticated}
                onReadWikiPage={readPublishedWikiPage}
                onSearchWikiPages={searchPublishedWikiPages}
                postCategories={taskPostCategories}
                tasks={tasks}
              />
            )}
            {activeView === "canvas" && (
              <Suspense fallback={<div className="shared-canvas-loading">Canvas를 불러오는 중입니다.</div>}>
                <SharedCanvasView
                  canvasStore={remoteDashboardStore.canvas}
                  isSharedCanvasReady={isSupabaseReady && isAuthenticated && authStatus === "signed-in"}
                />
              </Suspense>
            )}
            {activeView === "admin" && isSelectedAdmin && (
              <AdminView
                currentPersonId={selectedPersonId}
                onAddTag={addTag}
                onApproveWikiDraft={approveWikiReviewDraft}
                onDeletePreset={deleteTagGroup}
                onDeleteTag={deleteTag}
                onMoveTagToPreset={moveTagToPreset}
                onRenameTag={renameTag}
                onRenameWorkstream={renameWorkstream}
                onRefreshWikiDrafts={loadWikiReviewDrafts}
                onRejectWikiDraft={rejectWikiReviewDraft}
                onSavePostCategory={saveTaskPostCategory}
                onDeletePostCategory={deleteTaskPostCategory}
                onLoadWorkstreamSuggestions={loadWorkstreamSuggestionCandidates}
                onCreateWikiDraftFromRecommendation={createWikiDraftFromRecommendation}
                onRefreshWikiRecommendations={loadWikiRecommendations}
                onSavePreset={saveTagGroup}
                onUpdateWikiDraft={updateWikiReviewDraft}
                onUpdateUserAdministration={updateUserAdministration}
                people={directory}
                postCategories={taskPostCategories}
                presets={tagGroups}
                tags={availableTags}
                tasks={tasks}
                wikiDraftError={wikiReviewError}
                wikiDraftStatus={wikiReviewStatus}
                wikiDrafts={wikiReviewDrafts}
                wikiDraftsReady={isApiReady && authStatus === "signed-in" && isAuthenticated}
                wikiRecommendationError={wikiRecommendationError}
                wikiRecommendationStatus={wikiRecommendationStatus}
                wikiRecommendations={wikiRecommendations}
              />
            )}
          </div>

          {isBriefingDetailContext && <aside className="right-column" ref={detailColumnRef}>
            {selectedBriefingGroup ? (
              <BriefingDetail group={selectedBriefingGroup} isTeam={activePage === "team"} onClose={closeTaskDetail} onSelect={(taskId) => selectTask(taskId, "briefing")} selectedTaskId={selectedTaskId} />
            ) : (
              detailPanel
            )}
          </aside>}
        </section>
      </main>

      {editingTask && (
        <TaskModal
          availableTags={availableTags}
          mode={editingTaskMode}
          onClose={closeTaskEditor}
          onSave={saveTask}
          task={editingTask}
          workstreamOptions={workstreamOptions}
        />
      )}
      {pendingRecurringSave && (
        <RecurringEditScopeModal
          onCancel={() => setPendingRecurringSave(null)}
          onSelect={(scope) => saveTask(pendingRecurringSave.task, { recurringScope: scope })}
          task={pendingRecurringSave.task}
        />
      )}
      {isAccountOpen && (
        <AccountModal
          currentPersonId={selectedPersonId}
          onClose={() => setIsAccountOpen(false)}
          onLogin={loginAs}
          onLogout={logout}
          onUpdateProfile={updateProfile}
          onUpdateUserAdministration={updateUserAdministration}
          onUpdateEmoji={updateProfileEmoji}
          people={directory}
        />
      )}
    </div>
  );
}

function orderedAccounts(accounts) {
  const admins = accounts.filter((person) => person.permissionRole === "admin");
  const adminIds = new Set(admins.map((person) => person.id));
  return [...admins, ...teamCompositionOrder(teamAssignablePeople(accounts).filter((person) => !adminIds.has(person.id)))];
}

function EmojiPopover({ onSelect, selectedEmoji, triggerLabel = "이모지 선택", triggerClassName = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [emojiPickerComponent, setEmojiPickerComponent] = useState(null);
  const [emojiPickerLoadError, setEmojiPickerLoadError] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || emojiPickerComponent || emojiPickerLoadError) return undefined;

    let isCurrent = true;
    import("emoji-picker-react")
      .then((module) => {
        if (isCurrent) {
          setEmojiPickerLoadError(false);
          setEmojiPickerComponent(() => module.default);
        }
      })
      .catch((error) => {
        console.warn("이모지 선택기 로드에 실패했습니다.", error);
        if (isCurrent) {
          setEmojiPickerLoadError(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [emojiPickerComponent, emojiPickerLoadError, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = 320;
      const gap = 8;
      const margin = 12;
      const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
      const top = Math.min(rect.bottom + gap, window.innerHeight - 400);

      setPosition({ left, top: Math.max(margin, top) });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!popoverRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function chooseEmoji(emoji) {
    onSelect(emoji);
    setIsOpen(false);
  }

  function retryEmojiPickerLoad() {
    setEmojiPickerLoadError(false);
  }

  const Picker = emojiPickerComponent;

  return (
    <div className="emoji-popover" ref={triggerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={triggerLabel}
        className={`emoji-popover-trigger ${triggerClassName}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {selectedEmoji ? <span>{selectedEmoji}</span> : <SmilePlus size={15} />}
      </button>
      {isOpen && createPortal(
        <div
          className="emoji-popover-content"
          ref={popoverRef}
          role="dialog"
          aria-label="이모지 선택기"
          style={{ left: position.left, top: position.top }}
        >
          {Picker ? (
            <Picker
              autoFocusSearch
              className="dashboard-emoji-picker"
              emojiStyle="native"
              height={360}
              lazyLoadEmojis
              onEmojiClick={(emojiData) => chooseEmoji(emojiData.emoji)}
              previewConfig={{ showPreview: false }}
              searchPlaceHolder="이모지 검색"
              searchPlaceholder="이모지 검색"
              suggestedEmojisMode="recent"
              theme="light"
              width={300}
            />
          ) : emojiPickerLoadError ? (
            <div className="emoji-picker-loading failed">
              <span>이모지 선택기를 불러오지 못했습니다.</span>
              <button type="button" onClick={retryEmojiPickerLoad}>다시 시도</button>
            </div>
          ) : (
            <div className="emoji-picker-loading">이모지 불러오는 중</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function insertEmojiAtCursor(textareaRef, currentValue, emoji, onChange) {
  const textarea = textareaRef.current;

  if (!textarea) {
    onChange(`${currentValue}${emoji}`);
    return;
  }

  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? start;
  const nextValue = `${currentValue.slice(0, start)}${emoji}${currentValue.slice(end)}`;

  onChange(nextValue);

  requestAnimationFrame(() => {
    textarea.focus();
    const nextCursor = start + emoji.length;
    textarea.setSelectionRange(nextCursor, nextCursor);
  });
}

function LoginScreen({
  assistantError,
  assistantPrompt,
  assistantResult,
  assistantStatus,
  authMessage,
  authStatus,
  isAlreadyAuthenticated,
  isAssistantRemoteReady,
  isSupabaseReady,
  onAssistantAsk,
  onAssistantDraftTask,
  onAssistantPromptChange,
  onEnterDashboard,
  onLogin,
  onSupabaseAuth,
  people
}) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [profileEmoji, setProfileEmoji] = useState("🌿");
  const localAccounts = useMemo(() => orderedAccounts(people), [people]);
  const [selectedLocalPersonId, setSelectedLocalPersonId] = useState(() => localAccounts[0]?.id ?? "");
  const selectedLocalPerson = localAccounts.find((person) => person.id === selectedLocalPersonId) ?? localAccounts[0];
  const isSubmitting = authStatus === "submitting" || authStatus === "checking";

  useEffect(() => {
    if (!localAccounts.length) return;
    if (!localAccounts.some((person) => person.id === selectedLocalPersonId)) {
      setSelectedLocalPersonId(localAccounts[0].id);
    }
  }, [localAccounts, selectedLocalPersonId]);

  function submit(event) {
    event.preventDefault();
    if (!isSupabaseReady) return;
    onSupabaseAuth({
      mode,
      email: email.trim(),
      password,
      name: name.trim() || email.split("@")[0] || "새 사용자",
      profileEmoji
    });
  }

  return (
    <main className="login-screen poslab-entry-screen">
      <div className="poslab-entry-gradient" aria-hidden="true" />
      <section className="poslab-entry-shell" aria-label="POSLAB Work Hub 시작">
        <div className="poslab-entry-visual">
          <div className="poslab-brand-kicker">
            <span className="poslab-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>연구기획그룹-전략</span>
          </div>
          <Suspense fallback={<div className="poslab-lanyard-fallback" />}>
            <PoslabLanyard />
          </Suspense>
        </div>

        <div className="poslab-entry-panel">
          <div className="poslab-entry-heading">
            <span className="panel-label">POSCO</span>
            <h1>
              <span>POSLAB</span>
              <span className="hub-gradient-text">Work Hub</span>
            </h1>
            <p>함께 보는 업무, 함께 만드는 흐름, 함께 성장하는 팀</p>
          </div>

          {isSupabaseReady && !isAlreadyAuthenticated ? (
            <form className="auth-form poslab-auth-form" onSubmit={submit}>
              <div className="auth-mode-tabs" role="tablist" aria-label="로그인 방식">
                <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">
                  로그인
                </button>
                <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
                  권한 요청
                </button>
              </div>

              {mode === "signup" && (
                <label className="auth-field">
                  <span>이름</span>
                  <input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="예: 장형민" value={name} />
                </label>
              )}

              <label className="auth-field">
                <span>회사 이메일</span>
                <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="seulgis@posco.com" type="email" value={email} />
              </label>

              <label className="auth-field">
                <span>비밀번호</span>
                <input autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} onChange={(event) => setPassword(event.target.value)} placeholder="6자 이상" type="password" value={password} />
              </label>

              {mode === "signup" && (
                <div className="auth-emoji-row">
                  <span>프로필 이모지</span>
                  <EmojiPopover
                    selectedEmoji={profileEmoji}
                    onSelect={setProfileEmoji}
                    triggerLabel="가입 프로필 이모지 선택"
                    triggerClassName="profile-emoji-trigger"
                  />
                </div>
              )}

              {authMessage && <p className="auth-message">{authMessage}</p>}

              <button className="primary-button auth-submit poslab-enter-button" disabled={isSubmitting || !email.trim() || !password} type="submit">
                <LogIn size={17} />
                {isSubmitting ? "확인 중" : mode === "signup" ? "권한 요청 보내기" : "로그인"}
              </button>
            </form>
          ) : (
            <div className="poslab-local-entry">
              <button
                className="primary-button poslab-enter-button"
                disabled={!isAlreadyAuthenticated && !selectedLocalPerson}
                onClick={() => {
                  if (isAlreadyAuthenticated) {
                    onEnterDashboard();
                    return;
                  }
                  if (selectedLocalPerson) onLogin(selectedLocalPerson.id);
                }}
                type="button"
              >
                <LogIn size={17} />
                대시보드로 들어가기
              </button>
              {!isAlreadyAuthenticated && (
                <div className="login-account-grid poslab-account-grid" aria-label="로그인 계정 선택">
                  {localAccounts.map((person) => (
                    <button
                      aria-pressed={person.id === selectedLocalPersonId}
                      className={`login-account-card role-${person.permissionRole} ${person.id === selectedLocalPersonId ? "selected" : ""}`}
                      key={person.id}
                      onClick={() => setSelectedLocalPersonId(person.id)}
                      type="button"
                    >
                      <span className="profile-emoji" style={avatarStyle(person)}>
                        {person.emoji}
                      </span>
                      <span>
                        <strong>{person.name}</strong>
                        <small>{roleLine(person)}</small>
                      </span>
                      {person.id === selectedLocalPersonId ? <Check size={16} /> : <LogIn size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(!isSupabaseReady || isAlreadyAuthenticated) && (
            <AiAssistantPanel
              className="entry-ai-panel"
              error={assistantError}
              isRemoteReady={isAssistantRemoteReady}
              onAsk={onAssistantAsk}
              onCreateDraftTask={() => onAssistantDraftTask(isAlreadyAuthenticated ? undefined : selectedLocalPerson?.id)}
              onPromptChange={onAssistantPromptChange}
              prompt={assistantPrompt}
              result={assistantResult}
              status={assistantStatus}
            />
          )}

          <p className="auth-footnote">회사 로그인 연동이 확정되면 이 진입 화면은 SSO 시작 화면으로 전환할 수 있습니다.</p>
        </div>
      </section>
    </main>
  );
}

function AdminView({ currentPersonId, onAddTag, onApproveWikiDraft, onCreateWikiDraftFromRecommendation, onDeletePostCategory, onDeletePreset, onDeleteTag, onLoadWorkstreamSuggestions, onMoveTagToPreset, onRefreshWikiDrafts, onRefreshWikiRecommendations, onRejectWikiDraft, onRenameTag, onRenameWorkstream, onSavePostCategory, onSavePreset, onUpdateUserAdministration, onUpdateWikiDraft, people, postCategories, presets, tags, tasks, wikiDraftError = "", wikiDraftStatus = "idle", wikiDrafts = [], wikiDraftsReady = false, wikiRecommendationError = "", wikiRecommendationStatus = "idle", wikiRecommendations = [] }) {
  const [activeAdminTab, setActiveAdminTab] = useState("people");
  const activeTasks = useMemo(() => (tasks ?? []).filter((task) => task && !isDeletedTask(task)), [tasks]);
  const workstreamGroups = useMemo(
    () => groupTasksByWorkstream(activeTasks, collectWorkstreams(activeTasks)),
    [activeTasks]
  );
  const tabs = [
    { id: "people", label: "사람 관리", count: teamAssignablePeople(people).length },
    { id: "tags", label: "태그 관리", count: tags.length },
    { id: "workstreams", label: "업무흐름 관리", count: workstreamGroups.filter((group) => group.label).length },
    { id: "postTypes", label: "게시글 유형 관리", count: normalizeTaskPostCategories(postCategories).filter((category) => category.active).length },
    { id: "wikiDrafts", label: "Wiki 초안", count: wikiDrafts.length + wikiRecommendations.length }
  ];

  return (
    <section className="admin-page" aria-label="관리자">
      <div className="admin-page-header">
        <div>
          <span className="panel-label">
            <ShieldCheck size={14} />
            관리자
          </span>
          <h2>운영 관리</h2>
        </div>
        <p>사람, 태그, 상위 업무흐름을 업무 화면과 분리해서 넓게 관리합니다.</p>
      </div>
      <div className="admin-page-tabs" role="tablist" aria-label="관리자 관리 항목">
        {tabs.map((tab) => (
          <button
            className={activeAdminTab === tab.id ? "active" : ""}
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            type="button"
          >
            {tab.label}
            <small>{tab.count}</small>
          </button>
        ))}
      </div>
      {activeAdminTab === "people" && (
        <AdminPeoplePanel
          currentPersonId={currentPersonId}
          onUpdateUserAdministration={onUpdateUserAdministration}
          people={people}
        />
      )}
      {activeAdminTab === "tags" && (
        <AdminTagsPanel
          onAddTag={onAddTag}
          onDeletePreset={onDeletePreset}
          onDeleteTag={onDeleteTag}
          onMoveTagToPreset={onMoveTagToPreset}
          onRenameTag={onRenameTag}
          onSavePreset={onSavePreset}
          presets={presets}
          tags={tags}
          tasks={activeTasks}
        />
      )}
      {activeAdminTab === "workstreams" && (
        <AdminWorkstreamsPanel
          groups={workstreamGroups}
          onLoadSuggestions={onLoadWorkstreamSuggestions}
          onRenameWorkstream={onRenameWorkstream}
          people={people}
        />
      )}
      {activeAdminTab === "postTypes" && (
        <AdminPostCategoriesPanel
          categories={postCategories}
          onDelete={onDeletePostCategory}
          onSave={onSavePostCategory}
        />
      )}
      {activeAdminTab === "wikiDrafts" && (
        <AdminWikiDraftsPanel
          drafts={wikiDrafts}
          error={wikiDraftError}
          isReady={wikiDraftsReady}
          onApprove={onApproveWikiDraft}
          onCreateRecommendationDraft={onCreateWikiDraftFromRecommendation}
          onRefresh={onRefreshWikiDrafts}
          onRefreshRecommendations={onRefreshWikiRecommendations}
          onReject={onRejectWikiDraft}
          onUpdate={onUpdateWikiDraft}
          recommendationError={wikiRecommendationError}
          recommendationStatus={wikiRecommendationStatus}
          recommendations={wikiRecommendations}
          status={wikiDraftStatus}
        />
      )}
    </section>
  );
}

function AdminWikiDraftsPanel({ drafts, error, isReady, onApprove, onCreateRecommendationDraft, onRefresh, onRefreshRecommendations, onReject, onUpdate, recommendationError, recommendationStatus, recommendations, status }) {
  return (
    <section className="admin-panel wiki-drafts-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="panel-label">
            <NotebookPen size={14} />
            LLM-Wiki 검토
          </span>
          <h3>대기 중인 Wiki 초안</h3>
        </div>
        <p>업무 상세에서 만든 Wiki 초안을 사람이 승인해야 팀 Wiki page로 발행합니다.</p>
      </div>
      <div className="wiki-drafts-toolbar">
        <span>{isReady ? `검토 대기 ${drafts.length}건 · 추천 후보 ${recommendations.length}건` : "FastAPI 로그인 필요"}</span>
        <div className="wiki-drafts-toolbar-actions">
          <button className="secondary-button small" disabled={!isReady || recommendationStatus === "loading" || status === "saving"} onClick={onRefreshRecommendations} type="button">
            <Sparkles size={13} />
            추천 후보
          </button>
          <button className="secondary-button small" disabled={!isReady || status === "loading" || status === "saving"} onClick={onRefresh} type="button">
            <RotateCcw size={13} />
            새로고침
          </button>
        </div>
      </div>
      {error && <div className="inline-warning">{error}</div>}
      {recommendationError && <div className="inline-warning">{recommendationError}</div>}
      {!isReady && (
        <div className="empty-state compact">
          <strong>회사 DB 연결 후 사용할 수 있습니다.</strong>
          <p>Wiki 초안 검토는 FastAPI 로그인과 관리자 권한이 필요합니다.</p>
        </div>
      )}
      {isReady && recommendations.length > 0 && (
        <div className="wiki-recommendation-list" aria-label="Wiki 정리 추천 후보">
          {recommendations.map((recommendation) => (
            <WikiRecommendationCard
              key={recommendation.task_id}
              onCreateDraft={onCreateRecommendationDraft}
              recommendation={recommendation}
              status={status}
            />
          ))}
        </div>
      )}
      {isReady && drafts.length === 0 && (
        <div className="empty-state compact">
          <strong>검토 대기 초안 없음</strong>
          <p>{recommendations.length > 0 ? "추천 후보에서 초안을 만들면 여기에 표시됩니다." : "업무 상세의 `Wiki로 정리` 버튼이나 추천 후보에서 초안을 만들면 여기에 표시됩니다."}</p>
        </div>
      )}
      {isReady && drafts.length > 0 && (
        <div className="wiki-draft-list">
          {drafts.map((draft) => (
            <WikiDraftReviewCard
              draft={draft}
              key={draft.id}
              onApprove={onApprove}
              onReject={onReject}
              onUpdate={onUpdate}
              status={status}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WikiRecommendationCard({ onCreateDraft, recommendation, status }) {
  const evidence = recommendation.evidence_counts ?? {};
  const score = Math.round((Number(recommendation.score) || 0) * 100);
  const latestEvidenceLabel = recommendation.latest_evidence_at ? formatDate(String(recommendation.latest_evidence_at).slice(0, 10)) : "";
  const evidenceLabels = [
    evidence.updates ? `업데이트 ${evidence.updates}` : "",
    evidence.important_posts ? `중요기록 ${evidence.important_posts}` : "",
    evidence.image_evidence_posts ? `이미지근거 ${evidence.image_evidence_posts}` : "",
    recommendation.stale_existing_wiki ? "Wiki 갱신 필요" : ""
  ].filter(Boolean);

  return (
    <article className="wiki-recommendation-card">
      <div className="wiki-recommendation-head">
        <div>
          <span>
            <Sparkles size={12} />
            추천 {score}%
          </span>
          <strong>{recommendation.task_title}</strong>
          <small>{recommendation.workstream || "상위 업무흐름 미지정"} · {recommendation.status}</small>
        </div>
        <button className="secondary-button small" disabled={status === "saving"} onClick={() => onCreateDraft(recommendation)} type="button">
          <NotebookPen size={13} />
          초안 만들기
        </button>
      </div>
      <div className="wiki-recommendation-reasons">
        {(recommendation.reasons ?? []).slice(0, 4).map((reason) => (
          <span key={reason}>{reason}</span>
        ))}
      </div>
      <div className="wiki-recommendation-meta">
        {evidenceLabels.map((label) => (
          <small key={label}>{label}</small>
        ))}
        {latestEvidenceLabel && <small>최근 근거 {latestEvidenceLabel}</small>}
      </div>
    </article>
  );
}

function WikiDraftReviewCard({ draft, onApprove, onReject, onUpdate, status }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftPatch, setDraftPatch] = useState({
    proposed_title: draft.proposed_title || "",
    proposed_page_type: draft.proposed_page_type || "workstream",
    proposed_summary: draft.proposed_summary || "",
    proposed_body_markdown: draft.proposed_body_markdown || ""
  });

  useEffect(() => {
    setDraftPatch({
      proposed_title: draft.proposed_title || "",
      proposed_page_type: draft.proposed_page_type || "workstream",
      proposed_summary: draft.proposed_summary || "",
      proposed_body_markdown: draft.proposed_body_markdown || ""
    });
  }, [draft.id, draft.proposed_body_markdown, draft.proposed_page_type, draft.proposed_summary, draft.proposed_title]);

  async function submitDraftUpdate(event) {
    event.preventDefault();
    const proposedTitle = draftPatch.proposed_title.trim();
    if (!proposedTitle) return;
    const updatedDraft = await onUpdate?.(draft.id, {
      proposed_title: proposedTitle,
      proposed_page_type: draftPatch.proposed_page_type.trim() || "topic",
      proposed_summary: draftPatch.proposed_summary.trim(),
      proposed_body_markdown: draftPatch.proposed_body_markdown.trim()
    });
    if (updatedDraft) setIsEditing(false);
  }

  return (
    <article className="wiki-draft-card">
      <div className="wiki-draft-card-head">
        <div>
          <span>{draft.proposed_page_type}</span>
          <strong>{draft.proposed_title}</strong>
        </div>
        <small>{draft.created_by_ai_model}</small>
      </div>
      <p>{draft.proposed_summary || "요약 없음"}</p>
      <pre>{String(draft.proposed_body_markdown || "").slice(0, 900)}</pre>
      <div className="wiki-draft-meta">
        <span>출처 {draft.proposed_source_links?.length ?? 0}건</span>
        <span>{String(draft.created_at || "").slice(0, 10)}</span>
      </div>
      {isEditing && (
        <form className="wiki-draft-edit-form" onSubmit={submitDraftUpdate}>
          <label>
            제목
            <input
              onChange={(event) => setDraftPatch((current) => ({ ...current, proposed_title: event.target.value }))}
              value={draftPatch.proposed_title}
            />
          </label>
          <label>
            유형
            <input
              onChange={(event) => setDraftPatch((current) => ({ ...current, proposed_page_type: event.target.value }))}
              value={draftPatch.proposed_page_type}
            />
          </label>
          <label>
            요약
            <textarea
              onChange={(event) => setDraftPatch((current) => ({ ...current, proposed_summary: event.target.value }))}
              rows={2}
              value={draftPatch.proposed_summary}
            />
          </label>
          <label>
            본문
            <textarea
              onChange={(event) => setDraftPatch((current) => ({ ...current, proposed_body_markdown: event.target.value }))}
              rows={8}
              value={draftPatch.proposed_body_markdown}
            />
          </label>
          <div className="wiki-draft-actions">
            <button className="primary-button small" disabled={status === "saving" || !draftPatch.proposed_title.trim()} type="submit">
              <Check size={13} />
              수정 저장
            </button>
            <button className="secondary-button small" disabled={status === "saving"} onClick={() => setIsEditing(false)} type="button">
              취소
            </button>
          </div>
        </form>
      )}
      <div className="wiki-draft-actions">
        <button className="secondary-button small" disabled={status === "saving"} onClick={() => setIsEditing((current) => !current)} type="button">
          <Edit3 size={13} />
          {isEditing ? "수정 닫기" : "수정"}
        </button>
        <button className="primary-button small" disabled={status === "saving" || isEditing} onClick={() => onApprove?.(draft.id)} type="button">
          <Check size={13} />
          승인 발행
        </button>
        <button className="secondary-button small danger-text" disabled={status === "saving"} onClick={() => onReject?.(draft.id)} type="button">
          <X size={13} />
          거절
        </button>
      </div>
    </article>
  );
}

function AdminPostCategoriesPanel({ categories, onDelete, onSave }) {
  const normalizedCategories = normalizeTaskPostCategories(categories);
  const [selectedId, setSelectedId] = useState(normalizedCategories[0]?.id ?? "");
  const selectedCategory = normalizedCategories.find((category) => category.id === selectedId) ?? normalizedCategories[0];
  const [draft, setDraft] = useState(selectedCategory ?? { id: "", label: "", tone: "blue", active: true });

  useEffect(() => {
    if (!selectedCategory) return;
    setDraft(selectedCategory);
  }, [selectedCategory?.id, selectedCategory?.label, selectedCategory?.tone, selectedCategory?.active]);

  function submitCategory(event) {
    event.preventDefault();
    const savedId = draft.id || `post-type-${Date.now().toString(36)}`;
    onSave({ ...draft, id: savedId, previousLabel: selectedCategory?.label });
    setSelectedId(savedId);
  }

  function addCategory() {
    const id = `post-type-${Date.now().toString(36)}`;
    const next = { id, label: "새 게시글 유형", tone: "slate", active: true };
    setSelectedId(id);
    setDraft(next);
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="panel-label">
            <MessageSquareText size={14} />
            게시글 유형 관리
          </span>
          <h3>게시글 성격 구분</h3>
        </div>
        <p>결정사항, 회의록, 중요문서처럼 나중에 찾기 쉬운 게시글 유형을 관리합니다.</p>
      </div>
      <div className="admin-tree-manager post-category-manager">
        <section className="admin-tree-pane">
          <div className="admin-tree-head">
            <strong>게시글 유형</strong>
            <small>{normalizedCategories.filter((category) => category.active).length}개 사용</small>
          </div>
          <div className="admin-tree-list">
            {normalizedCategories.map((category) => (
              <button
                className={`admin-tree-file post-category-file tone-${category.tone} ${selectedCategory?.id === category.id ? "active" : ""} ${category.active ? "" : "inactive"}`}
                key={category.id}
                onClick={() => setSelectedId(category.id)}
                type="button"
              >
                <MessageSquareText size={14} />
                <span>{category.label}</span>
                <small>{category.active ? "사용" : "숨김"}</small>
              </button>
            ))}
          </div>
          <button className="secondary-button small" onClick={addCategory} type="button">
            <Plus size={14} />
            유형 추가
          </button>
        </section>
        <section className="admin-editor-pane">
          <div className="admin-editor-head">
            <strong>유형 수정</strong>
            <small>작성창 선택지와 게시글 칩에 반영</small>
          </div>
          <form className="admin-editor-form" onSubmit={submitCategory}>
            <label>
              <small>유형 이름</small>
              <input
                onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                value={draft.label ?? ""}
              />
            </label>
            <label>
              <small>색상</small>
              <select
                onChange={(event) => setDraft((current) => ({ ...current, tone: event.target.value }))}
                value={draft.tone ?? "slate"}
              >
                <option value="blue">파랑</option>
                <option value="green">초록</option>
                <option value="amber">노랑</option>
                <option value="red">빨강</option>
                <option value="violet">보라</option>
                <option value="slate">회색</option>
              </select>
            </label>
            <label className="admin-mini-toggle">
              <input
                checked={draft.active !== false}
                onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))}
                type="checkbox"
              />
              작성창에 표시
            </label>
            <div className="admin-editor-actions">
              <button className="secondary-button small" type="submit">저장</button>
              <button className="secondary-button small danger-text" onClick={() => onDelete(draft.id)} type="button">
                비활성화
              </button>
            </div>
            <p className="admin-editor-note">이름을 바꾸면 실제 저장된 게시글의 유형명도 함께 갱신됩니다.</p>
          </form>
        </section>
      </div>
    </section>
  );
}

function AdminPeoplePanel({ currentPersonId, onUpdateUserAdministration, people }) {
  const adminManageablePeople = orderedAccounts(people);
  const [rosterDraft, setRosterDraft] = useState({
    name: "",
    role: "책임",
    expectedEmail: "",
    permissionRole: "member"
  });

  function isRosterProfile(person) {
    return !person.authUserId && person.permissionRole !== "admin";
  }

  function addRosterMember(event) {
    event.preventDefault();
    const cleanName = rosterDraft.name.trim();
    const cleanRole = rosterDraft.role.trim();
    if (!cleanName || !cleanRole) return;
    onUpdateUserAdministration(`roster-${Date.now().toString(36)}`, {
      name: cleanName,
      title: cleanRole,
      profileEmoji: "🌿",
      expectedEmail: rosterDraft.expectedEmail.trim(),
      permissionRole: rosterDraft.permissionRole,
      isTeamMember: true,
      isActive: true
    });
    setRosterDraft({
      name: "",
      role: "책임",
      expectedEmail: "",
      permissionRole: "member"
    });
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="panel-label">
            <UserCog size={14} />
            사람 관리
          </span>
          <h3>계정, 권한, 팀 표시</h3>
        </div>
        <p>관리자/팀장/팀원 권한과 팀원 표시 여부를 한곳에서 정리합니다.</p>
      </div>
      <form className="admin-roster-add-form admin-page-roster-form" onSubmit={addRosterMember}>
        <label>
          <small>이름</small>
          <input
            onChange={(event) => setRosterDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="신규 팀원"
            value={rosterDraft.name}
          />
        </label>
        <label>
          <small>직책</small>
          <input
            onChange={(event) => setRosterDraft((current) => ({ ...current, role: event.target.value }))}
            value={rosterDraft.role}
          />
        </label>
        <label>
          <small>예정 이메일</small>
          <input
            onChange={(event) => setRosterDraft((current) => ({ ...current, expectedEmail: event.target.value }))}
            placeholder="name@company.com"
            type="email"
            value={rosterDraft.expectedEmail}
          />
        </label>
        <label>
          <small>권한</small>
          <select
            onChange={(event) => setRosterDraft((current) => ({ ...current, permissionRole: event.target.value }))}
            value={rosterDraft.permissionRole}
          >
            <option value="member">팀원</option>
            <option value="lead">팀장</option>
          </select>
        </label>
        <button className="secondary-button small" type="submit">
          <Plus size={14} />
          로스터 추가
        </button>
      </form>
      <div className="admin-wide-list">
        {adminManageablePeople.map((person) => (
          <div className="admin-user-row admin-page-user-row" key={person.id}>
            <span className="profile-emoji" style={avatarStyle(person)}>
              {person.emoji}
            </span>
            <span className="admin-user-identity">
              {isRosterProfile(person) ? (
                <span className="admin-roster-name-fields">
                  <label>
                    <small>이름</small>
                    <input
                      aria-label={`${person.name} 이름`}
                      defaultValue={person.name}
                      onBlur={(event) => onUpdateUserAdministration(person.id, { name: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                  </label>
                  <label>
                    <small>직책</small>
                    <input
                      aria-label={`${person.name} 직책`}
                      defaultValue={person.role}
                      onBlur={(event) => onUpdateUserAdministration(person.id, { title: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                  </label>
                </span>
              ) : (
                <>
                  <strong>{person.name}</strong>
                  <small>{person.role}</small>
                </>
              )}
            </span>
            <label className="admin-email-field">
              <small>예정 이메일</small>
              <input
                onBlur={(event) => onUpdateUserAdministration(person.id, { expectedEmail: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                placeholder="가입 예정 이메일"
                type="email"
                defaultValue={person.expectedEmail ?? ""}
              />
            </label>
            <label>
              <small>권한</small>
              <select
                onChange={(event) => onUpdateUserAdministration(person.id, { permissionRole: event.target.value })}
                value={person.permissionRole ?? "member"}
              >
                <option value="member">팀원</option>
                <option value="lead">팀장</option>
                <option value="admin">관리자</option>
              </select>
            </label>
            <label className="admin-mini-toggle">
              <input
                checked={person.isTeamMember !== false}
                onChange={(event) => onUpdateUserAdministration(person.id, { isTeamMember: event.target.checked })}
                type="checkbox"
              />
              팀 표시
            </label>
            <label className="admin-mini-toggle">
              <input
                checked={person.isActive !== false}
                onChange={(event) => onUpdateUserAdministration(person.id, { isActive: event.target.checked })}
                disabled={person.id === currentPersonId}
                type="checkbox"
              />
              활성
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminTagsPanel({ onAddTag, onDeletePreset, onDeleteTag, onMoveTagToPreset, onRenameTag, onSavePreset, presets, tags, tasks }) {
  const [newTag, setNewTag] = useState("");
  const [newPresetDraft, setNewPresetDraft] = useState({ label: "", tagsText: "" });
  const [selection, setSelection] = useState({ type: "category", id: presets[0]?.id ?? "uncategorized" });
  const [presetEditDraft, setPresetEditDraft] = useState({ label: "", tagsText: "" });
  const [tagEditValue, setTagEditValue] = useState("");
  const [collapsedPresetIds, setCollapsedPresetIds] = useState(() => new Set());
  const groupedTagNames = new Set(presets.flatMap((preset) => preset.tags));
  const uncategorizedTags = tags.filter((tag) => !groupedTagNames.has(tag));
  const tagRows = tags.map((tag) => ({
    label: tag,
    count: tasks.filter((task) => taskTags(task).includes(tag)).length,
    categories: presets.filter((preset) => preset.tags.includes(tag)).map((preset) => preset.label)
  }));
  const selectedCategory = selection.type === "category"
    ? presets.find((preset) => preset.id === selection.id)
    : null;
  const selectedIsUncategorized = selection.type === "category" && selection.id === "uncategorized";
  const selectedTag = selection.type === "tag" ? tagRows.find((tag) => tag.label === selection.id) : null;

  useEffect(() => {
    const hasSelectedCategory = selection.type === "category" && (selection.id === "uncategorized" || presets.some((preset) => preset.id === selection.id));
    const hasSelectedTag = selection.type === "tag" && tags.includes(selection.id);
    if (hasSelectedCategory || hasSelectedTag) return;
    setSelection({ type: "category", id: presets[0]?.id ?? "uncategorized" });
  }, [presets, selection, tags]);

  useEffect(() => {
    if (selectedCategory) {
      setPresetEditDraft({ label: selectedCategory.label, tagsText: selectedCategory.tags.join(", ") });
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedTag) setTagEditValue(selectedTag.label);
  }, [selectedTag]);

  function submitTag(event) {
    event.preventDefault();
    onAddTag(newTag);
    setNewTag("");
  }

  function submitNewPreset(event) {
    event.preventDefault();
    onSavePreset({
      id: "",
      label: newPresetDraft.label,
      tags: normalizeTags(newPresetDraft.tagsText.split(",").map((tag) => tag.trim())),
      tone: "custom"
    });
    setNewPresetDraft({ label: "", tagsText: "" });
  }

  function submitSelectedPreset(event) {
    event.preventDefault();
    if (!selectedCategory) return;
    onSavePreset({
      ...selectedCategory,
      label: presetEditDraft.label,
      tags: normalizeTags(presetEditDraft.tagsText.split(",").map((tag) => tag.trim()))
    });
  }

  function submitTagEdit(event) {
    event.preventDefault();
    if (!selectedTag) return;
    onRenameTag(selectedTag.label, tagEditValue);
    setSelection({ type: "tag", id: tagEditValue.trim() || selectedTag.label });
  }

  function startTagDrag(event, tag) {
    event.dataTransfer.setData("text/plain", tag);
    event.dataTransfer.effectAllowed = "move";
  }

  function dropTag(event, targetPresetId) {
    event.preventDefault();
    const tag = event.dataTransfer.getData("text/plain");
    if (!tag) return;
    onMoveTagToPreset(tag, targetPresetId);
    setSelection({ type: "tag", id: tag });
  }

  function togglePresetFolder(groupId) {
    setSelection({ type: "category", id: groupId });
    setCollapsedPresetIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function tagTreeButton(tag, key) {
    const row = tagRows.find((item) => item.label === tag);
    return (
      <button
        className={`admin-tree-file ${selection.type === "tag" && selection.id === tag ? "active" : ""}`}
        draggable
        key={key}
        onClick={() => setSelection({ type: "tag", id: tag })}
        onDragStart={(event) => startTagDrag(event, tag)}
        type="button"
      >
        <FileText size={14} />
        <span>{tag}</span>
        <small>{row?.count ?? 0}</small>
      </button>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="panel-label">
            <Tag size={14} />
            태그 관리
          </span>
          <h3>Category와 태그 사전</h3>
        </div>
        <p>Category 폴더 안의 태그 파일처럼 보고, 클릭해서 수정하거나 드래그해서 옮깁니다.</p>
      </div>
      <div className="admin-tag-tools compact">
        <form className="admin-inline-form" onSubmit={submitTag}>
          <label>
            <small>새 태그</small>
            <input
              onChange={(event) => setNewTag(event.target.value)}
              placeholder="예: 행사"
              value={newTag}
            />
          </label>
          <button className="secondary-button small" type="submit">
            <Plus size={14} />
            태그 추가
          </button>
        </form>
        <form className="admin-inline-form admin-category-form" onSubmit={submitNewPreset}>
          <label>
            <small>새 Category</small>
            <input
              onChange={(event) => setNewPresetDraft((current) => ({ ...current, label: event.target.value }))}
              placeholder="예: 행사/확산"
              value={newPresetDraft.label}
            />
          </label>
          <label>
            <small>포함 태그</small>
            <input
              onChange={(event) => setNewPresetDraft((current) => ({ ...current, tagsText: event.target.value }))}
              placeholder="행사, 회의체"
              value={newPresetDraft.tagsText}
            />
          </label>
          <button className="secondary-button small" type="submit">
            Category 추가
          </button>
        </form>
      </div>
      <div className="admin-tree-manager">
        <section className="admin-tree-pane">
          <div className="admin-tree-head">
            <strong>태그 트리</strong>
            <small>{presets.length}개 폴더 · {tags.length}개 태그</small>
          </div>
          <div className="admin-tree-list">
            {presets.map((preset) => (
              <div
                className={`admin-tree-folder preset-${preset.tone} ${collapsedPresetIds.has(preset.id) ? "is-collapsed" : ""}`}
                key={preset.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropTag(event, preset.id)}
              >
                <button
                  className={`admin-tree-folder-button ${selection.type === "category" && selection.id === preset.id ? "active" : ""}`}
                  aria-expanded={!collapsedPresetIds.has(preset.id)}
                  onClick={() => togglePresetFolder(preset.id)}
                  type="button"
                >
                  {collapsedPresetIds.has(preset.id) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <FolderOpen size={15} />
                  <span>{preset.label}</span>
                  <small>{preset.tags.length}</small>
                </button>
                {!collapsedPresetIds.has(preset.id) && (
                  <div className="admin-tree-children">
                    {preset.tags.map((tag) => tagTreeButton(tag, `${preset.id}-${tag}`))}
                    {!preset.tags.length && <span className="admin-tree-empty">태그를 이 폴더로 드래그하세요.</span>}
                  </div>
                )}
              </div>
            ))}
            <div
              className={`admin-tree-folder preset-custom ${collapsedPresetIds.has("uncategorized") ? "is-collapsed" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropTag(event, "")}
            >
              <button
                className={`admin-tree-folder-button ${selectedIsUncategorized ? "active" : ""}`}
                aria-expanded={!collapsedPresetIds.has("uncategorized")}
                onClick={() => togglePresetFolder("uncategorized")}
                type="button"
              >
                {collapsedPresetIds.has("uncategorized") ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <FolderOpen size={15} />
                <span>미분류</span>
                <small>{uncategorizedTags.length}</small>
              </button>
              {!collapsedPresetIds.has("uncategorized") && (
                <div className="admin-tree-children">
                  {uncategorizedTags.map((tag) => tagTreeButton(tag, `loose-${tag}`))}
                  {!uncategorizedTags.length && <span className="admin-tree-empty">미분류 태그가 없습니다.</span>}
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="admin-editor-pane">
          <div className="admin-editor-head">
            <strong>{selectedTag ? "태그 수정" : "Category 수정"}</strong>
            <small>{selectedTag ? `${selectedTag.count}개 업무에서 사용` : selectedIsUncategorized ? "기본 폴더 없음" : `${selectedCategory?.tags.length ?? 0}개 태그`}</small>
          </div>
          {selectedCategory && (
            <form className="admin-editor-form" onSubmit={submitSelectedPreset}>
              <label>
                <small>Category 이름</small>
                <input
                  onChange={(event) => setPresetEditDraft((current) => ({ ...current, label: event.target.value }))}
                  value={presetEditDraft.label}
                />
              </label>
              <label>
                <small>포함 태그</small>
                <textarea
                  onChange={(event) => setPresetEditDraft((current) => ({ ...current, tagsText: event.target.value }))}
                  value={presetEditDraft.tagsText}
                />
              </label>
              <div className="admin-editor-actions">
                <button className="secondary-button small" type="submit">저장</button>
                <button className="secondary-button small danger-text" onClick={() => onDeletePreset(selectedCategory.id)} type="button">Category 삭제</button>
              </div>
              <p className="admin-editor-note">태그를 폴더로 드래그하면 이 목록도 함께 정리됩니다.</p>
            </form>
          )}
          {selectedIsUncategorized && (
            <div className="admin-editor-empty">
              <strong>미분류 태그</strong>
              <p>어느 Category에도 속하지 않은 태그입니다. 태그를 원하는 폴더로 드래그해서 정리하세요.</p>
            </div>
          )}
          {selectedTag && (
            <form className="admin-editor-form" onSubmit={submitTagEdit}>
              <label>
                <small>태그 이름</small>
                <input
                  aria-label={`${selectedTag.label} 태그 이름 수정`}
                  onChange={(event) => setTagEditValue(event.target.value)}
                  value={tagEditValue}
                />
              </label>
              <div className="admin-tag-detail-meta">
                <span>소속</span>
                <p>{selectedTag.categories.length ? selectedTag.categories.join(" · ") : "미분류"}</p>
              </div>
              <div className="admin-editor-actions">
                <button className="secondary-button small" type="submit">이름 저장</button>
                <button
                  className="secondary-button small danger-text"
                  onClick={() => {
                    onDeleteTag(selectedTag.label);
                    setSelection({ type: "category", id: presets[0]?.id ?? "uncategorized" });
                  }}
                  type="button"
                >
                  태그 삭제
                </button>
              </div>
              <p className="admin-editor-note">이름을 바꾸면 기존 업무에 붙은 태그도 함께 갱신됩니다.</p>
            </form>
          )}
          {!selectedCategory && !selectedIsUncategorized && !selectedTag && (
            <div className="admin-editor-empty">
              <strong>수정할 항목을 선택하세요.</strong>
              <p>왼쪽 트리에서 Category나 태그를 선택하면 이곳에서 바로 편집할 수 있습니다.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function normalizeAdminWorkstreamKey(label) {
  return String(label ?? "")
    .replace(/\s+(추진|관리|대응|운영|체계화|과제)$/u, "")
    .replace(/[()[\]{}.,:;'"`~!?·ㆍ/_-]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function similarWorkstreamCandidates(groups) {
  const labeledGroups = groups.filter((group) => group.label);
  const pairs = [];
  labeledGroups.forEach((group, index) => {
    const key = normalizeAdminWorkstreamKey(group.label);
    labeledGroups.slice(index + 1).forEach((other) => {
      const otherKey = normalizeAdminWorkstreamKey(other.label);
      if (!key || !otherKey || key === otherKey) return;
      if (key.length < 4 || otherKey.length < 4) return;
      if (key.includes(otherKey) || otherKey.includes(key)) {
        pairs.push({ labels: [group.label, other.label], count: group.tasks.length + other.tasks.length });
      }
    });
  });
  return pairs.slice(0, 6);
}

function countStatusLabels(tasks) {
  const counts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1;
    return acc;
  }, {});
  return ["진행중", "계획", "검토/대기", "완료", "보류"]
    .filter((status) => counts[status])
    .map((status) => ({ status, count: counts[status] }));
}

function AdminWorkstreamsPanel({ groups, onLoadSuggestions, onRenameWorkstream, people }) {
  const [editingLabel, setEditingLabel] = useState("");
  const [nextLabel, setNextLabel] = useState("");
  const [selectedLabel, setSelectedLabel] = useState(groups.find((group) => group.label)?.label ?? groups[0]?.label ?? "");
  const [apiCandidates, setApiCandidates] = useState([]);
  const [suggestionStatus, setSuggestionStatus] = useState("idle");
  const [suggestionError, setSuggestionError] = useState("");
  const localCandidates = similarWorkstreamCandidates(groups).map((candidate) => ({
    labels: candidate.labels,
    count: candidate.count,
    source: "화면",
    score: null,
    terms: [],
    reason: "업무흐름 이름의 핵심 문구가 일부 겹칩니다.",
    tasks: []
  }));
  const apiCandidateRows = apiCandidates.map((candidate) => ({
    labels: [candidate.primary_label, candidate.candidate_label].filter(Boolean),
    count: candidate.task_count ?? 0,
    source: "DB",
    score: candidate.score,
    terms: candidate.shared_terms ?? [],
    reason: candidate.reason,
    tasks: candidate.tasks ?? []
  }));
  const candidates = [...apiCandidateRows, ...localCandidates].filter((candidate, index, rows) => {
    const key = [...candidate.labels].sort().join("|");
    return candidate.labels.length === 2 && rows.findIndex((row) => [...row.labels].sort().join("|") === key) === index;
  });
  const labeledGroups = groups.filter((group) => group.label);
  const selectedGroup = groups.find((group) => group.label === selectedLabel) ?? labeledGroups[0] ?? groups[0] ?? null;
  const selectedCandidates = candidates.filter((candidate) => selectedGroup && candidate.labels.includes(selectedGroup.label));

  useEffect(() => {
    if (!groups.length) return;
    if (groups.some((group) => group.label === selectedLabel)) return;
    setSelectedLabel(groups.find((group) => group.label)?.label ?? groups[0]?.label ?? "");
  }, [groups, selectedLabel]);

  function submitRename(event) {
    event.preventDefault();
    onRenameWorkstream(editingLabel, nextLabel);
    setSelectedLabel(nextLabel.trim() || selectedLabel);
    setEditingLabel("");
    setNextLabel("");
  }

  function openRename(label) {
    setEditingLabel(label);
    setNextLabel(label);
  }

  async function loadSuggestions() {
    if (!onLoadSuggestions) {
      setSuggestionError("FastAPI 로그인 상태에서 DB 근거 추천을 사용할 수 있습니다.");
      return;
    }
    setSuggestionStatus("loading");
    setSuggestionError("");
    try {
      const suggestions = await onLoadSuggestions();
      setApiCandidates(Array.isArray(suggestions) ? suggestions : []);
      setSuggestionStatus("idle");
    } catch (error) {
      console.warn("업무흐름 추천을 불러오지 못했습니다.", error);
      setApiCandidates([]);
      setSuggestionError(error.message || "업무흐름 추천을 불러오지 못했습니다.");
      setSuggestionStatus("error");
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="panel-label">
            <Network size={14} />
            업무흐름 관리
          </span>
          <h3>상위 업무흐름 정리</h3>
        </div>
        <div className="admin-heading-actions">
          <p>업무명에서 자동 추천된 흐름을 검토하고, 비슷한 흐름은 이름을 맞춰 묶습니다.</p>
          <button className="secondary-button small" disabled={suggestionStatus === "loading"} onClick={loadSuggestions} type="button">
            <Sparkles size={13} />
            {suggestionStatus === "loading" ? "추천 중" : "DB 근거 추천"}
          </button>
        </div>
      </div>
      {suggestionError && <div className="inline-warning">{suggestionError}</div>}
      <div className="admin-tree-manager workstream-tree-manager">
        <section className="admin-tree-pane">
          <div className="admin-tree-head">
            <strong>상위 업무흐름</strong>
            <small>{labeledGroups.length}개</small>
          </div>
          <div className="admin-workstream-tree">
            {groups.map((group) => {
              const ownerNames = Array.from(new Set(group.tasks.map((task) => people.find((person) => person.id === task.ownerId)?.name ?? "미지정"))).slice(0, 3);
              const taskStatuses = countStatusLabels(group.tasks);
              return (
                <button
                  className={`admin-workstream-tree-row ${selectedGroup?.label === group.label ? "active" : ""}`}
                  key={group.label || "blank-workstream"}
                  onClick={() => setSelectedLabel(group.label)}
                  type="button"
                >
                  <span className="admin-workstream-dot" />
                  <span>
                    <strong>{group.label || "미지정"}</strong>
                    <small>{group.tasks.length}개 업무 · {ownerNames.join(", ") || "담당자 없음"}</small>
                  </span>
                  <em>{taskStatuses.map((item) => `${item.status} ${item.count}`).join(" · ") || "상태 없음"}</em>
                </button>
              );
            })}
          </div>
        </section>
        <section className="admin-editor-pane">
          <div className="admin-editor-head">
            <strong>{selectedGroup?.label || "업무흐름 없음"}</strong>
            <small>{selectedGroup ? `${selectedGroup.tasks.length}개 포함 업무` : "0개"}</small>
          </div>
          {selectedGroup && (
            <>
              {editingLabel === selectedGroup.label ? (
                <form className="admin-workstream-rename" onSubmit={submitRename}>
                  <label>
                    <small>현재 이름</small>
                    <input readOnly value={editingLabel} />
                  </label>
                  <label>
                    <small>새 이름</small>
                    <input
                      autoFocus
                      onChange={(event) => setNextLabel(event.target.value)}
                      value={nextLabel}
                    />
                  </label>
                  <button className="secondary-button small" type="submit">이름 적용</button>
                  <button className="secondary-button small" onClick={() => setEditingLabel("")} type="button">취소</button>
                </form>
              ) : (
                selectedGroup.label && (
                  <button className="secondary-button small admin-editor-primary-action" onClick={() => openRename(selectedGroup.label)} type="button">
                    이름 수정
                  </button>
                )
              )}
              <div className="admin-workstream-summary">
                {countStatusLabels(selectedGroup.tasks).map((item) => (
                  <span className={`task-status-chip status-${item.status.replace("/", "")}`} key={`${selectedGroup.label}-${item.status}`}>
                    {item.status} {item.count}
                  </span>
                ))}
              </div>
              <div className="admin-workstream-task-list">
                <strong>포함 업무</strong>
                {selectedGroup.tasks.map((task) => (
                  <button className="admin-workstream-task-row" key={task.id} type="button">
                    <span>{displayTaskTitle(task)}</span>
                    <small>{people.find((person) => person.id === task.ownerId)?.name ?? "미지정"} · {task.status}</small>
                  </button>
                ))}
              </div>
              <div className="admin-similar-compact">
                <div className="admin-editor-head slim">
                  <strong>비슷한 흐름 후보</strong>
                  <small>{selectedCandidates.length}개 · DB {apiCandidateRows.length}개</small>
                </div>
                {selectedCandidates.map((candidate) => {
                  const mergeTarget = candidate.labels.find((label) => label !== selectedGroup.label) ?? candidate.labels[0];
                  return (
                    <button
                      className={`admin-similar-compact-row ${candidate.source === "DB" ? "api-suggested" : ""}`}
                      key={`${candidate.source}-${candidate.labels.join("|")}`}
                      onClick={() => {
                        setEditingLabel(selectedGroup.label);
                        setNextLabel(mergeTarget);
                      }}
                      type="button"
                    >
                      <span>
                        {candidate.labels.join(" ↔ ")}
                        <em>{candidate.source}</em>
                      </span>
                      <small>
                        {candidate.score ? `유사도 ${Math.round(candidate.score * 100)}% · ` : ""}
                        {candidate.count}개 업무 · 이름 맞추기
                      </small>
                      {candidate.terms.length > 0 && <small>공통 근거: {candidate.terms.slice(0, 5).join(", ")}</small>}
                    </button>
                  );
                })}
                {!selectedCandidates.length && <p className="admin-empty-note">이 흐름과 바로 묶을 후보는 없습니다.</p>}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function AccountModal({ currentPersonId, onClose, onLogin, onLogout, onUpdateEmoji, onUpdateProfile, onUpdateUserAdministration, people }) {
  const currentPerson = people.find((person) => person.id === currentPersonId) ?? people[0];
  const [profileDraft, setProfileDraft] = useState({
    name: currentPerson.name,
    role: currentPerson.role,
    emoji: currentPerson.emoji
  });

  useEffect(() => {
    setProfileDraft({
      name: currentPerson.name,
      role: currentPerson.role,
      emoji: currentPerson.emoji
    });
  }, [currentPerson.id, currentPerson.name, currentPerson.role, currentPerson.emoji]);

  function saveProfile(event) {
    event.preventDefault();
    if (!profileDraft.name.trim() || !profileDraft.role.trim()) return;
    onUpdateProfile(currentPersonId, profileDraft);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="account-modal" role="dialog" aria-modal="true" aria-label="계정 및 프로필">
        <div className="modal-header">
          <div>
            <span className="panel-label">계정 및 프로필</span>
            <h2>{currentPerson.name}님</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" title="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="account-summary-card">
          <span className="profile-emoji large" style={avatarStyle(currentPerson)}>
            {currentPerson.emoji}
          </span>
          <div>
            <strong>{currentPerson.name}</strong>
            <small>{roleLine(currentPerson)}</small>
          </div>
          <button className="secondary-button small" onClick={onLogout} type="button">
            <LogOut size={15} />
            로그아웃
          </button>
        </div>

        <div className="account-modal-grid">
          <section className="account-section">
            <span className="panel-label">계정 전환</span>
            <div className="account-switch-list">
              {orderedAccounts(people).map((person) => (
                <button
                  className={`account-switch-card ${currentPersonId === person.id ? "selected" : ""}`}
                  key={person.id}
                  onClick={() => onLogin(person.id)}
                  type="button"
                >
                  <span className="profile-emoji" style={avatarStyle(person)}>
                    {person.emoji}
                  </span>
                  <span>
                    <strong>{person.name}</strong>
                    <small>{roleLine(person)}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="account-section">
            <span className="panel-label">
              <UserCog size={14} />
              프로필 설정
            </span>
            <form className="profile-edit-form" onSubmit={saveProfile}>
              <span className="profile-emoji large" style={avatarStyle(currentPerson)}>
                {profileDraft.emoji}
              </span>
              <label>
                <small>이름</small>
                <input
                  onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                  value={profileDraft.name}
                />
              </label>
              <label>
                <small>직책</small>
                <input
                  onChange={(event) => setProfileDraft((current) => ({ ...current, role: event.target.value }))}
                  value={profileDraft.role}
                />
              </label>
              <EmojiPopover
                selectedEmoji={profileDraft.emoji}
                onSelect={(emoji) => {
                  setProfileDraft((current) => ({ ...current, emoji }));
                  onUpdateEmoji(currentPersonId, emoji);
                }}
                triggerLabel="프로필 이모지 선택"
                triggerClassName="profile-emoji-trigger"
              />
              <button className="secondary-button small" type="submit">
                저장
              </button>
            </form>
            <p className="account-help">이름, 직책, 이모지는 팀 구성과 계정 버튼에 바로 반영됩니다.</p>
          </section>
        </div>

      </section>
    </div>
  );
}

function InsightStrip({ activeFilter, onSelect, summary }) {
  return (
    <section className="insight-strip" aria-label="업무 요약">
      {summary.map(({ actionLabel, caption, icon: Icon, key, label, preview, tone, value }, index) => {
        const hasItems = value > 0;
        return (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            aria-disabled={!hasItems}
            aria-label={`${label} ${value}건${hasItems ? `, ${actionLabel}` : ""}`}
            className={`insight-card ${tone} ${hasItems ? "has-items" : "empty"} ${activeFilter === key ? "active" : ""}`}
            initial={{ opacity: 0, y: 8 }}
            key={key}
            onClick={() => {
              if (hasItems) onSelect(key);
            }}
            type="button"
            transition={{ delay: index * 0.04, duration: 0.22 }}
          >
            <span className="insight-icon">
              <Icon size={18} />
            </span>
            <span>
              <strong>{value}</strong>
              <small>{label}</small>
            </span>
            <em>{caption}</em>
            {hasItems && <i>{actionLabel}</i>}
            <div className="insight-hover" role="tooltip">
              {preview.length ? (
                preview.slice(0, 5).map((task) => (
                  <span key={`${key}-${task.id}`}>
                    <b>{personName(task.ownerId)}</b>
                    {displayTaskTitle(task)}
                  </span>
                ))
              ) : (
                <span className="empty">해당 업무가 없습니다.</span>
              )}
            </div>
          </motion.button>
        );
      })}
    </section>
  );
}

function AiAssistantPanel({
  className = "",
  error,
  isRemoteReady,
  onAsk,
  onCreateDraftTask,
  onPromptChange,
  prompt,
  result,
  status
}) {
  const isLoading = status === "loading";
  const evidenceItems = result?.evidence?.items ?? [];
  const isDraft = result?.intent?.kind === "task-draft";

  function submit(event) {
    event.preventDefault();
    onAsk(prompt);
  }

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className={`ai-assistant-panel ${className}`.trim()}
      initial={false}
      transition={{ duration: 0.22 }}
    >
      <div className="ai-assistant-head">
        <div>
          <span className="panel-label">AI 업무 에이전트</span>
        </div>
        <span className={`ai-source-chip ${isRemoteReady ? "remote" : "local"}`}>
          <Database size={14} />
          {isRemoteReady ? "회사 DB 기준" : "현재 화면 기준"}
        </span>
      </div>

      <form className="ai-assistant-form" onSubmit={submit}>
        <label className="ai-assistant-input">
          <MessageSquareText size={17} />
          <textarea
            aria-label="무엇을 도와드릴까요?!"
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="무엇을 도와드릴까요?!"
            rows={2}
            value={prompt}
          />
        </label>
        <button className="primary-button" disabled={isLoading || !prompt.trim()} type="submit">
          <span className={`atlas-spinner ${isLoading ? "spinning" : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {isLoading ? "읽는 중" : "물어보기"}
        </button>
      </form>

      <div className="ai-prompt-row" aria-label="추천 질문">
        {defaultAiAssistantPrompts.slice(0, 5).map((item) => (
          <button
            className={prompt === item ? "active" : ""}
            key={item}
            onClick={() => {
              onPromptChange(item);
              onAsk(item);
            }}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {(result || error) && (
        <div className="ai-answer-surface">
          {error && <p className="ai-answer-warning">{error}</p>}
          {result?.answer && (
            <div className="ai-answer-copy">
              {result.answer.split("\n").map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          )}

          {isDraft && onCreateDraftTask && (
            <button className="secondary-button small" onClick={onCreateDraftTask} type="button">
              <Plus size={15} />
              업무 추가 창으로 열기
            </button>
          )}

          {!isDraft && evidenceItems.length > 0 && (
            <div className="ai-source-list" aria-label="AI 답변 근거">
              <span className="panel-label">근거 업무 {evidenceItems.length}건</span>
              {evidenceItems.slice(0, 4).map((item) => (
                <div className="ai-source-row" key={`${item.taskId}-${item.taskTitle}`}>
                  <strong>{item.taskTitle}</strong>
                  <span>
                    {item.ownerName || "담당자 미상"} · {item.status || "상태 미상"}
                    {item.recentUpdates?.[0]?.id ? ` · update:${item.recentUpdates[0].id}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}

function BriefingPanel({
  briefing,
  briefingFeedbackKey,
  briefingItems,
  isTeam,
  onAddBriefingItem,
  onDeleteBriefingItem,
  onSelectGroup,
  onToggleBriefingTodo,
  onUpdateBriefingItem,
  selectedBriefingKey,
  selectedPerson,
  todayAgenda
}) {
  const inboxBodyRef = useRef(null);
  const [draft, setDraft] = useState({ type: "mail", title: "", body: "", url: "", status: "new" });
  const [activeItemDialog, setActiveItemDialog] = useState(null);
  const itemCount = briefing.reduce((sum, group) => sum + group.tasks.length, 0);
  const briefingUnits = briefing.reduce((sum, group) => sum + Math.max(1, group.tasks.length), 0);
  const briefingSideMaxHeight = Math.min(360, Math.max(172, 58 + briefingUnits * 38));
  const greeting = personalBriefingGreeting(briefing);
  const pageScope = isTeam ? "team" : "my";
  const scopedItems = briefingItems
    .filter((item) => {
      if (item.scope !== pageScope) return false;
      if (isTeam) return true;
      return item.ownerId === selectedPerson.id || (!item.ownerId && item.authorId === selectedPerson.id);
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  const activeInboxItems = scopedItems.filter((item) => item.status !== "archived");
  const listItems = isTeam ? scopedItems : activeInboxItems;
  const previewRowHeight = isTeam ? 44 : 58;
  const previewLimit = Math.max(2, Math.floor((briefingSideMaxHeight - 30) / previewRowHeight));
  const recentItems = listItems.slice(0, previewLimit);
  const olderItems = listItems.slice(previewLimit);
  const visibleItems = recentItems;
  const activeItem = ["read", "edit"].includes(activeItemDialog?.mode)
    ? scopedItems.find((item) => item.id === activeItemDialog.itemId)
    : null;

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function openWriteDialog() {
    setDraft(isTeam
      ? { type: "todo", title: "", body: "", url: "", status: "open" }
      : { type: "mail", title: "", body: "", url: "", status: "new" }
    );
    setActiveItemDialog({ mode: "write" });
  }

  function openReadDialog(itemId) {
    setActiveItemDialog({ mode: "read", itemId });
  }

  function openListDialog() {
    setActiveItemDialog({ mode: "list" });
  }

  function openEditDialog(item) {
    setDraft({
      id: item.id,
      type: item.type || (item.kind === "todo" ? "todo" : "note"),
      title: item.title || "",
      body: item.body || "",
      url: item.url || "",
      status: item.status || (item.kind === "todo" ? "open" : "new")
    });
    setActiveItemDialog({ mode: "edit", itemId: item.id });
  }

  function closeItemDialog() {
    setActiveItemDialog(null);
  }

  function submitCapture(event) {
    event.preventDefault();
    if (activeItemDialog?.mode === "edit" && draft.id) {
      onUpdateBriefingItem(draft.id, {
        type: isTeam ? "todo" : draft.type,
        title: draft.title,
        body: draft.body,
        url: isTeam ? "" : draft.url,
        status: isTeam ? draft.status : draft.status
      });
      closeItemDialog();
      return;
    }
    const didSave = onAddBriefingItem(pageScope, draft);
    if (!didSave) return;
    setDraft({ type: "mail", title: "", body: "", url: "", status: "new" });
    closeItemDialog();
  }

  function deleteActiveItem() {
    if (!activeItem) return;
    const didDelete = onDeleteBriefingItem(activeItem.id);
    if (didDelete) closeItemDialog();
  }

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="briefing-panel"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.24 }}
    >
      <div className="section-heading">
        <div>
          <span className="panel-label">오늘 브리핑</span>
          <h2>{isTeam ? "팀 전체 오늘 업무 흐름" : `${selectedPerson.name}님, ${greeting}`}</h2>
        </div>
        <div className="briefing-chip">
          <Sparkles size={16} />
          자동 선별 {itemCount}건
        </div>
      </div>
      <div className="briefing-content" style={{ "--briefing-side-max-height": `${briefingSideMaxHeight}px` }}>
        <div className="briefing-list">
          {briefing.map((group) => (
            <button
              className={`briefing-card briefing-row ${selectedBriefingKey === group.key || briefingFeedbackKey === group.key ? "selected" : ""}`}
              key={group.title}
              onClick={() => onSelectGroup(group)}
              type="button"
            >
              <span className={`briefing-symbol ${group.tone}`}>{group.icon}</span>
              <span className="briefing-kind">
                <strong>{group.title}</strong>
              </span>
              <span className={`briefing-copy ${group.tasks.length > 1 ? "has-task-dues" : ""}`}>
                {group.tasks.map((task) => (
                  <span className="briefing-task-line" key={task.id}>
                    <span className="briefing-task-text">
                      {isTeam && <em>{personName(task.ownerId)}</em>}
                      <b className={`briefing-tag-chip tag-tone-${tagTone(primaryTag(task))}`}>{primaryTag(task)}</b>
                      <span className="briefing-task-title">{displayTaskTitle(task)}</span>
                    </span>
                    {group.tasks.length > 1 && <i className="briefing-task-due">{briefingDueLabel(task)}</i>}
                  </span>
                ))}
              </span>
              {group.tasks.length <= 1 && group.dueText && <span className="briefing-due">{group.dueText}</span>}
            </button>
          ))}
        </div>
        <aside className="briefing-side" aria-label="오늘 일정과 업무 인박스">
          <div className={`briefing-side-section today-agenda ${todayAgenda.length ? "" : "is-empty"}`}>
            <span className="panel-label">오늘 일정</span>
            {todayAgenda.length ? (
              todayAgenda.map((item) => (
                <div className={`agenda-item ${item.tone}`} key={item.id}>
                  <span className="agenda-item-top">
                    <small>{item.actor ? `${item.label}/${item.actor}` : item.label}</small>
                    {item.status && <b className={`agenda-status-chip status-${item.statusTone}`}>{item.statusLabel}</b>}
                    {!item.status && item.isRange && item.dateText && <em className="agenda-date-chip">{item.dateText}</em>}
                  </span>
                  <strong>{item.title}</strong>
                  {!item.status && !item.isRange && item.meta && <em>{item.meta}</em>}
                </div>
              ))
            ) : (
              <p className="agenda-empty-note">오늘 등록된 일정 없음</p>
            )}
          </div>
          <div className={`briefing-side-section briefing-capture ${isTeam ? "team-check" : "work-inbox"}`}>
            <div className="briefing-capture-head">
              <span className="panel-label">
                {isTeam ? <ListChecks size={14} /> : <NotebookPen size={14} />}
                {isTeam ? "팀 체크" : "업무 인박스"}
              </span>
              <span className="briefing-capture-actions">
                {olderItems.length > 0 && (
                  <button
                    className="briefing-capture-more"
                    onClick={openListDialog}
                    type="button"
                  >
                    <ChevronRight size={13} />
                    <span>전체</span>
                    <em>{listItems.length}</em>
                  </button>
                )}
                <button className="briefing-capture-add" onClick={openWriteDialog} type="button">
                  <Plus size={13} />
                  {isTeam ? "추가" : "기록"}
                </button>
              </span>
            </div>
            <div className="briefing-capture-list">
              {visibleItems.length ? (
                visibleItems.map((item) => (
                  isTeam ? (
                    <div className={`team-check-item ${item.done ? "is-done" : ""}`} key={item.id}>
                      <button
                        aria-label={`${item.title} 완료 전환`}
                        className={`team-check-toggle ${item.done ? "is-done" : ""}`}
                        onClick={() => onToggleBriefingTodo(item.id)}
                        type="button"
                      >
                        {item.done && <Check size={12} />}
                      </button>
                      <button className="team-check-title-button" onClick={() => openReadDialog(item.id)} title={item.title} type="button">
                        <strong>{item.title}</strong>
                        {item.body && <small title={item.body}>{item.body}</small>}
                      </button>
                    </div>
                  ) : (
                    <article className="work-inbox-item is-title-only" key={item.id}>
                      <button className="work-inbox-title-button" onClick={() => openReadDialog(item.id)} title={item.title} type="button">
                        <span className="work-inbox-title-line">
                          <span className={`work-inbox-type type-${item.type}`}>{briefingItemTypeLabel(item.type)}</span>
                          <strong>{item.title}</strong>
                        </span>
                        <small>
                          {briefingItemStatusLabel(item.status)}
                          {item.body ? ` · ${item.body}` : item.url ? " · URL" : ""}
                        </small>
                      </button>
                    </article>
                  )
                ))
              ) : (
                <p className="briefing-capture-empty">{isTeam ? "팀 체크 항목 없음" : "아직 남긴 인박스 없음"}</p>
              )}
            </div>
          </div>
        </aside>
      </div>
      {activeItemDialog && (
        <div className="briefing-item-dialog-layer" role="dialog" aria-label={activeItemDialog.mode === "read" ? "브리핑 항목 상세" : activeItemDialog.mode === "edit" ? "브리핑 항목 수정" : activeItemDialog.mode === "list" ? "브리핑 항목 전체 보기" : isTeam ? "팀 체크 추가" : "업무 인박스 기록"}>
          <button className="task-post-dialog-backdrop" onClick={closeItemDialog} type="button" aria-label="브리핑 항목 창 닫기" />
          <div className="briefing-item-dialog">
            <div className="task-post-dialog-head">
              <div>
                <strong>{activeItemDialog.mode === "read" ? activeItem?.title : activeItemDialog.mode === "edit" ? (isTeam ? "팀 체크 수정" : "업무 인박스 수정") : activeItemDialog.mode === "list" ? (isTeam ? "팀 체크 전체 보기" : "업무 인박스 전체 보기") : isTeam ? "팀 체크 추가" : "업무 인박스 기록"}</strong>
                <small>
                  {activeItemDialog.mode === "read"
                    ? `${activeItem?.createdAt ?? TODAY} · ${personName(activeItem?.authorId)}${activeItem?.kind === "todo" ? ` · ${activeItem.done ? "완료" : "미완료"}` : ` · ${briefingItemStatusLabel(activeItem?.status)}`}`
                    : activeItemDialog.mode === "list"
                      ? `${listItems.length}개 항목을 리스트로 봅니다. 제목을 클릭하면 상세로 이동합니다.`
                    : activeItemDialog.mode === "edit"
                      ? "제목과 내용을 바로잡습니다."
                      : isTeam ? "같이 확인할 작은 약속을 남깁니다." : "나중에 찾을 수 있는 근거 정보를 구조화해서 남깁니다."}
                </small>
              </div>
              <button className="icon-button" onClick={closeItemDialog} type="button" title="브리핑 항목 창 닫기">
                <X size={16} />
              </button>
            </div>
            {activeItemDialog.mode === "list" ? (
              <div className="briefing-item-list-dialog">
                {listItems.map((item) => (
                  <button
                    className={`briefing-item-list-row ${item.done ? "is-done" : ""}`}
                    key={`briefing-list-${item.id}`}
                    onClick={() => openReadDialog(item.id)}
                    title={item.title}
                    type="button"
                  >
                    <span className={`work-inbox-type type-${item.type}`}>{item.kind === "todo" ? (item.done ? "완료" : "체크") : briefingItemTypeLabel(item.type)}</span>
                    <strong>{item.title}</strong>
                    <small>{item.body || (item.kind === "todo" ? "메모 없음" : briefingItemStatusLabel(item.status))}</small>
                  </button>
                ))}
              </div>
            ) : ["write", "edit"].includes(activeItemDialog.mode) ? (
              <form className="task-post-write-mockup briefing-item-write" onSubmit={submitCapture}>
                {!isTeam && (
                  <label>
                    <span>구분</span>
                    <select
                      aria-label="업무 인박스 분류"
                      onChange={(event) => updateDraft({ type: event.target.value })}
                      value={draft.type}
                    >
                      {briefingItemTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  <span>{isTeam ? "체크 항목" : "제목"}</span>
                  <input
                    aria-label={isTeam ? "팀 체크 항목" : "업무 인박스 제목"}
                    onChange={(event) => updateDraft({ title: event.target.value })}
                    placeholder={isTeam ? "같이 확인할 항목" : "나중에 찾을 수 있는 제목"}
                    value={draft.title}
                  />
                </label>
                <label>
                  <span>{isTeam ? "메모" : "본문"}</span>
                  <div className="emoji-textarea-frame task-post-body-frame">
                    <textarea
                      aria-label={isTeam ? "팀 체크 메모" : "업무 인박스 내용"}
                      onChange={(event) => updateDraft({ body: event.target.value })}
                      placeholder={isTeam ? "필요하면 간단한 설명을 남겨두세요." : "중요 메일, 기억할 내용, 판단 근거를 남겨두세요."}
                      ref={inboxBodyRef}
                      rows={isTeam ? 5 : 10}
                      value={draft.body}
                    />
                    <EmojiPopover
                      onSelect={(emoji) => insertEmojiAtCursor(inboxBodyRef, draft.body, emoji, (value) => updateDraft({ body: value }))}
                      triggerLabel={isTeam ? "팀 체크 메모에 이모지 넣기" : "업무 인박스에 이모지 넣기"}
                      triggerClassName="textarea-emoji-trigger"
                    />
                  </div>
                </label>
                {!isTeam && (
                  <label>
                    <span>URL</span>
                    <input
                      aria-label="업무 인박스 URL"
                      onChange={(event) => updateDraft({ url: event.target.value })}
                      placeholder="https:// 또는 공유 문서 주소"
                      value={draft.url}
                    />
                  </label>
                )}
                <div className="task-post-write-foot">
                  <button className="primary-button small" disabled={!draft.title.trim() && !draft.body.trim()} type="submit">
                    {activeItemDialog.mode === "edit" ? "수정 저장" : "저장"}
                  </button>
                </div>
              </form>
            ) : activeItem ? (
              <div className="task-post-read-mockup briefing-item-read">
                <div className="task-post-read-meta">
                  <span>{activeItem.kind === "todo" ? "팀 체크" : briefingItemTypeLabel(activeItem.type)}</span>
                  {!isTeam && (
                    <select
                      aria-label={`${activeItem.title} 상태`}
                      onChange={(event) => onUpdateBriefingItem(activeItem.id, { status: event.target.value })}
                      value={activeItem.status}
                    >
                      {briefingItemStatuses.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  )}
                  {isTeam && (
                    <button className={`team-check-dialog-toggle ${activeItem.done ? "is-done" : ""}`} onClick={() => onToggleBriefingTodo(activeItem.id)} type="button">
                      <Check size={13} />
                      {activeItem.done ? "완료됨" : "완료 체크"}
                    </button>
                  )}
                </div>
                {activeItem.body ? <p>{activeItem.body}</p> : <p className="briefing-item-empty-body">남긴 본문이 없습니다.</p>}
                {activeItem.url && (
                  <a className="task-post-url-card" href={activeItem.url} rel="noreferrer" target="_blank">
                    <Link2 size={16} />
                    <span>{activeItem.url}</span>
                  </a>
                )}
                <div className="task-post-read-actions">
                  <button className="secondary-button small" onClick={() => openEditDialog(activeItem)} type="button">
                    <Edit3 size={14} />
                    수정
                  </button>
                  <button className="danger-outline-button" onClick={deleteActiveItem} type="button">
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <p className="briefing-capture-empty">항목을 찾을 수 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}

function TagLibrary({ activeTags, canManageTags, isOpen, libraryRef, onAdd, onClearFilters, onDelete, onDeletePreset, onFilter, onRename, onSavePreset, onToggleOpen, presets, tags }) {
  const [draftTag, setDraftTag] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState("");
  const [openPresetIds, setOpenPresetIds] = useState(() => new Set());
  const [presetDraft, setPresetDraft] = useState({ id: "", label: "", tagsText: "" });
  const editingPreset = presets.find((preset) => preset.id === editingPresetId);
  const activeTagLabel = tagFilterSummaryLabel(activeTags);
  const activeTagSet = new Set(activeTags);
  const singleEditableTag = activeTags.length === 1 ? activeTags[0] : "";
  const groupedTagNames = new Set(presets.flatMap((preset) => preset.tags));
  const uncategorizedTags = tags.filter((tag) => !groupedTagNames.has(tag));
  const tagMapRows = [
    ...presets.map((preset) => ({
      id: preset.id,
      label: preset.label,
      tags: normalizeTags(preset.tags),
      tone: preset.tone,
      type: "preset"
    })),
    ...(uncategorizedTags.length ? [{
      id: "uncategorized",
      label: "미분류",
      tags: normalizeTags(uncategorizedTags),
      tone: "custom",
      type: "loose"
    }] : [])
  ];

  function submitTag(event) {
    event.preventDefault();
    onAdd(draftTag);
    setDraftTag("");
    setIsAdding(false);
  }

  function updateSelectedTags(nextTags) {
    onFilter(serializeTagFilters(nextTags));
    setEditingValue("");
    setEditingTagName("");
    setIsAdding(false);
    setIsAddingPreset(false);
    setEditingPresetId("");
  }

  function toggleTag(tag) {
    const nextTags = activeTagSet.has(tag)
      ? activeTags.filter((item) => item !== tag)
      : [...activeTags, tag];
    updateSelectedTags(nextTags);
  }

  function clearTagFilters() {
    onClearFilters();
    setEditingValue("");
    setEditingTagName("");
    setIsAdding(false);
    closePresetEditor();
  }

  function togglePresetTags(rowTags) {
    const allSelected = rowTags.every((tag) => activeTagSet.has(tag));
    const nextTags = allSelected
      ? activeTags.filter((tag) => !rowTags.includes(tag))
      : normalizeTags([...activeTags, ...rowTags]);
    updateSelectedTags(nextTags);
  }

  function closePresetEditor() {
    setIsAddingPreset(false);
    setEditingPresetId("");
    setPresetDraft({ id: "", label: "", tagsText: "" });
  }

  function openPresetEditor(preset) {
    setEditingTagName("");
    setEditingValue("");
    setIsAddingPreset(false);
    setEditingPresetId(preset.id);
    setPresetDraft({ id: preset.id, label: preset.label, tagsText: preset.tags.join(", ") });
  }

  function openTagEditor(tag) {
    setIsAdding(false);
    closePresetEditor();
    setEditingTagName(tag);
    setEditingValue(tag);
  }

  function togglePresetRow(rowId) {
    setOpenPresetIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }

  function submitEdit(event) {
    event.preventDefault();
    if (!editingTagName) return;
    onRename(editingTagName, editingValue);
    setEditingTagName("");
    setEditingValue("");
  }

  function submitPreset(event) {
    event.preventDefault();
    const targetPreset = editingPreset && !isAddingPreset ? editingPreset : null;
    const tagsText = presetDraft.tagsText || targetPreset?.tags.join(", ") || "";
    const tags = normalizeTags(tagsText.split(",").map((tag) => tag.trim()));
    onSavePreset({
      id: presetDraft.id || targetPreset?.id || "",
      label: presetDraft.label || targetPreset?.label || "",
      tags,
      tone: targetPreset?.tone || "custom"
    });
    setIsAddingPreset(false);
    setEditingPresetId("");
    setEditingTagName("");
    setPresetDraft({ id: "", label: "", tagsText: "" });
  }

  function toggleOpen() {
    onToggleOpen((current) => {
      if (current) {
        setIsAdding(false);
        closePresetEditor();
      }
      return !current;
    });
  }

  return (
    <section className={`tag-library ${isOpen ? "is-open" : "is-collapsed"}`} aria-label="태그" ref={libraryRef}>
      <div className="tag-library-head">
        <div className="tag-library-title">
          <span>
            <Tag size={16} />
            태그
          </span>
          <small>{`Category ${presets.length} · 태그 ${tags.length}`}</small>
          {activeTags.length > 0 && <em>{activeTagLabel}</em>}
        </div>
        <button
          aria-controls="tag-library-content"
          aria-expanded={isOpen}
          className="tag-library-toggle"
          onClick={toggleOpen}
          type="button"
        >
          {isOpen ? "접기" : "펼치기"}
          <ChevronDown size={15} />
        </button>
      </div>
      {isOpen && (
        <div className="tag-library-content" id="tag-library-content">
          <small className="tag-permission-note">
            <Info size={14} />
            태그 추가는 모두 가능하고, 수정/삭제는 관리자만 가능합니다.
          </small>
          <div className="tag-map-toolbar">
            <button
              className={`tag-filter-chip tag-filter-home ${activeTags.length === 0 ? "active" : ""}`}
              onClick={clearTagFilters}
              type="button"
            >
              전체
            </button>
            {canManageTags && !isAddingPreset && (
              <button
                className="tag-preset-add"
                onClick={() => {
                  setIsAddingPreset(true);
                  setEditingPresetId("");
                  setEditingTagName("");
                  setEditingValue("");
                  setPresetDraft({ id: "", label: "", tagsText: "" });
                  onFilter("전체");
                }}
                type="button"
              >
                <Plus size={13} />
                Category
              </button>
            )}
            {canManageTags && singleEditableTag && !editingTagName && !isAddingPreset && !editingPreset && (
              <button className="tag-preset-manage tag-selected-manage" onClick={() => openTagEditor(singleEditableTag)} type="button">
                태그 수정
              </button>
            )}
            {!isAdding && (
              <button
                className="tag-add-trigger"
                onClick={() => {
                  setEditingTagName("");
                  setEditingValue("");
                  setIsAdding(true);
                }}
                type="button"
              >
                <Plus size={14} />
                태그
              </button>
            )}
          </div>
          <div className="tag-map" aria-label="Category별 태그 맵">
            {tagMapRows.map((row) => {
              const selectedInRow = row.tags.filter((tag) => activeTagSet.has(tag));
              const allTagsSelected = row.tags.length > 0 && selectedInRow.length === row.tags.length;
              const isExpanded = openPresetIds.has(row.id) || selectedInRow.length > 0;
              const previewTags = row.tags.slice(0, 5);
              const hiddenCount = Math.max(row.tags.length - previewTags.length, 0);
              return (
                <article className={`tag-map-row preset-${row.tone} ${isExpanded ? "is-expanded" : ""}`} key={row.id}>
                  <div className="tag-map-row-head">
                    <button
                      aria-expanded={isExpanded}
                      aria-pressed={allTagsSelected}
                      className={`tag-map-category ${allTagsSelected ? "active" : ""} ${selectedInRow.length > 0 && !allTagsSelected ? "partial" : ""}`}
                      disabled={row.type !== "preset"}
                      onClick={() => togglePresetTags(row.tags)}
                      title={row.tags.join(", ")}
                      type="button"
                    >
                      <strong>{row.label}</strong>
                      <small>{row.tags.length}개</small>
                    </button>
                    <div className="tag-map-preview">
                      {(isExpanded ? row.tags : previewTags).map((tag) => (
                        <button
                          aria-pressed={activeTagSet.has(tag)}
                          className={`tag-filter-chip tag-tone-${tagTone(tag)} ${row.type === "preset" ? `tag-category-member preset-${row.tone}` : ""} ${activeTagSet.has(tag) ? "active" : ""}`}
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          title={`${row.label} · ${tag}`}
                          type="button"
                        >
                          {tag}
                        </button>
                      ))}
                      {!isExpanded && hiddenCount > 0 && <span className="tag-map-more">+{hiddenCount}개</span>}
                    </div>
                    {hiddenCount > 0 ? (
                      <button className="tag-map-expand" onClick={() => togglePresetRow(row.id)} type="button">
                        {isExpanded ? "접기" : "더보기"}
                        <ChevronDown size={14} />
                      </button>
                    ) : (
                      <span className="tag-map-expand-spacer" aria-hidden="true" />
                    )}
                    {canManageTags && row.type === "preset" && !isAddingPreset && !editingPreset && (
                      <button className="tag-preset-manage" onClick={() => openPresetEditor(row)} type="button">
                        수정
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {!tagMapRows.length && <p className="empty-note tag-map-empty">아직 등록된 태그가 없습니다.</p>}
          </div>
          {canManageTags && isAddingPreset && (
            <form className="tag-edit-panel tag-preset-edit-panel" onSubmit={submitPreset}>
              <span>새 Category</span>
              <input
                aria-label="태그 Category 이름"
                onChange={(event) => setPresetDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="Category 이름"
                value={presetDraft.label}
              />
              <input
                aria-label="Category 포함 태그"
                onChange={(event) => setPresetDraft((current) => ({ ...current, tagsText: event.target.value }))}
                placeholder="기획보고, 임원보고"
                value={presetDraft.tagsText}
              />
              <button type="submit">저장</button>
              <button onClick={closePresetEditor} type="button">닫기</button>
            </form>
          )}
          {isAdding && (
            <form className="tag-add-form tag-map-add-form" onSubmit={submitTag}>
              <input
                aria-label="새 태그"
                autoFocus
                onChange={(event) => setDraftTag(event.target.value)}
                placeholder="새 태그"
                value={draftTag}
              />
              <button type="submit" title="태그 추가">
                <Check size={14} />
              </button>
              <button onClick={() => setIsAdding(false)} type="button" title="태그 추가 취소">
                <X size={14} />
              </button>
            </form>
          )}
          {canManageTags && editingTagName && (
            <form className="tag-edit-panel" onSubmit={submitEdit}>
              <span>선택한 태그</span>
              <input
                aria-label={`${editingTagName} 태그 이름 수정`}
                onChange={(event) => setEditingValue(event.target.value)}
                placeholder={editingTagName}
                value={editingValue}
              />
              <button type="submit">수정</button>
              <button
                className="danger"
                onClick={() => {
                  onDelete(editingTagName);
                  setEditingTagName("");
                  setEditingValue("");
                }}
                type="button"
              >
                삭제
              </button>
              <button
                onClick={() => {
                  setEditingTagName("");
                  setEditingValue("");
                }}
                type="button"
              >
                닫기
              </button>
            </form>
          )}
          {canManageTags && editingPreset && (
            <form className="tag-edit-panel tag-preset-edit-panel" onSubmit={submitPreset}>
              <span>선택한 Category</span>
              <input
                aria-label={`${editingPreset.label} Category 이름 수정`}
                onChange={(event) => setPresetDraft((current) => ({ ...current, id: editingPreset.id, tagsText: current.tagsText || editingPreset.tags.join(", "), label: event.target.value }))}
                value={presetDraft.id === editingPreset.id ? presetDraft.label : editingPreset.label}
              />
              <input
                aria-label={`${editingPreset.label} 포함 태그 수정`}
                onChange={(event) => setPresetDraft((current) => ({ ...current, id: editingPreset.id, label: presetDraft.label || editingPreset.label, tagsText: event.target.value }))}
                value={presetDraft.id === editingPreset.id ? presetDraft.tagsText : editingPreset.tags.join(", ")}
              />
              <button
                type="submit"
              >
                수정
              </button>
              <button
                className="danger"
                onClick={() => {
                  onDeletePreset(editingPreset.id);
                  closePresetEditor();
                }}
                type="button"
              >
                삭제
              </button>
              <button onClick={closePresetEditor} type="button">닫기</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

function BoardView({ canManageTask, counts, onArchive, onEdit, onSelect, onStatusChange, selectedTaskPulseId, selectedTaskId, showOwner, statusPulseTaskId, tasks }) {
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [dropStatus, setDropStatus] = useState("");
  const [expandedStatuses, setExpandedStatuses] = useState({});
  const tasksByStatus = useMemo(() => (
    boardStatuses.reduce((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    }, {})
  ), [tasks]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const selectedTask = tasks.find((task) => task.id === selectedTaskId);
    if (!selectedTask?.status) return;
    setExpandedStatuses((current) => (
      current[selectedTask.status] ? current : { ...current, [selectedTask.status]: true }
    ));
  }, [selectedTaskId, tasks]);

  function clearDragState() {
    setDraggingTaskId("");
    setDropStatus("");
  }

  function toggleStatus(status) {
    setExpandedStatuses((current) => ({ ...current, [status]: !current[status] }));
  }

  return (
    <section className="board-view">
      <div className="status-guide" aria-label="업무 상태 의미">
        {boardStatuses.map((status) => (
          <span key={status}>
            <i className={`status-${status.replace("/", "")}`} />
            <b>{statusStickerLabels[status] ?? status}</b>
            {statusMeanings[status]}
          </span>
        ))}
      </div>
      {boardStatuses.map((status) => {
        const statusTasks = tasksByStatus[status] ?? [];
        const isExpanded = Boolean(expandedStatuses[status]);
        const isWideExpanded = isExpanded && statusTasks.length > 4;
        return (
          <div
            className={`status-lane status-${status.replace("/", "")} ${isExpanded ? "is-expanded" : "is-collapsed"} ${isWideExpanded ? "is-wide-expanded" : ""} ${dropStatus === status ? "drop-target" : ""}`}
            key={status}
            onDragEnter={() => setDropStatus(status)}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDropStatus("");
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropStatus(status);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("text/plain");
              const task = tasks.find((item) => item.id === taskId);
              if (taskId && task && canManageTask(task)) onStatusChange(taskId, status);
              clearDragState();
            }}
          >
            <button className="lane-header lane-toggle-button" onClick={() => toggleStatus(status)} type="button" aria-expanded={isExpanded}>
              <span className="lane-heading">
                {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <span className="lane-title">{statusStickerLabels[status] ?? status}</span>
              </span>
              <small className="lane-count">{counts[status] ?? 0}건</small>
            </button>
            {isExpanded && (
              <div className="lane-stack">
                {statusTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    canManage={canManageTask(task)}
                    dragging={draggingTaskId === task.id}
                    onArchive={() => onArchive(task)}
                    onDragEnd={clearDragState}
                    onDragStart={() => setDraggingTaskId(task.id)}
                    onEdit={() => onEdit(task)}
                    onSelect={() => onSelect(task.id)}
                    onStatusChange={(nextStatus) => onStatusChange(task.id, nextStatus)}
                    pulsing={selectedTaskPulseId === task.id}
                    selected={selectedTaskId === task.id}
                    showOwner={showOwner}
                    statusPulsing={statusPulseTaskId === task.id}
                    task={task}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function TaskListView({ onSelect, selectedTaskId, showOwner, tasks }) {
  const [expandedStatuses, setExpandedStatuses] = useState({});
  const tasksByStatus = useMemo(() => (
    boardStatuses.reduce((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    }, {})
  ), [tasks]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const selectedTask = tasks.find((task) => task.id === selectedTaskId);
    if (!selectedTask?.status) return;
    setExpandedStatuses((current) => (
      current[selectedTask.status] ? current : { ...current, [selectedTask.status]: true }
    ));
  }, [selectedTaskId, tasks]);

  function toggleStatus(status) {
    setExpandedStatuses((current) => ({ ...current, [status]: !current[status] }));
  }

  return (
    <section className={`task-list-view ${showOwner ? "show-owner" : ""}`} aria-label="업무 리스트">
      <div className="status-guide" aria-label="업무 상태 의미">
        {boardStatuses.map((status) => (
          <span key={status}>
            <i className={`status-${status.replace("/", "")}`} />
            <b>{statusStickerLabels[status] ?? status}</b>
            {statusMeanings[status]}
          </span>
        ))}
      </div>
      <div className="task-list-sections">
        {boardStatuses.map((status) => {
          const statusTasks = tasksByStatus[status] ?? [];
          const isExpanded = Boolean(expandedStatuses[status]);
          return (
            <section className={`task-list-section status-${status.replace("/", "")} ${isExpanded ? "is-expanded" : "is-collapsed"}`} key={status}>
              <button className="task-list-section-head" onClick={() => toggleStatus(status)} type="button" aria-expanded={isExpanded}>
                <span className="lane-heading">
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <span className="lane-title">{statusStickerLabels[status] ?? status}</span>
                </span>
                <small className="lane-count">{statusTasks.length}건</small>
              </button>
              {isExpanded && (
                <div className="task-list-table" role="table" aria-label={`${statusStickerLabels[status] ?? status} 업무 목록`}>
                  <div className="task-list-table-head" role="row">
                    <span role="columnheader">업무</span>
                    {showOwner && <span role="columnheader">담당</span>}
                    <span role="columnheader">구분</span>
                    <span role="columnheader">기간</span>
                    <span role="columnheader">진행률</span>
                  </div>
                  {statusTasks.length ? statusTasks.map((task) => (
                    <TaskListRow
                      key={task.id}
                      onSelect={() => onSelect(task.id)}
                      selected={selectedTaskId === task.id}
                      showOwner={showOwner}
                      task={task}
                    />
                  )) : (
                    <p className="task-list-empty">해당 상태의 업무가 없습니다.</p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function TaskListRow({ onSelect, selected, showOwner, task }) {
  const tags = taskTags(task);
  const title = displayTaskTitle(task);
  const progress = taskProgress(task);
  const spot = isSpotTask(task);
  const visibleTags = tags.slice(0, 3);
  const scheduleBadges = taskBadges(task).filter((badge) => !["New", "보관됨"].includes(badge.label));
  return (
    <button className={`task-list-row ${selected ? "selected" : ""} ${spot ? "spot-task-row" : ""}`} onClick={onSelect} role="row" type="button">
      <span className="task-list-title-cell" role="cell">
        <span className="task-list-title-line">
          <strong>{title}</strong>
          <span className="task-list-chip-line">
            {spot ? (
              <em className="priority-square spot-work-chip" title="스팟 업무">스팟</em>
            ) : (
              <em className={`priority-square priority-square-${task.priority}`}>{task.priority}</em>
            )}
            {task.recurring && <i className="task-list-repeat" title="반복 업무">🔁</i>}
            {scheduleBadges.map((badge) => (
              <i className={`task-list-schedule-chip badge-${badge.tone}`} key={`${task.id}-${badge.label}`}>{badge.label}</i>
            ))}
          </span>
        </span>
      </span>
      {showOwner && (
        <span className="task-list-owner-cell" role="cell">
          {personName(task.ownerId)}
        </span>
      )}
      <span className="task-list-tags-cell" role="cell">
        {visibleTags.map((tag) => (
          <em className={`tag-tone-${tagTone(tag)}`} key={`${task.id}-${tag}`}>{tag}</em>
        ))}
        {!visibleTags.length && <small>태그 없음</small>}
      </span>
      <span className="task-list-period-cell" role="cell">
        <CalendarDays size={14} />
        {task.startDate.slice(5)} - {task.dueDate.slice(5)}
      </span>
      <span className="task-list-progress-cell" role="cell">
        <span className="task-list-progress-bar" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </span>
        <b>{progress}%</b>
      </span>
    </button>
  );
}

function TaskCard({ canManage, dragging, onArchive, onDragEnd, onDragStart, onEdit, onSelect, onStatusChange, pulsing, selected, showOwner, statusPulsing, task }) {
  const tags = taskTags(task);
  const badges = taskBadges(task);
  const title = displayTaskTitle(task);
  const spot = isSpotTask(task);
  return (
    <article
      className={`task-card ${spot ? "spot-task-card" : ""} ${selected ? "selected" : ""} ${pulsing ? "is-select-pulsing" : ""} ${dragging ? "dragging" : ""}`}
      draggable={canManage}
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        if (!canManage) return;
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
    >
      <button className="card-main" aria-label={`${title} 업무 상세 보기`} onClick={onSelect} type="button">
        <div className="card-title-row">
          <strong>{title}</strong>
          {task.recurring && <span className="recurring-icon-only" title="반복 업무">🔁</span>}
        </div>
        <div className="card-chip-row">
          {spot ? (
            <span className="priority-square spot-work-chip" title="스팟 업무: 주간·월간 실적에 포함, 분기·년간 요약에서는 기본 제외">
              스팟
            </span>
          ) : (
            <span className={`priority-square priority-square-${task.priority}`}>{task.priority}</span>
          )}
          <span className={`task-status-chip status-${task.status.replace("/", "")} ${statusPulsing ? "is-status-popping" : ""}`}>{statusStickerLabels[task.status] ?? task.status}</span>
          {badges.map((badge) => (
            <span className={`status-chip badge-${badge.tone}`} key={`${task.id}-${badge.label}`}>{badge.label}</span>
          ))}
        </div>
        <div className="card-tag-row">
          {tags.slice(0, 3).map((tag) => (
            <span className={`tag-tone-${tagTone(tag)}`} key={`${task.id}-${tag}`}>{tag}</span>
          ))}
        </div>
        <div className="card-owner-period">
          {showOwner && (
            <span className="owner-identity">
              <span
                className="avatar mini owner-initials"
                style={avatarStyle(task.ownerId)}
                title={personName(task.ownerId)}
              >
                {initials(personName(task.ownerId))}
              </span>
            </span>
          )}
          <span className="period-text">
            <CalendarDays size={14} />
            {task.startDate.slice(5)} - {task.dueDate.slice(5)}
          </span>
        </div>
        <ProgressBar value={taskProgress(task)} />
      </button>
      {canManage && (
        <div className="card-actions">
          <select aria-label={`${title} 상태 변경`} onChange={(event) => onStatusChange(event.target.value)} value={task.status}>
            {statuses.map((status) => (
              <option key={status} value={status}>{statusStickerLabels[status] ?? status}</option>
            ))}
          </select>
          <div className="card-action-buttons">
            {["완료", "보류"].includes(task.status) && !task.archived && (
              <button className="ghost-icon" onClick={onArchive} type="button" title={`${task.status} 업무 보관`}>
                <Archive size={15} />
              </button>
            )}
          <button className="ghost-icon" onClick={onEdit} type="button" title="업무 수정">
            <Edit3 size={15} />
          </button>
          </div>
        </div>
      )}
    </article>
  );
}

function TimelineView({ mode, month, onModeChange, onMonthChange, onSelect, onYearChange, tasks, year }) {
  const [timelineTooltip, setTimelineTooltip] = useState(null);
  const [monthYear, monthValue] = month.split("-").map(Number);
  const monthDays = daysInMonth(monthYear, monthValue);
  const businessDates = businessDatesInMonth(monthYear, monthValue);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(monthDays).padStart(2, "0")}`;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const rangeStart = mode === "month" ? monthStart : yearStart;
  const rangeEnd = mode === "month" ? monthEnd : yearEnd;
  const units = mode === "month" ? businessDates.length : 12;
  const axis = mode === "month"
    ? businessDates
    : Array.from({ length: 12 }, (_, index) => index + 1);
  const displayTasks = tasksWithRecurringInstances(tasks, rangeStart, rangeEnd, mode === "year" ? 6 : 18);
  const visibleTasks = displayTasks
    .filter((task) => diffDays(task.dueDate, rangeStart) >= 0 && diffDays(task.startDate, rangeEnd) <= 0)
    .sort((a, b) => toDate(a.startDate) - toDate(b.startDate));
  const todayColumn =
    mode === "month" && month === TODAY.slice(0, 7) && !isWeekend(TODAY)
      ? businessDates.indexOf(TODAY) + 1
      : mode === "year" && year === TODAY.slice(0, 4)
        ? Number(TODAY.slice(5, 7))
        : null;

  function placement(task) {
    if (mode === "month") {
      const startDate = task.startDate < monthStart ? monthStart : task.startDate;
      const endDate = task.dueDate > monthEnd ? monthEnd : task.dueDate;
      const startOffset = Math.max(0, businessDates.findIndex((date) => date >= startDate));
      const reverseEndOffset = [...businessDates].reverse().findIndex((date) => date <= endDate);
      const endOffset = reverseEndOffset < 0 ? startOffset : businessDates.length - 1 - reverseEndOffset;
      return { offset: startOffset, span: Math.max(1, endOffset - startOffset + 1) };
    }
    const startMonth = diffDays(task.startDate, yearStart) < 0 ? 0 : Math.max(0, Math.min(11, toDate(task.startDate).getMonth()));
    const endMonth = diffDays(task.dueDate, yearEnd) > 0 ? 11 : Math.max(0, Math.min(11, toDate(task.dueDate).getMonth()));
    return { offset: startMonth, span: Math.max(1, endMonth - startMonth + 1) };
  }

  function changePeriod(direction) {
    if (mode === "month") {
      const next = new Date(monthYear, monthValue - 1 + direction, 1);
      onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
      return;
    }
    onYearChange(String(Number(year) + direction));
  }

  function goToday() {
    onMonthChange(TODAY.slice(0, 7));
    onYearChange(TODAY.slice(0, 4));
  }

  function showTimelineTooltip(anchor, details) {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const tooltipWidth = Math.min(280, window.innerWidth - 32);
    const estimatedHeight = details.lines.length * 18 + 54;
    const topBelow = rect.bottom + 8;
    const topAbove = rect.top - estimatedHeight - 8;
    const top = topBelow + estimatedHeight > window.innerHeight && topAbove > 12 ? topAbove : topBelow;
    setTimelineTooltip({
      ...details,
      left: Math.min(window.innerWidth - tooltipWidth - 16, Math.max(16, rect.left)),
      top: Math.max(12, top),
      width: tooltipWidth
    });
  }

  function tooltipDetails(task, risk, clippedStart, clippedEnd) {
    const tags = timelineTaskTags(task);
    const lines = [
      tags.join(", "),
      `${formatDate(task.startDate)} - ${formatDate(task.dueDate)}`
    ];
    if (risk) lines.push(`${risk.label}: ${risk.reason}`);
    if (task.recurring) lines.push(recurringLabel(task));
    if (clippedStart || clippedEnd) lines.push("선택한 기간 밖으로 이어지는 업무입니다.");
    return {
      title: displayTaskTitle(task),
      meta: `${personName(task.ownerId)} · ${task.status} · ${taskProgress(task)}%`,
      lines
    };
  }

  const periodLabel = mode === "month" ? `${monthYear}년 ${monthValue}월` : `${year}년`;
  const weekdayFormatter = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });

  return (
    <section className={`timeline-view timeline-${mode}`} style={{ "--timeline-units": units, "--today-column": todayColumn || 0 }}>
      <div className="timeline-toolbar">
        <div className="timeline-heading">
          <h2>타임라인</h2>
          <span>{mode === "month" ? "월 단위 업무 흐름" : "연간 계획 흐름"}</span>
        </div>
        <div className="timeline-controls">
          <div className="segmented small" role="tablist" aria-label="타임라인 기간">
            <button className={mode === "month" ? "active" : ""} onClick={() => onModeChange("month")} type="button">
              월간
            </button>
            <button className={mode === "year" ? "active" : ""} onClick={() => onModeChange("year")} type="button">
              연간
            </button>
          </div>
          <div className="period-switcher">
            <button onClick={() => changePeriod(-1)} type="button" title="이전 기간">
              <ChevronLeft size={17} />
            </button>
            <strong>{periodLabel}</strong>
            <button onClick={() => changePeriod(1)} type="button" title="다음 기간">
              <ChevronRight size={17} />
            </button>
            <button className="today-button" onClick={goToday} type="button">
              오늘
            </button>
          </div>
        </div>
      </div>
      <div className="timeline-legend" aria-label="타임라인 색상 의미">
        <strong>색상 의미</strong>
        {statuses.map((status) => (
          <span key={status}>
            <i className={`status-${status.replace("/", "")}`} />
            {status}
          </span>
        ))}
        <span className="legend-repeat-only" title="반복 업무">🔁 <b>반복 업무</b></span>
        <span>
          <i className="legend-risk" />
          스티커: 일정 주의
        </span>
        <span>
          <i className="legend-edge" />
          진한 끝선: 기간 밖으로 이어짐
        </span>
      </div>
      <div className="timeline-grid" onScroll={() => setTimelineTooltip(null)}>
        {todayColumn > 0 && <span aria-hidden="true" className="timeline-today-guide" />}
        <div className="timeline-axis">
          <span />
          {axis.map((unit) => {
            const axisDate = mode === "month" ? unit : null;
            const axisUnit = mode === "month" ? Number(unit.slice(8, 10)) : unit;
            return (
            <small
              className={(mode === "month" ? axisDate === TODAY : unit === todayColumn) ? "today-axis" : ""}
              key={unit}
            >
              {mode === "month" ? (
                <>
                  <strong>{axisUnit}</strong>
                  <em>{weekdayFormatter.format(toDate(axisDate))}</em>
                </>
              ) : (
                `${unit}월`
              )}
            </small>
            );
          })}
        </div>
        {visibleTasks.map((task) => {
          const { offset, span } = placement(task);
          const clippedStart = mode === "month" ? task.startDate < monthStart : diffDays(task.startDate, yearStart) < 0;
          const clippedEnd = mode === "month" ? task.dueDate > monthEnd : diffDays(task.dueDate, yearEnd) > 0;
          const tags = timelineTaskTags(task);
          const progress = taskProgress(task);
          const risk = timelineRisk(task);
          const title = displayTaskTitle(task);
          const tooltip = tooltipDetails(task, risk, clippedStart, clippedEnd);
          return (
            <button
              aria-label={`${title} 타임라인 업무 상세 보기, ${task.status}, 진행률 ${progress}%${risk ? `, ${risk.label}` : ""}`}
              className="timeline-row"
              key={task.id}
              onBlur={() => setTimelineTooltip(null)}
              onFocus={(event) => showTimelineTooltip(event.currentTarget.querySelector(".timeline-bar"), tooltip)}
              onClick={() => onSelect(task)}
              type="button"
            >
              <span className="timeline-title">
                <strong>{title}</strong>
                <small>
                  {personName(task.ownerId)} · {tags.slice(0, 2).join(", ")}
                </small>
              </span>
              <span className="timeline-track">
                <span
                  className={`timeline-bar status-${task.status.replace("/", "")} ${task.recurring ? "recurring" : ""} ${risk ? `has-risk risk-${risk.tone}` : ""} ${clippedStart ? "clipped-start" : ""} ${clippedEnd ? "clipped-end" : ""}`}
                  onMouseEnter={(event) => showTimelineTooltip(event.currentTarget, tooltip)}
                  onMouseLeave={() => setTimelineTooltip(null)}
                  style={{ gridColumn: `${offset + 1} / span ${span}` }}
                >
                  <span className="timeline-bar-copy">
                    <b>{primaryTimelineTag(task)}</b>
                    <strong>{title}</strong>
                  </span>
                  <span className="timeline-bar-meta">
                    {task.recurring && <span className="timeline-sticker repeat" title="반복 업무">🔁</span>}
                    {risk && <span className={`timeline-sticker ${risk.tone}`}>{risk.label}</span>}
                    <em>{progress}%</em>
                  </span>
                </span>
              </span>
            </button>
          );
        })}
        {!visibleTasks.length && <p className="empty-note timeline-empty">선택한 기간에 표시할 업무가 없습니다.</p>}
      </div>
      {timelineTooltip && (
        <div
          className="timeline-floating-tooltip"
          role="tooltip"
          style={{ left: timelineTooltip.left, top: timelineTooltip.top, width: timelineTooltip.width }}
        >
          <strong>{timelineTooltip.title}</strong>
          <small>{timelineTooltip.meta}</small>
          {timelineTooltip.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
    </section>
  );
}

function CalendarView({
  canManageEvent,
  canManageTask,
  events,
  month,
  onAddEvent,
  onAddLink,
  onAddUpdate,
  onArchive,
  onDelete,
  onDeleteEvent,
  onDeleteHistory,
  onDeleteUpdate,
  onEdit,
  onMonthChange,
  onRestore,
  onSelectTask,
  onToggleSubtask,
  onUpdateHistory,
  onUpdateLog,
  onUpdateEvent,
  selectedPersonId,
  tasks
}) {
  const canAssignPersonalCalendar = canAssignPersonalCalendarFor(selectedPersonId);
  const personalCalendarOwnerOptions = canAssignPersonalCalendar
    ? teamAssignablePeople()
    : teamAssignablePeople().filter((person) => person.id === selectedPersonId);
  const [draftEvent, setDraftEvent] = useState({
    title: "",
    date: TODAY,
    startDate: TODAY,
    endDate: TODAY,
    scope: "team",
    ownerId: selectedPersonId,
    note: ""
  });
  const [selectedCalendarItem, setSelectedCalendarItem] = useState(null);
  const calendarNoteRef = useRef(null);
  const [year, monthValue] = month.split("-").map(Number);
  const monthDays = daysInMonth(year, monthValue);
  const firstDay = toDate(`${month}-01`).getDay();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(monthDays).padStart(2, "0")}`;
  const displayTasks = tasksWithRecurringInstances(tasks, monthStart, monthEnd);
  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: monthDays }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)
  ];
  const selectedTask =
    selectedCalendarItem?.type === "task"
      ? displayTasks.find((task) => task.id === selectedCalendarItem.id) ?? selectedCalendarItem.task
      : null;
  const selectedEvent =
    selectedCalendarItem?.type === "event"
      ? events.find((event) => event.id === selectedCalendarItem.id) ?? selectedCalendarItem.event
      : null;
  const hasSelectedCalendarDetail = Boolean(selectedTask || selectedEvent);

  function changeMonth(direction) {
    const next = new Date(year, monthValue - 1 + direction, 1);
    onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  function submitEvent(event) {
    event.preventDefault();
    const title = draftEvent.title.trim();
    if (!title) return;
    const scope = draftEvent.scope === "personal" ? "personal" : "team";
    const ownerId = scope === "personal" ? draftEvent.ownerId || selectedPersonId : selectedPersonId;
    const nextEvent = {
      ...draftEvent,
      id: `e-${Date.now()}`,
      title,
      date: eventStartDate(draftEvent),
      startDate: eventStartDate(draftEvent),
      endDate: eventEndDate(draftEvent),
      scope,
      ownerId,
      creatorId: selectedPersonId,
      note: draftEvent.note.trim()
    };
    onAddEvent(nextEvent);
    setSelectedCalendarItem({ type: "event", id: nextEvent.id, event: nextEvent });
    setDraftEvent((current) => ({
      ...current,
      title: "",
      date: TODAY,
      startDate: TODAY,
      endDate: TODAY,
      ownerId: selectedPersonId,
      note: ""
    }));
  }

  return (
    <section className="calendar-view">
      <div className="calendar-toolbar">
        <div>
          <span className="panel-label">Calendar</span>
          <h2>일정 관리</h2>
          <p className="calendar-help">등록된 팀 일정, 개인 일정, 업무 일정을 팀 전체가 함께 확인합니다.</p>
        </div>
        <div className="period-switcher">
          <button onClick={() => changeMonth(-1)} type="button" title="이전 달">
            <ChevronLeft size={17} />
          </button>
          <strong>{year}년 {monthValue}월</strong>
          <button onClick={() => changeMonth(1)} type="button" title="다음 달">
            <ChevronRight size={17} />
          </button>
          <button className="today-button" onClick={() => onMonthChange(TODAY.slice(0, 7))} type="button">
            오늘
          </button>
        </div>
      </div>
      <form className={`calendar-add-form ${draftEvent.scope === "personal" ? "has-target" : ""}`} onSubmit={submitEvent}>
        <label className="calendar-form-field">
          <span>시작일</span>
          <input
            aria-label="일정 시작일"
            onChange={(event) => {
              const nextStart = event.target.value;
              setDraftEvent((current) => ({
                ...current,
                date: nextStart,
                startDate: nextStart,
                endDate: diffDays(current.endDate, nextStart) >= 0 ? current.endDate : nextStart
              }));
            }}
            type="date"
            value={eventStartDate(draftEvent)}
          />
        </label>
        <label className="calendar-form-field">
          <span>종료일</span>
          <input
            aria-label="일정 종료일"
            min={eventStartDate(draftEvent)}
            onChange={(event) => setDraftEvent((current) => ({ ...current, endDate: event.target.value }))}
            type="date"
            value={eventEndDate(draftEvent)}
          />
        </label>
        <label className="calendar-form-field">
          <span>구분</span>
          <select
            aria-label="일정 구분"
            onChange={(event) => {
              const nextScope = event.target.value;
              setDraftEvent((current) => ({
                ...current,
                scope: nextScope,
                ownerId: nextScope === "personal" ? current.ownerId || selectedPersonId : selectedPersonId
              }));
            }}
            value={draftEvent.scope}
          >
            <option value="team">팀 공유</option>
            <option value="personal">개인 일정</option>
          </select>
        </label>
        {draftEvent.scope === "personal" && (
          <label className="calendar-form-field calendar-target-field">
            <span>대상자</span>
            <select
              aria-label="개인일정 대상자"
              disabled={!canAssignPersonalCalendar}
              onChange={(event) => setDraftEvent((current) => ({ ...current, ownerId: event.target.value }))}
              value={draftEvent.ownerId}
            >
              {personalCalendarOwnerOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="calendar-form-field calendar-title-field">
          <span>일정명</span>
          <input
            aria-label="일정명"
            onChange={(event) => setDraftEvent((current) => ({ ...current, title: event.target.value }))}
            placeholder="예: 전략과제 공유회"
            value={draftEvent.title}
          />
        </label>
        <label className="calendar-form-field calendar-note-field">
          <span>세부내용</span>
          <div className="emoji-input-frame">
            <input
              aria-label="일정 메모"
              onChange={(event) => setDraftEvent((current) => ({ ...current, note: event.target.value }))}
              placeholder="일정 세부 내용"
              ref={calendarNoteRef}
              value={draftEvent.note}
            />
            <EmojiPopover
              onSelect={(emoji) =>
                insertEmojiAtCursor(calendarNoteRef, draftEvent.note, emoji, (value) => setDraftEvent((current) => ({ ...current, note: value })))
              }
              triggerLabel="일정 메모에 이모지 넣기"
              triggerClassName="textarea-emoji-trigger"
            />
          </div>
        </label>
        <button className="primary-button small" type="submit">
          <Plus size={15} />
          일정 추가
        </button>
      </form>
      <div className="calendar-legend" aria-label="캘린더 구분">
        <span className="calendar-legend-team">팀 일정</span>
        <span className="calendar-legend-personal">개인 일정</span>
        <span className="calendar-legend-task">업무 일정</span>
        <small className="calendar-legend-note">ⓘ 업무 일정은 계획된 업무 종료일 기준입니다.</small>
      </div>
      <div className={`calendar-body ${hasSelectedCalendarDetail ? "has-calendar-detail" : ""}`}>
        <div className="calendar-board">
          <div className="calendar-weekdays" aria-hidden="true">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
              <span className={index === 0 || index === 6 ? "holiday" : ""} key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {cells.map((date, index) => {
              const day = date ? toDate(date).getDay() : null;
              const taskDueItems = date
                ? displayTasks
                    .filter((task) => !task.archived && task.dueDate === date)
                    .slice(0, 4)
                : [];
              const dayEvents = date
                ? events
                    .filter((event) => eventSpansDate(event, date))
                    .slice(0, Math.max(1, 5 - taskDueItems.length))
                : [];
              return (
                <div className={`calendar-cell ${date === TODAY ? "today" : ""} ${date ? "" : "empty"} ${day === 0 || day === 6 ? "holiday" : ""}`} key={date ?? `blank-${index}`}>
                  {date && <strong>{Number(date.slice(8, 10))}</strong>}
                  <div className="calendar-events">
                    {taskDueItems.map((task) => (
                      <button
                        className={`calendar-event task-due ${selectedCalendarItem?.type === "task" && selectedCalendarItem.id === task.id ? "selected" : ""}`}
                        key={`${date}-${task.id}`}
                        onClick={() => {
                          const selectedId = onSelectTask(task) || task.id;
                          setSelectedCalendarItem({ type: "task", id: selectedId });
                        }}
                        type="button"
                      >
                        <i />
                        <b>{task.recurring ? `🔁 ${displayTaskTitle(task)}` : displayTaskTitle(task)}</b>
                      </button>
                    ))}
                    {dayEvents.map((event) => (
                      <button
                        className={`calendar-event ${event.scope} ${selectedCalendarItem?.type === "event" && selectedCalendarItem.id === event.id ? "selected" : ""}`}
                        key={`${date}-${event.id}`}
                        onClick={() => setSelectedCalendarItem({ type: "event", id: event.id, event })}
                        title={`${event.scope === "personal" ? `${personName(event.ownerId)} · ` : ""}${event.title} · ${eventRangeLabel(event)}`}
                        type="button"
                      >
                        <i />
                        <b>{event.scope === "personal" ? `${personName(event.ownerId)} · ${event.title}` : event.title}</b>
                        {eventStartDate(event) !== eventEndDate(event) && <em>({eventCompactRangeLabel(event)})</em>}
                      </button>
                    ))}
                    {date && events.filter((event) => eventSpansDate(event, date)).length + tasks.filter((task) => task.dueDate === date).length > 5 && (
                      <small>+ 더보기</small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {hasSelectedCalendarDetail && (
          <CalendarDetailPanel
            canManageEvent={canManageEvent}
            canManageTask={canManageTask}
            event={selectedEvent}
            onAddLink={onAddLink}
            onAddUpdate={onAddUpdate}
            onArchive={onArchive}
            onClose={() => setSelectedCalendarItem(null)}
            onDelete={onDelete}
            onDeleteEvent={(eventId) => {
              onDeleteEvent(eventId);
              setSelectedCalendarItem(null);
            }}
            onEdit={onEdit}
            onRestore={onRestore}
            onToggleSubtask={onToggleSubtask}
            onUpdateEvent={(event) => {
              onUpdateEvent(event);
              setSelectedCalendarItem({ type: "event", id: event.id, event });
            }}
            selectedPersonId={selectedPersonId}
            task={selectedTask}
          />
        )}
      </div>
    </section>
  );
}

function CalendarDetailPanel({
  canManageEvent,
  canManageTask,
  event,
  onAddLink,
  onAddUpdate,
  onArchive,
  onClose,
  onDelete,
  onDeleteEvent,
  onEdit,
  onRestore,
  onToggleSubtask,
  onUpdateEvent,
  selectedPersonId,
  task
}) {
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventDraft, setEventDraft] = useState(() => event ?? null);
  const isTask = Boolean(task);
  const progress = isTask ? taskProgress(task) : 0;
  const tags = isTask ? taskTags(task) : [];
  const visibleSubtasks = isTask ? (task.subtasks ?? []).filter((subtask) => subtask.title?.trim()).slice(0, 4) : [];
  const visibleLinks = isTask ? (task.links ?? []).filter((link) => link.title || link.url).slice(0, 3) : [];
  const visibleUpdates = isTask ? (task.updates ?? []).slice(0, 3) : [];
  const canAssignPersonalCalendar = canAssignPersonalCalendarFor(selectedPersonId);
  const canManageSelectedEvent = event ? canManageEvent(event) : false;
  const personalCalendarOwnerOptions = canAssignPersonalCalendar
    ? teamAssignablePeople()
    : teamAssignablePeople().filter((person) => person.id === selectedPersonId || person.id === event?.ownerId);
  useEffect(() => {
    setEventDraft(event ?? null);
    setIsEditingEvent(false);
  }, [event?.id]);
  if (!task && !event) {
    return (
      <aside className="calendar-detail-panel calendar-detail-empty">
        <span className="panel-label">일정 상세</span>
        <h3>캘린더에서 업무나 일정을 선택하세요.</h3>
        <p>오른쪽에서 담당자, 일자, 세부 내용을 바로 확인할 수 있습니다.</p>
      </aside>
    );
  }
  if (isTask) {
    const actionTaskId = task.recurringTemplateId || task.id;
    return (
      <aside className="calendar-detail-panel calendar-task-detail-panel">
        <TaskDetail
          canManage={canManageTask(task)}
          onAddLink={(link) => onAddLink(actionTaskId, link)}
          onAddUpdate={(text) => onAddUpdate(actionTaskId, text)}
          onArchive={() => onArchive(task)}
          onClose={onClose}
          onDelete={() => onDelete(task)}
          onDeleteHistory={(entry, index) => onDeleteHistory(task, entry, index)}
          onDeleteUpdate={(update, index) => onDeleteUpdate(task, update, index)}
          onEdit={() => onEdit(task)}
          onRestore={() => onRestore(task)}
          onToggleSubtask={(taskId, subtaskId) => onToggleSubtask(actionTaskId || taskId, subtaskId)}
          onUpdateHistory={(entry, index, note) => onUpdateHistory(task, entry, index, note)}
          onUpdateLog={(update, index, text) => onUpdateLog(task, update, index, text)}
          selectedPersonId={selectedPersonId}
          task={task}
        />
      </aside>
    );
  }
  function submitEventUpdate(submitEvent) {
    submitEvent.preventDefault();
    if (!eventDraft?.title?.trim()) return;
    const scope = eventDraft.scope === "personal" ? "personal" : "team";
    onUpdateEvent({
      ...eventDraft,
      scope,
      ownerId: scope === "personal" ? eventDraft.ownerId || selectedPersonId : eventDraft.ownerId || selectedPersonId,
      creatorId: eventCreatorId(eventDraft),
      date: eventStartDate(eventDraft),
      startDate: eventStartDate(eventDraft),
      endDate: eventEndDate(eventDraft)
    });
    setIsEditingEvent(false);
  }
  return (
    <aside className={`calendar-detail-panel ${isEditingEvent ? "is-editing-event" : ""}`}>
      <div className="calendar-event-detail-head">
        <div>
          <span className="panel-label">{event.scope === "team" ? "팀 일정" : "개인 일정"}</span>
          {!isEditingEvent && <h3>{event.title}</h3>}
        </div>
        {!isEditingEvent && (
          <div className="calendar-event-actions">
            {canManageSelectedEvent ? (
              <>
                <button className="icon-button" onClick={() => setIsEditingEvent(true)} type="button" title="일정 수정">
                  <Edit3 size={14} />
                </button>
                <button className="icon-button danger-icon" onClick={() => onDeleteEvent(event.id)} type="button" title="일정 삭제">
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <span className="permission-readonly">읽기 전용</span>
            )}
            <button className="icon-button" onClick={onClose} type="button" title="일정 상세 닫기">
              <X size={15} />
            </button>
          </div>
        )}
      </div>
      {isEditingEvent ? (
        <form className="calendar-event-edit-form" onSubmit={submitEventUpdate}>
          <label className="calendar-event-title-field">
            <span>일정명</span>
            <input
              onChange={(changeEvent) => setEventDraft((current) => ({ ...current, title: changeEvent.target.value }))}
              value={eventDraft?.title ?? ""}
            />
          </label>
          <label className="calendar-event-half-field">
            <span>구분</span>
            <select
              onChange={(changeEvent) => {
                const nextScope = changeEvent.target.value;
                setEventDraft((current) => ({
                  ...current,
                  scope: nextScope,
                  ownerId: nextScope === "personal" ? current.ownerId || selectedPersonId : current.ownerId || selectedPersonId
                }));
              }}
              value={eventDraft?.scope ?? "team"}
            >
              <option value="team">팀 공유</option>
              <option value="personal">개인 일정</option>
            </select>
          </label>
          {eventDraft?.scope === "personal" && (
            <label className="calendar-event-half-field">
              <span>대상자</span>
              <select
                disabled={!canAssignPersonalCalendar}
                onChange={(changeEvent) => setEventDraft((current) => ({ ...current, ownerId: changeEvent.target.value }))}
                value={eventDraft?.ownerId ?? selectedPersonId}
              >
                {personalCalendarOwnerOptions.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="calendar-event-half-field">
            <span>시작일</span>
            <input
              onChange={(changeEvent) => {
                const nextStart = changeEvent.target.value;
                setEventDraft((current) => ({
                  ...current,
                  date: nextStart,
                  startDate: nextStart,
                  endDate: diffDays(eventEndDate(current), nextStart) >= 0 ? eventEndDate(current) : nextStart
                }));
              }}
              type="date"
              value={eventStartDate(eventDraft)}
            />
          </label>
          <label className="calendar-event-half-field">
            <span>종료일</span>
            <input
              min={eventStartDate(eventDraft)}
              onChange={(changeEvent) => setEventDraft((current) => ({ ...current, endDate: changeEvent.target.value }))}
              type="date"
              value={eventEndDate(eventDraft)}
            />
          </label>
          <label className="calendar-event-note-field">
            <span>일정 세부내용</span>
            <textarea
              onChange={(changeEvent) => setEventDraft((current) => ({ ...current, note: changeEvent.target.value }))}
              rows={3}
              value={eventDraft?.note ?? ""}
            />
          </label>
          <div className="calendar-event-edit-actions">
            <button className="secondary-button small" onClick={() => setIsEditingEvent(false)} type="button">
              취소
            </button>
            <button className="primary-button small" type="submit">
              저장
            </button>
          </div>
        </form>
      ) : (
        <div className="calendar-event-detail-card">
          <div className="calendar-event-note-card">
            <span>일정 세부내용</span>
            <strong>{event.note || "등록된 세부 내용이 없습니다."}</strong>
          </div>
          <dl className="calendar-event-meta">
            <div>
              <dt>일자</dt>
              <dd>{eventRangeLabel(event)}</dd>
            </div>
            <div>
              <dt>구분</dt>
              <dd>{event.scope === "team" ? "팀 공유" : "개인 일정"}</dd>
            </div>
            {event.scope === "personal" && (
              <div>
                <dt>대상자</dt>
                <dd>{personName(event.ownerId)}</dd>
              </div>
            )}
            <div>
              <dt>등록자</dt>
              <dd>{personName(eventCreatorId(event))}</dd>
            </div>
          </dl>
        </div>
      )}
    </aside>
  );
}

function RecurringView({ canManageTask, onEditRecurring, onSelect, onSelectOccurrence, onStopRecurring, tasks }) {
  const recurring = tasks.filter((task) => !isDeletedTask(task) && task.recurring && !task.isRecurringInstance);
  return (
    <section className="recurring-view">
      {recurring.map((task) => {
        const completedDueDates = new Set(
          tasks
            .filter((item) => item.recurringTemplateId === task.id && item.status === "완료")
            .map((item) => item.dueDate)
        );
        const occurrences = recurringSchedulePreview(task, completedDueDates);
        const visibleOccurrences = occurrences.slice(0, 8);
        const hiddenOccurrenceCount = Math.max(0, occurrences.length - visibleOccurrences.length);
        return (
          <article className="recurring-row" key={task.id}>
            <div className="recurring-main">
              <span className="recurring-icon">🔁</span>
              <span>
                <button className="recurring-title-button" onClick={() => onSelect(task.id)} type="button">
                  {displayTaskTitle(task)}
                </button>
                {displayTaskTitle(task) === "팀장 주간 업무 배정 정리" && (
                  <em className="recurring-sample-chip">수정 흐름 샘플</em>
                )}
                <small>
                  {recurringSummary(task)} · {personName(task.ownerId)} · 다음 마감 {occurrences[0]?.dueDate ?? task.dueDate}
                </small>
                <span className="recurring-upcoming" aria-label="생성 예정 업무">
                  {visibleOccurrences.map((occurrence) => (
                    <button
                      key={`${task.id}-${occurrence.dueDate}`}
                      onClick={() => onSelectOccurrence({
                        ...task,
                        ...occurrence,
                        id: `${task.id}__repeat__${occurrence.dueDate}`,
                        status: "계획",
                        completedAt: "",
                        completedBy: "",
                        progressBeforeComplete: undefined,
                        progress: 0,
                        updates: [],
                        statusHistory: [],
                        subtasks: (task.subtasks ?? []).map((subtask) => ({ ...subtask, done: false })),
                        createdAt: "",
                        isNewAssignment: false,
                        isRecurringInstance: true,
                        recurringTemplateId: task.id
                      })}
                      aria-label={`${formatDate(occurrence.startDate)} 시작 회차를 개별 업무로 만들기`}
                      title={`${formatDate(occurrence.startDate)} 시작 · ${formatDate(occurrence.dueDate)} 마감`}
                      type="button"
                    >
                      <em>회차 생성</em>
                      <b>{formatDate(occurrence.startDate)} 시작</b>
                      <small>{formatDate(occurrence.dueDate)} 마감</small>
                    </button>
                  ))}
                  {hiddenOccurrenceCount > 0 && (
                    <span className="recurring-more-chip" title={`화면에는 앞 회차만 표시합니다. 남은 예정 ${hiddenOccurrenceCount}회`}>
                      <b>… +{hiddenOccurrenceCount}회</b>
                      <small>이후 예정</small>
                    </span>
                  )}
                </span>
              </span>
            </div>
            {canManageTask(task) && (
              <div className="recurring-row-actions">
                <button
                  className="secondary-button small recurring-stop-button"
                  onClick={() => onEditRecurring(task)}
                  type="button"
                  title="미수행 반복 일정 수정"
                >
                  <Edit3 size={14} />
                  미수행 반복 일정 수정
                </button>
                <button
                  className="secondary-button small recurring-stop-button"
                  onClick={() => onStopRecurring(task.id)}
                  type="button"
                  title="시작 전 미래 반복 회차 삭제"
                >
                  <X size={14} />
                  미수행 반복 일정 삭제
                </button>
              </div>
            )}
          </article>
        );
      })}
      {!recurring.length && <p className="empty-note">반복 업무가 아직 없습니다.</p>}
    </section>
  );
}

function ArchiveView({ isTeamScope, onFillDemo, onRestore, onSelect, people: archivePeople = [], tasks }) {
  const [ownerFilter, setOwnerFilter] = useState("전체");
  const [periodFilter, setPeriodFilter] = useState("전체");
  const [isOwnerFilterOpen, setIsOwnerFilterOpen] = useState(false);
  const [isPeriodFilterOpen, setIsPeriodFilterOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({ completed: true, held: true });
  const periods = [
    { id: "전체", label: "전체기간" },
    { id: "Q1", label: "1분기" },
    { id: "Q2", label: "2분기" },
    { id: "Q3", label: "3분기" },
    { id: "Q4", label: "4분기" }
  ];

  function archiveDateLabel(task) {
    if (task.status === "완료") return completionDate(task) || task.dueDate;
    return task.dueDate;
  }

  function archivePeriod(task) {
    const date = archiveDateLabel(task);
    if (!isISODate(date)) return "전체";
    return `Q${quarterNumberFromDate(date)}`;
  }

  const filteredArchiveTasks = tasks.filter((task) => {
    const byOwner = !isTeamScope || ownerFilter === "전체" || task.ownerId === ownerFilter;
    const byPeriod = periodFilter === "전체" || archivePeriod(task) === periodFilter;
    return byOwner && byPeriod;
  });
  const completedTasks = filteredArchiveTasks.filter((task) => task.status === "완료");
  const heldTasks = filteredArchiveTasks.filter((task) => task.status === "보류");
  const otherTasks = filteredArchiveTasks.filter((task) => !["완료", "보류"].includes(task.status));
  const sections = [
    {
      key: "completed",
      title: "완료 업무",
      description: "처리 완료 후 보관한 업무입니다. 필요하면 메인 완료 컬럼으로 복원할 수 있습니다.",
      empty: "보관된 완료 업무가 없습니다.",
      tasks: completedTasks
    },
    {
      key: "held",
      title: "보류 업무",
      description: "복원하면 메인 보드의 보류 컬럼으로 돌아갑니다. 이후 진행중/계획 상태로 다시 전환할 수 있습니다.",
      empty: "보관된 보류 업무가 없습니다.",
      tasks: heldTasks
    }
  ];
  if (otherTasks.length) {
    sections.push({
      key: "other",
      title: "기타 보관 업무",
      description: "완료/보류 외 상태로 보관된 업무입니다.",
      empty: "",
      tasks: otherTasks
    });
  }
  const ownerOptions = [
    { id: "전체", label: "전체 담당", count: tasks.filter((task) => periodFilter === "전체" || archivePeriod(task) === periodFilter).length },
    ...archivePeople.map((person) => ({
      id: person.id,
      label: `${person.emoji ?? ""} ${person.name}`.trim(),
      count: tasks.filter((task) => task.ownerId === person.id && (periodFilter === "전체" || archivePeriod(task) === periodFilter)).length
    }))
  ];
  const periodOptions = periods.map((period) => ({
    ...period,
    count: tasks.filter((task) => {
      const byOwner = !isTeamScope || ownerFilter === "전체" || task.ownerId === ownerFilter;
      return byOwner && (period.id === "전체" || archivePeriod(task) === period.id);
    }).length
  }));
  const activeOwnerLabel = ownerOptions.find((option) => option.id === ownerFilter)?.label ?? "전체 담당";
  const activePeriodLabel = periodOptions.find((option) => option.id === periodFilter)?.label ?? "전체기간";
  const hasFilteredTasks = filteredArchiveTasks.length > 0;

  function toggleArchiveSection(key) {
    setCollapsedSections((current) => ({ ...current, [key]: !current[key] }));
  }

  function visibleTags(task) {
    return normalizeTags(taskTags(task).filter((tag) => tag !== task.category));
  }

  return (
    <section className="archive-view">
      <div className="archive-heading">
        <div>
          <span className="panel-label">보관함</span>
          <h2>메인 업무흐름에서 숨긴 완료/보류 업무</h2>
          <p>누적되는 기록은 표로 훑고, 필요한 업무만 상세를 열거나 메인 보드로 복원합니다.</p>
        </div>
        <div className="archive-heading-actions">
          {onFillDemo ? (
            <button className="secondary-button small" onClick={onFillDemo} type="button">
              <Sparkles size={15} />
              데모 데이터 채우기
            </button>
          ) : null}
          <Archive size={20} />
        </div>
      </div>
      {tasks.length ? (
        <div className="archive-sections">
          <div className="archive-filter-stack">
            {isTeamScope ? (
              <div className={`archive-filter-panel ${isOwnerFilterOpen ? "is-open" : ""}`}>
                <button className="archive-filter-head" onClick={() => setIsOwnerFilterOpen((open) => !open)} type="button">
                  <span>
                    <strong>담당자</strong>
                    <small>{activeOwnerLabel} · {filteredArchiveTasks.length}건</small>
                  </span>
                  <ChevronDown size={16} />
                </button>
                {isOwnerFilterOpen ? (
                  <div className="archive-filter-options">
                    {ownerOptions.map((option) => (
                      <button
                        className={ownerFilter === option.id ? "active" : ""}
                        disabled={option.count === 0 && option.id !== ownerFilter}
                        key={option.id}
                        onClick={() => {
                          setOwnerFilter(option.id);
                          setIsOwnerFilterOpen(false);
                        }}
                        type="button"
                      >
                        <span>{option.label}</span>
                        <em>{option.count}</em>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className={`archive-filter-panel ${isPeriodFilterOpen ? "is-open" : ""}`}>
              <button className="archive-filter-head" onClick={() => setIsPeriodFilterOpen((open) => !open)} type="button">
                <span>
                  <strong>기간</strong>
                  <small>{activePeriodLabel} · {filteredArchiveTasks.length}건</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {isPeriodFilterOpen ? (
                <div className="archive-filter-options period-options">
                  {periodOptions.map((option) => (
                    <button
                      className={periodFilter === option.id ? "active" : ""}
                      disabled={option.count === 0 && option.id !== periodFilter}
                      key={option.id}
                      onClick={() => {
                        setPeriodFilter(option.id);
                        setIsPeriodFilterOpen(false);
                      }}
                      type="button"
                    >
                      <span>{option.label}</span>
                      <em>{option.count}</em>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {!hasFilteredTasks ? <p className="empty-note archive-section-empty">선택한 조건에 맞는 보관 업무가 없습니다.</p> : null}
          {hasFilteredTasks ? sections.map((section) => (
            <section className={`archive-section archive-section-${section.key}`} key={section.key}>
              <button
                className={`archive-section-head ${collapsedSections[section.key] ? "is-collapsed" : ""}`}
                onClick={() => toggleArchiveSection(section.key)}
                type="button"
              >
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.description}</p>
                </div>
                <span>
                  {section.tasks.length}건
                  <ChevronDown size={15} />
                </span>
              </button>
              {!collapsedSections[section.key] && section.tasks.length ? (
                <div className="archive-table-wrap">
                  <table className="archive-table">
                    <thead>
                      <tr>
                        <th scope="col">업무</th>
                        <th scope="col">담당</th>
                        <th scope="col">카테고리</th>
                        <th scope="col">태그</th>
                        <th scope="col">{section.key === "completed" ? "완료일" : "마감일"}</th>
                        <th scope="col">복원</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.tasks.map((task) => (
                        <tr key={task.id}>
                          <td className="archive-title-cell">
                            <button onClick={() => onSelect(task.id)} type="button">
                              <span className="status-dot" data-status={task.status} />
                              <strong>{displayTaskTitle(task)}</strong>
                            </button>
                          </td>
                          <td>{personName(task.ownerId)}</td>
                          <td>{task.category || "미지정"}</td>
                          <td>
                            <span className="archive-tag-line">{visibleTags(task).slice(0, 3).join(", ") || "태그 없음"}</span>
                          </td>
                          <td>{formatDate(archiveDateLabel(task))}</td>
                          <td className="archive-restore-cell">
                            <button className="secondary-button small" onClick={() => onRestore(task)} type="button">
                              <ArchiveRestore size={15} />
                              {task.status === "보류" ? "보류로 복원" : "복원"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !collapsedSections[section.key] ? (
                <p className="empty-note archive-section-empty">{section.empty}</p>
              ) : null}
            </section>
          )) : null}
        </div>
      ) : (
        <p className="empty-note">보관된 업무가 없습니다. 완료 또는 보류 업무에서 보관을 누르면 이곳에 모입니다.</p>
      )}
    </section>
  );
}

function UpdatesView({ initialScope = "mine", onAddUpdate, onSelect, selectedPersonId, tasks }) {
  const [draftUpdates, setDraftUpdates] = useState({});
  const [scope, setScope] = useState(initialScope);
  useEffect(() => {
    setScope(initialScope);
  }, [initialScope]);

  const updatedTasks = tasks
    .map((task) => ({
      ...task,
      sortedUpdates: [...(task.updates ?? [])]
        .filter((update) => {
          const daysAgo = diffDays(TODAY, update.date);
          return daysAgo >= 0 && daysAgo <= 7;
        })
        .sort((a, b) => b.date.localeCompare(a.date))
    }))
    .map((task) => ({ ...task, latestUpdate: task.sortedUpdates[0] }))
    .filter((task) => !isDeletedTask(task) && !task.archived && task.status !== "완료" && task.latestUpdate)
    .filter((task) => {
      if (scope === "team") return true;
      return task.ownerId === selectedPersonId || task.sortedUpdates.some((update) => update.authorId === selectedPersonId);
    })
    .sort((a, b) => b.latestUpdate.date.localeCompare(a.latestUpdate.date) || displayTaskTitle(a).localeCompare(displayTaskTitle(b), "ko-KR"));
  const newAssignmentTasks = tasks
    .filter((task) => !isDeletedTask(task) && !task.archived && task.status !== "완료" && isRecentAssignment(task))
    .filter((task) => {
      if (scope === "team") return true;
      return task.ownerId === selectedPersonId || task.creatorId === selectedPersonId || task.assignerId === selectedPersonId;
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || displayTaskTitle(a).localeCompare(displayTaskTitle(b), "ko-KR"));
  const scopeCopy = scope === "team" ? "Team" : "My";

  return (
    <section className="updates-view">
      <div className="updates-heading">
        <div>
          <span className="panel-label">업데이트</span>
          <h2>{scopeCopy} 최근 업데이트</h2>
        </div>
        <div className="updates-heading-actions">
          <div className="segmented small update-scope-toggle" role="tablist" aria-label="업데이트 보기 범위">
            <button
              aria-selected={scope === "mine"}
              className={scope === "mine" ? "active" : ""}
              onClick={() => setScope("mine")}
              type="button"
            >
              My
            </button>
            <button
              aria-selected={scope === "team"}
              className={scope === "team" ? "active" : ""}
              onClick={() => setScope("team")}
              type="button"
            >
              Team
            </button>
          </div>
          <small className="updates-help">
            <Info size={14} />
            {scope === "team" ? "팀 전체" : "내 담당/작성"} 로그 7일 + 새 배정 3일 · 완료 제외
          </small>
        </div>
      </div>
      {updatedTasks.length || newAssignmentTasks.length ? (
        <div className="updates-content-grid">
          <div className="updates-column">
            <div className="updates-section-title">
              <strong>로그 업데이트</strong>
              <span>{updatedTasks.length}건</span>
            </div>
            {updatedTasks.length ? (
              <div className="update-task-grid update-log-grid">
                {updatedTasks.map((task) => {
                  const statusMeta = reportStatusMeta(task);
                  return (
                    <article className="update-task-card" key={task.id}>
                      <button className="update-task-main" onClick={() => onSelect(task.id)} type="button">
                        <span className="update-title-line">
                          <span
                            className="update-summary-badge update-initial-badge"
                            style={avatarStyle(task.ownerId)}
                            title={personName(task.ownerId)}
                          >
                            {initials(personName(task.ownerId))}
                          </span>
                          <strong>{displayTaskTitle(task)}</strong>
                          <span className={`update-status-badge report-${statusMeta.tone}`}>{statusMeta.label}</span>
                          <span className="update-tag-line">
                            {taskTags(task).slice(0, 3).map((tag) => (
                              <em className={`tag-tone-${tagTone(tag)}`} key={`${task.id}-${tag}`}>{tag}</em>
                            ))}
                          </span>
                        </span>
                        <span className="update-task-meta">{task.latestUpdate.date}</span>
                      </button>
                      <div className="update-log-stack">
                        {task.sortedUpdates.slice(0, 3).map((update, index) => (
                          <div className="update-log-row" key={`${task.id}-${update.date}-${index}`}>
                            <span>{update.date}</span>
                            <strong>{personName(update.authorId)}</strong>
                            <p>{update.text}</p>
                          </div>
                        ))}
                      </div>
                      <form
                        className="update-inline-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const text = (draftUpdates[task.id] ?? "").trim();
                          if (!text) return;
                          onAddUpdate(task.id, text);
                          setDraftUpdates((current) => ({ ...current, [task.id]: "" }));
                        }}
                      >
                        <span className="avatar tiny emoji-avatar" style={avatarStyle(selectedPersonId)}>
                          {personEmoji(selectedPersonId)}
                        </span>
                        <input
                          aria-label={`${displayTaskTitle(task)} 업데이트 추가`}
                          onChange={(event) => setDraftUpdates((current) => ({ ...current, [task.id]: event.target.value }))}
                          placeholder="업데이트 로그 바로 남기기"
                          value={draftUpdates[task.id] ?? ""}
                        />
                        <button className="secondary-button small" type="submit">
                          남기기
                        </button>
                      </form>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="empty-note">최근 7일 안에 표시할 업데이트가 없습니다.</p>
            )}
          </div>
          <div className="updates-column">
            <div className="updates-section-title">
              <strong>새로 배정된 업무</strong>
              <span>{newAssignmentTasks.length}건</span>
            </div>
            {newAssignmentTasks.length ? (
              <div className="new-assignment-grid">
                {newAssignmentTasks.map((task) => (
                  <TaskCard
                    canManage={false}
                    dragging={false}
                    key={task.id}
                    onArchive={() => {}}
                    onDragEnd={() => {}}
                    onDragStart={() => {}}
                    onEdit={() => {}}
                    onSelect={() => onSelect(task.id)}
                    onStatusChange={() => {}}
                    selected={false}
                    showOwner
                    task={task}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-note">최근 3일 안에 새로 배정된 업무가 없습니다.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="empty-note">최근 표시할 업데이트나 새 배정 업무가 없습니다. 업무 상세에서 바로 업데이트를 남길 수 있습니다.</p>
      )}
    </section>
  );
}

function BriefingDetail({ group, isTeam, onClose, onSelect, selectedTaskId }) {
  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div>
          <span className="panel-label">브리핑 묶음</span>
          <h2>
            {group.icon} {group.title}
          </h2>
        </div>
        <div className="detail-actions">
          <span className="detail-count">{group.tasks.length}건</span>
          <button className="icon-button" onClick={onClose} type="button" title="브리핑 상세 닫기">
            <X size={17} />
          </button>
        </div>
      </div>
      <p className="detail-description">
        {group.caption}. {isTeam ? "담당자별로 함께 확인하고, 필요한 업무를 열어 상세 내용을 볼 수 있습니다." : "오늘 내 업무 중 같은 성격으로 묶인 항목입니다."}
      </p>
      <div className="detail-task-list">
        {group.tasks.map((task) => (
          <article className={`detail-task-row ${selectedTaskId === task.id ? "selected" : ""}`} key={task.id}>
            <button className="detail-task-main" onClick={() => onSelect(task.id)} type="button">
              <span className="status-dot" data-status={task.status} />
              <span>
                <strong>{task.title}</strong>
                <small>
                  {isTeam && `${personName(task.ownerId)} · `}
                  {taskTags(task).slice(0, 2).join(", ")} · {task.dueDate} · {taskProgress(task)}%
                </small>
              </span>
            </button>
            <ProgressBar value={taskProgress(task)} />
          </article>
        ))}
      </div>
      <div className="detail-callout">
        <span>확인 방식</span>
        <strong>위 업무를 선택하면 오른쪽 패널이 개별 업무 상세로 전환됩니다.</strong>
      </div>
    </section>
  );
}

function RecurringEditScopeModal({ onCancel, onSelect, task }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="recurring-scope-modal" role="dialog" aria-modal="true" aria-label="반복업무 수정 범위 선택">
        <div className="modal-header">
          <div>
            <span className="panel-label">반복업무 수정</span>
            <h2>{displayTaskTitle(task)}</h2>
          </div>
          <button className="icon-button" onClick={onCancel} type="button" title="닫기">
            <X size={18} />
          </button>
        </div>
        <p className="recurring-scope-help">
          이 업무는 반복 규칙이 연결되어 있어요. 저장할 범위를 선택해 주세요.
        </p>
        <div className="recurring-scope-options">
          <button className="recurring-scope-option disabled" disabled type="button">
            <strong>이번 회차만</strong>
            <span>특정 회차를 직접 선택해 수정할 때 사용할 수 있습니다.</span>
          </button>
          <button className="recurring-scope-option" onClick={() => onSelect("future")} type="button">
            <strong>앞으로의 회차</strong>
            <span>오늘 이후 미수행 회차를 새 규칙 기준으로 다시 보여줍니다.</span>
          </button>
          <button className="recurring-scope-option" onClick={() => onSelect("all")} type="button">
            <strong>반복 규칙 전체</strong>
            <span>원본 반복 규칙만 수정하고 기존에 저장된 회차 기록은 유지합니다.</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function PerformanceView({ isWikiReady = false, onReadWikiPage, onSearchWikiPages, postCategories, tasks }) {
  const [activePerformanceTab, setActivePerformanceTab] = useState("report");
  const [mode, setMode] = useState("week");
  const [anchorDate, setAnchorDate] = useState(TODAY);
  const [showLongDetails, setShowLongDetails] = useState(false);
  const [includeSources, setIncludeSources] = useState(false);
  const [copyState, setCopyState] = useState("");
  const [showCopyFallback, setShowCopyFallback] = useState(false);
  const [personFilter, setPersonFilter] = useState("전체");
  const [expandedPostGroups, setExpandedPostGroups] = useState({});
  const [wikiQuery, setWikiQuery] = useState("");
  const [wikiWorkstream, setWikiWorkstream] = useState("전체");
  const [wikiStatus, setWikiStatus] = useState("idle");
  const [wikiError, setWikiError] = useState("");
  const [wikiPages, setWikiPages] = useState([]);
  const [selectedWikiPage, setSelectedWikiPage] = useState(null);
  const range = periodRange(mode, anchorDate);
  const selectedYear = anchorDate.slice(0, 4);
  const selectedMonth = Number(anchorDate.slice(5, 7));
  const selectedQuarter = Math.floor((selectedMonth - 1) / 3) + 1;
  const currentYear = Number(TODAY.slice(0, 4));
  const yearOptions = Array.from(
    new Set([
      String(currentYear - 1),
      TODAY.slice(0, 4),
      String(currentYear + 1),
      ...tasks.flatMap((task) => [task.startDate.slice(0, 4), task.dueDate.slice(0, 4), completionDate(task).slice(0, 4)].filter(Boolean))
    ])
  ).sort();
  const reportTitle = periodReportTitle(mode, anchorDate, range);
  const wikiWorkstreamOptions = useMemo(
    () => collectWorkstreams(tasks.filter((task) => !isDeletedTask(task) && !task.archived)).map((group) => group.label).filter(Boolean),
    [tasks]
  );
  const updateMonthAnchor = (year, month) => setAnchorDate(`${year}-${String(month).padStart(2, "0")}-01`);
  const updateQuarterAnchor = (year, quarter) => setAnchorDate(`${year}-${String((Number(quarter) - 1) * 3 + 1).padStart(2, "0")}-01`);
  const updateYearAnchor = (year) => setAnchorDate(`${year}-01-01`);
  const displayTasks = tasksWithRecurringInstances(tasks, range.start, range.end);
  const highlightPostGroups = useMemo(() => {
    const posts = displayTasks
      .filter((task) => !isDeletedTask(task) && !task.archived)
      .flatMap((task) => taskKnowledgePosts(task, postCategories))
      .sort((a, b) => b.date.localeCompare(a.date) || a.taskTitle.localeCompare(b.taskTitle, "ko-KR"));
    const groupMap = new Map();
    posts.forEach((post) => {
      const label = post.workstream || "업무흐름 미지정";
      if (!groupMap.has(label)) groupMap.set(label, []);
      groupMap.get(label).push(post);
    });
    return Array.from(groupMap.entries())
      .map(([label, items]) => ({ label, items, latestDate: items[0]?.date || "" }))
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate) || a.label.localeCompare(b.label, "ko-KR"));
  }, [displayTasks, postCategories]);
  const periodTasks = displayTasks.filter((task) => taskInPerformanceRange(task, range) && taskIncludedInPerformanceMode(task, mode, showLongDetails));
  const personRows = teamAssignablePeople().map((person) => {
    const owned = periodTasks.filter((task) => task.ownerId === person.id);
    return {
      person,
      owned: performanceItemsForTasks(owned.sort((a, b) => toDate(effectiveReportDate(a)) - toDate(effectiveReportDate(b))), mode, range, {
        showLongDetails
      }),
    };
  });
  const activePeople = personRows.filter(({ owned, person }) =>
    owned.length && (personFilter === "전체" || person.id === personFilter)
  );
  const reportMarkdown = performanceReportMarkdown(activePeople, mode, range, reportTitle, {
    includeSources,
    showLongDetails
  });

  async function searchWikiPages(event) {
    event?.preventDefault();
    if (!isWikiReady || !onSearchWikiPages) return;
    setWikiStatus("loading");
    setWikiError("");
    try {
      const query = wikiQuery.trim() || (wikiWorkstream === "전체" ? "" : wikiWorkstream);
      const response = await onSearchWikiPages({ query, pageType: "workstream" });
      const items = Array.isArray(response?.items) ? response.items : [];
      setWikiPages(items);
      setSelectedWikiPage(null);
      setWikiStatus("idle");
    } catch (error) {
      console.warn("Wiki page 검색에 실패했습니다.", error);
      setWikiPages([]);
      setSelectedWikiPage(null);
      setWikiError(error.message || "Wiki page 검색에 실패했습니다.");
      setWikiStatus("error");
    }
  }

  async function selectWikiPage(pageId) {
    if (!pageId || !onReadWikiPage) return;
    setWikiStatus("loading");
    setWikiError("");
    try {
      const page = await onReadWikiPage(pageId);
      setSelectedWikiPage(page);
      setWikiStatus("idle");
    } catch (error) {
      console.warn("Wiki page 읽기에 실패했습니다.", error);
      setWikiError(error.message || "Wiki page 읽기에 실패했습니다.");
      setWikiStatus("error");
    }
  }

  async function copyReportMarkdown() {
    const copied = await copyText(reportMarkdown);
    setCopyState(copied ? "복사됨" : "직접 복사");
    setShowCopyFallback(!copied);
    window.setTimeout(() => setCopyState(""), 1800);
  }

  function downloadReportMarkdown() {
    if (!localDashboardStore.canUse()) return;
    const blob = new Blob([reportMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `performance-${mode}-${anchorDate}.md`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <section className={`performance-view performance-${mode}`}>
      <div className="performance-heading">
        <div>
          <span className="panel-label">업무실적</span>
          <h2>{activePerformanceTab === "posts" ? "업무흐름별 게시글 모음" : activePerformanceTab === "wiki" ? "업무흐름 Wiki" : reportTitle}</h2>
          <p>{activePerformanceTab === "posts" ? "업무흐름별로 게시글을 접어 두고 필요한 흐름만 펼쳐 봅니다." : activePerformanceTab === "wiki" ? "발행된 Wiki page를 업무흐름 기준으로 검색하고 출처와 함께 읽습니다." : `${range.label} 기준으로 업무명과 세부 진행내역을 보고서 초안처럼 묶어 보여줍니다.`}</p>
        </div>
        <div className="performance-controls">
          <div className="segmented small performance-tabs" role="tablist" aria-label="Highlights 보기">
            <button className={activePerformanceTab === "report" ? "active" : ""} onClick={() => setActivePerformanceTab("report")} type="button">
              실적
            </button>
            <button className={activePerformanceTab === "posts" ? "active" : ""} onClick={() => setActivePerformanceTab("posts")} type="button">
              업무흐름별 게시글 모음
            </button>
            <button className={activePerformanceTab === "wiki" ? "active" : ""} onClick={() => setActivePerformanceTab("wiki")} type="button">
              Wiki
            </button>
          </div>
          {activePerformanceTab === "report" && (
            <>
          <div className="performance-period-row">
            <div className="segmented small" role="tablist" aria-label="실적 기간">
              {[
                ["week", "주간"],
                ["month", "월간"],
                ["quarter", "분기"],
                ["year", "년간"]
              ].map(([key, label]) => (
                <button className={mode === key ? "active" : ""} key={key} onClick={() => setMode(key)} type="button">
                  {label}
                </button>
              ))}
            </div>
            <div className="period-pickers">
              <label>
                사람
                <select value={personFilter} onChange={(event) => setPersonFilter(event.target.value)}>
                  <option value="전체">전체</option>
                  {teamAssignablePeople().map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </label>
              {mode === "week" && (
                <label>
                  기준일
                  <input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
                </label>
              )}
              {mode === "month" && (
                <>
                  <label>
                    연도
                    <select value={selectedYear} onChange={(event) => updateMonthAnchor(event.target.value, selectedMonth)}>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}년</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    월
                    <select value={selectedMonth} onChange={(event) => updateMonthAnchor(selectedYear, Number(event.target.value))}>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={month}>{month}월</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {mode === "quarter" && (
                <>
                  <label>
                    연도
                    <select value={selectedYear} onChange={(event) => updateQuarterAnchor(event.target.value, selectedQuarter)}>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}년</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    분기
                    <select value={selectedQuarter} onChange={(event) => updateQuarterAnchor(selectedYear, event.target.value)}>
                      {[1, 2, 3, 4].map((quarter) => (
                        <option key={quarter} value={quarter}>{quarter}분기</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {mode === "year" && (
                <label>
                  연도
                  <select value={selectedYear} onChange={(event) => updateYearAnchor(event.target.value)}>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}년</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
          <div className="performance-action-row">
            <div className="performance-export-options">
              {mode !== "week" && (
                <label>
                  <input
                    aria-label="이슈와 설명을 포함한 상세실적 보기"
                    checked={showLongDetails}
                    onChange={(event) => setShowLongDetails(event.target.checked)}
                    type="checkbox"
                  />
                  이슈/설명 포함 상세실적 보기
                </label>
              )}
              <label title="파일 저장이나 Markdown 복사 시 화면 요약 외에 업무 ID, 담당자, 기간, 완료일, 로그 근거까지 함께 포함합니다.">
                <input
                  aria-label="파일 저장과 Markdown 복사에 전체 데이터 포함"
                  checked={includeSources}
                  onChange={(event) => setIncludeSources(event.target.checked)}
                  type="checkbox"
                />
                저장/복사 시 전체 데이터 포함
              </label>
            </div>
            <div className="performance-export-actions">
              <button className="secondary-button small" onClick={copyReportMarkdown} type="button">
                <ClipboardList size={14} />
                Markdown 복사
              </button>
              <button className="secondary-button small" onClick={downloadReportMarkdown} type="button">
                <Download size={14} />
                파일 저장
              </button>
              {copyState && <span>{copyState}</span>}
            </div>
          </div>
            </>
          )}
        </div>
      </div>
      {activePerformanceTab === "posts" ? (
        <HighlightsPostsView
          expandedGroups={expandedPostGroups}
          groups={highlightPostGroups}
          onToggleGroup={(label) => setExpandedPostGroups((current) => ({ ...current, [label]: !current[label] }))}
          postCategories={postCategories}
        />
      ) : activePerformanceTab === "wiki" ? (
        <HighlightsWikiView
          error={wikiError}
          isReady={isWikiReady}
          onReadPage={selectWikiPage}
          onSearch={searchWikiPages}
          pages={wikiPages}
          query={wikiQuery}
          selectedPage={selectedWikiPage}
          setQuery={setWikiQuery}
          setWorkstream={setWikiWorkstream}
          status={wikiStatus}
          workstream={wikiWorkstream}
          workstreams={wikiWorkstreamOptions}
        />
      ) : (
        <>
      {showCopyFallback && (
        <div className="markdown-copy-panel">
          <div>
            <strong>복사용 Markdown</strong>
            <button className="secondary-button small" onClick={() => setShowCopyFallback(false)} type="button">
              닫기
            </button>
          </div>
          <textarea
            aria-label="업무실적 Markdown 원문"
            onFocus={(event) => event.target.select()}
            readOnly
            value={reportMarkdown}
          />
        </div>
      )}
      {activePeople.length ? (
        <>
        <small className="performance-rule-note">
          <CircleAlert size={12} strokeWidth={2} />
          <span>스팟 업무는 주간·월간 실적에 포함하고, 분기·년간 요약에서는 기본 제외합니다. 상세실적 보기에서는 함께 표시됩니다.</span>
        </small>
        <div className="performance-report-list">
          {activePeople.map(({ owned, person }) => (
            <section className="performance-person-section" key={person.id}>
              <div className="performance-person-header">
                <div>
                  <h3>
                    {person.name}
                    <span className="role-text">{person.role}</span>
                  </h3>
                </div>
              </div>
              <div className="performance-period-list">
                {groupPerformanceItems(owned, mode).map((periodGroup) => (
                  <div
                    className={`performance-period-group ${periodGroup.label ? "has-period-label" : ""}`}
                    key={`${person.id}-${periodGroup.label || "all"}`}
                  >
                    {periodGroup.label && <h4 className="performance-period-label">{periodGroup.label}</h4>}
                    <div className="performance-work-list">
                {periodGroup.items.map((item) => {
                  const task = item.task;
                  const rangeUpdates = item.tasks.flatMap((entry) => updatesInRange(entry, range));
                  const issue = mode === "week" || showLongDetails ? issueFromTask(task, rangeUpdates) : "";
                  const detailRows = item.detailRows ?? reportDetailRows(task, rangeUpdates, mode, { showLongDetails });
                  const hideLongRangeDetails = ["quarter", "year"].includes(mode) && !showLongDetails;
                  const contentRows = hideLongRangeDetails ? [] : detailRows.filter((row) => row.label === "내용");
                  const visibleDetailRows = hideLongRangeDetails ? [] : detailRows.filter((row) => row.label !== "내용");
                  const statusMeta = reportStatusMeta({ ...task, status: item.status });
                  const reportDate = performanceItemDateLabel(item, mode);
                  const sourceTaskSummary = workstreamTaskSummary(item);
                  const spotItem = performanceItemHasSpot(item);
                  return (
                    <article className={`performance-work-card report-${statusMeta.tone}`} key={item.id}>
                      <div className="performance-work-top">
                        <span className={`performance-status report-${statusMeta.tone}`}>
                          {statusMeta.icon && <b>{statusMeta.icon}</b>}
                          {statusMeta.label}
                        </span>
                        <h4>
                          {reportDate && <span className="performance-date-sticker">{reportDate}</span>}
                          {item.title}
                          {spotItem && <span className="performance-spot-sticker" title="스팟 업무" aria-label="스팟 업무">⚡</span>}
                          {item.workstreamTaskCount > 1 && <span className="performance-recurring-sticker">묶인 업무 {item.workstreamTaskCount}건</span>}
                          {item.recurringLabel && <span className="performance-recurring-sticker">🔁 {item.recurringLabel}</span>}
                        </h4>
                      </div>
                      {sourceTaskSummary && (
                        <p className="performance-source-summary">
                          <span>포함 업무</span>
                          {sourceTaskSummary}
                        </p>
                      )}
                      {contentRows.map((row) => (
                        <p className="performance-work-description" key={`${task.id}-${row.label}`}>
                          <span>✎ 내용</span>
                          {row.text}
                        </p>
                      ))}
                      {issue && (
                        <div className="performance-issue-sticker">
                          <span>{task.status === "보류" ? "보류" : "이슈"}</span>
                          <p>{issue}</p>
                        </div>
                      )}
                      {visibleDetailRows.length > 0 && (
                        <ul className="performance-sub-lines">
                          {visibleDetailRows.map((row) => {
                            const detailMeta = reportDetailMeta(row.label);
                            return (
                            <li className={`detail-${detailMeta.tone}`} key={`${task.id}-${row.label}`}>
                              <span>
                                <b>{detailMeta.icon}</b>
                                {row.label}
                              </span>
                              <p>{row.text}</p>
                            </li>
                            );
                          })}
                        </ul>
                      )}
                    </article>
                  );
                })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        </>
      ) : (
        <p className="empty-note">선택한 기간에 집계할 업무가 없습니다.</p>
      )}
        </>
      )}
    </section>
  );
}

function HighlightsWikiView({ error, isReady, onReadPage, onSearch, pages, query, selectedPage, setQuery, setWorkstream, status, workstream, workstreams }) {
  return (
    <div className="highlight-wiki-view">
      <form className="highlight-wiki-toolbar" onSubmit={onSearch}>
        <label>
          업무흐름
          <select disabled={!isReady || status === "loading"} onChange={(event) => setWorkstream(event.target.value)} value={workstream}>
            <option value="전체">전체</option>
            {workstreams.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          검색어
          <input
            disabled={!isReady || status === "loading"}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="업무흐름, 주제, 키워드"
            value={query}
          />
        </label>
        <button className="secondary-button small" disabled={!isReady || status === "loading"} type="submit">
          <Search size={14} />
          {status === "loading" ? "검색 중" : "Wiki 검색"}
        </button>
      </form>
      {error && <div className="inline-warning">{error}</div>}
      {!isReady && (
        <div className="empty-state compact">
          <strong>회사 DB 연결 후 사용할 수 있습니다.</strong>
          <p>발행된 Wiki page 조회는 FastAPI 로그인과 Wiki API가 필요합니다.</p>
        </div>
      )}
      {isReady && !pages.length && !selectedPage && (
        <div className="empty-state compact">
          <strong>검색 결과 없음</strong>
          <p>관리자가 승인 발행한 workstream Wiki page가 생기면 여기에서 검색해 읽을 수 있습니다.</p>
        </div>
      )}
      {isReady && (pages.length > 0 || selectedPage) && (
        <div className="highlight-wiki-grid">
          <section className="highlight-wiki-results">
            {pages.map((page) => (
              <button
                className={`highlight-wiki-page-row ${selectedPage?.id === page.id ? "selected" : ""}`}
                key={page.id}
                onClick={() => onReadPage(page.id)}
                type="button"
              >
                <span>{page.page_type || "wiki"}</span>
                <strong>{page.title}</strong>
                <small>{page.summary || "요약 없음"}</small>
                <em>출처 {page.source_count ?? 0}건 · 링크 {page.link_count ?? 0}건</em>
              </button>
            ))}
          </section>
          <section className="highlight-wiki-detail">
            {selectedPage ? (
              <>
                <div className="highlight-wiki-detail-head">
                  <span>{selectedPage.page_type}</span>
                  <h3>{selectedPage.title}</h3>
                  <p>{selectedPage.summary || "요약 없음"}</p>
                </div>
                <pre>{selectedPage.body_markdown || "본문 없음"}</pre>
                <div className="highlight-wiki-sources">
                  <strong>출처</strong>
                  {(selectedPage.sources || []).length ? (
                    selectedPage.sources.map((source) => (
                      <article key={source.id}>
                        <span>{source.source_type}</span>
                        <p>{source.excerpt || source.source_title || "출처 요약 없음"}</p>
                        <small>{source.source_date || String(source.created_at || "").slice(0, 10)}</small>
                      </article>
                    ))
                  ) : (
                    <small>연결된 출처가 없습니다.</small>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state compact">
                <strong>Wiki page를 선택하세요.</strong>
                <p>검색 결과에서 page를 선택하면 본문과 출처 링크가 여기에 표시됩니다.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function HighlightsPostsView({ expandedGroups, groups, onToggleGroup, postCategories }) {
  const [expandedPostId, setExpandedPostId] = useState("");
  const [expandedImageId, setExpandedImageId] = useState(null);
  const [sortByGroup, setSortByGroup] = useState({});
  const allPosts = groups.flatMap((group) => group.items);
  const expandedImagePost = allPosts.find((post) => post.id === expandedImageId);
  const sortOptions = [
    { key: "date", label: "날짜" },
    { key: "person", label: "사람" },
    { key: "scope", label: "구분" },
    { key: "task", label: "업무" }
  ];
  const sortedPosts = (items, sortBy) =>
    [...items].sort((a, b) => {
      if (sortBy === "person") {
        return personName(a.ownerId).localeCompare(personName(b.ownerId), "ko-KR") || b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ko-KR");
      }
      if (sortBy === "scope") {
        return a.scope.localeCompare(b.scope, "ko-KR") || b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ko-KR");
      }
      if (sortBy === "task") {
        return a.taskTitle.localeCompare(b.taskTitle, "ko-KR") || b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ko-KR");
      }
      return b.date.localeCompare(a.date) || a.taskTitle.localeCompare(b.taskTitle, "ko-KR") || a.title.localeCompare(b.title, "ko-KR");
    });
  const togglePost = (postId) => {
    setExpandedPostId((current) => (current === postId ? "" : postId));
    setExpandedImageId(null);
  };
  const renderExpandedPost = (post) => (
    <article className="highlight-post-inline-detail">
      <p>{post.body}</p>
      {post.url && (
        <a className="task-post-url-card" href={post.url} rel="noreferrer" target="_blank">
          <Link2 size={14} />
          <span>{post.url}</span>
        </a>
      )}
      {post.attachment && (
        <button className="task-post-image-thumb" onClick={() => setExpandedImageId(post.id)} type="button">
          <span>
            <FileText size={13} />
            {post.attachment.label}
          </span>
          <small>{post.attachment.caption} · 클릭해서 크게 보기</small>
        </button>
      )}
    </article>
  );
  const updateGroupSort = (groupLabel, sortKey) => {
    setSortByGroup((current) => ({ ...current, [groupLabel]: sortKey }));
    setExpandedPostId("");
  };

  if (!groups.length) {
    return <p className="empty-note">표시할 게시글이 없습니다.</p>;
  }
  return (
    <div className="highlight-posts-view">
      {groups.map((group) => {
        const isOpen = Boolean(expandedGroups[group.label]);
        const latestDate = group.latestDate || group.items[0]?.date;
        const owners = Array.from(new Set(group.items.map((post) => personName(post.ownerId)))).slice(0, 3);
        const activeSort = sortByGroup[group.label] || "date";
        const groupItems = sortedPosts(group.items, activeSort);
        return (
          <section className={`highlight-post-group ${isOpen ? "open" : ""}`} key={group.label}>
            <button className="highlight-post-group-head" onClick={() => onToggleGroup(group.label)} type="button" aria-expanded={isOpen}>
              <span className="highlight-post-group-main">
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <strong>{group.label}</strong>
                <em>{group.items.length}건</em>
              </span>
              <span className="highlight-post-group-meta">
                <small>{latestDate}</small>
                <small>{owners.join(", ")}</small>
              </span>
            </button>
            {isOpen && (
              <div className="highlight-post-list">
                <div className="highlight-post-sort-row" aria-label={`${group.label} 게시글 정렬`}>
                  {sortOptions.map((option) => (
                    <button
                      className={activeSort === option.key ? "active" : ""}
                      key={option.key}
                      onClick={() => updateGroupSort(group.label, option.key)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {groupItems.map((post) => (
                  <div className="highlight-post-row-wrap" key={post.id}>
                    <button
                      aria-expanded={expandedPostId === post.id}
                      className={`highlight-post-row ${expandedPostId === post.id ? "selected" : ""}`}
                      onClick={() => togglePost(post.id)}
                      type="button"
                    >
                      <span className={`post-scope-chip tone-${taskPostCategoryMeta(post.scope, postCategories).tone}`}>{post.scope}</span>
                      <div>
                        <strong>{post.title}</strong>
                        <small>{post.date} · 해당 업무: {post.taskTitle} · 담당: {personName(post.ownerId)} · 게시: {personName(post.authorId)}</small>
                      </div>
                      {post.url && <Link2 size={14} />}
                    </button>
                    {expandedPostId === post.id && renderExpandedPost(post)}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {expandedImagePost?.attachment && (
        <div className="task-post-image-lightbox" role="dialog" aria-label={`${expandedImagePost.attachment.label} 확대 보기`}>
          <button className="task-post-image-backdrop" onClick={() => setExpandedImageId(null)} type="button" aria-label="첨부 이미지 확대 닫기" />
          <div className="task-post-image-modal">
            <div className="task-post-image-modal-head">
              <strong>{expandedImagePost.attachment.label}</strong>
              <button className="icon-button" onClick={() => setExpandedImageId(null)} type="button" title="첨부 이미지 닫기">
                <X size={16} />
              </button>
            </div>
            <div className="task-post-image-preview-large">
              <span>{expandedImagePost.workstream}</span>
              <strong>{expandedImagePost.attachment.caption}</strong>
              <em>{expandedImagePost.taskTitle}</em>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskDetail({ canManage, onAddLink, onAddUpdate, onArchive, onClose, onCreateWikiDraft, onDelete, onDeleteHistory, onDeletePost, onDeleteUpdate, onEdit, onRestore, onSavePost, onToggleSubtask, onUpdateHistory, onUpdateLog, postCategories = defaultTaskPostCategories, selectedPersonId, task, wikiDraftStatus = "" }) {
  const [quickUpdate, setQuickUpdate] = useState("");
  const [quickLink, setQuickLink] = useState({ title: "", url: "", type: "자료" });
  const [isHistoryManaging, setIsHistoryManaging] = useState(false);
  const [isUpdateManaging, setIsUpdateManaging] = useState(false);
  const [isUpdateLogExpanded, setIsUpdateLogExpanded] = useState(false);
  const quickUpdateRef = useRef(null);
  const canManageHistory = canManage && typeof onDeleteHistory === "function" && typeof onUpdateHistory === "function";
  useEffect(() => {
    setIsHistoryManaging(false);
    setIsUpdateManaging(false);
    setIsUpdateLogExpanded(false);
  }, [task?.id]);
  if (!task) return null;
  const canManageAnyUpdate = (task.updates ?? []).some((update) =>
    canManage || update.authorId === selectedPersonId
  );
  const showHistoryActions = canManageHistory && isHistoryManaging;
  const showUpdateActions =
    isUpdateManaging &&
    typeof onDeleteUpdate === "function" &&
    typeof onUpdateLog === "function" &&
    canManageAnyUpdate;
  const due = diffDays(task.dueDate, TODAY);
  const daysToStart = diffDays(task.startDate, TODAY);
  const progress = taskProgress(task);
  const nextAction = nextActionForTask(task);
  const scheduleSticker = scheduleStatusSticker(task);
  const titleStickers = [
    { label: statusStickerLabels[task.status] ?? task.status, tone: `status-${task.status.replace("/", "")}` },
    scheduleSticker,
    { label: task.priority, tone: `priority-${task.priority}` },
    task.archived ? { label: "보관됨", tone: "archived" } : null,
    due < 0 && task.status !== "완료" ? { label: `D+${Math.abs(due)} 지연`, tone: "late" } : null,
    due === 0 && task.status !== "완료" && !scheduleSticker ? { label: "오늘 마감", tone: "due" } : null,
    task.status === "계획" && daysToStart > 0 ? { label: `D-${daysToStart} 시작`, tone: "start" } : null,
    isRecentAssignment(task) ? { label: "New", tone: "new" } : null,
    task.recurring ? { label: "🔁", tone: "repeat", title: "반복 업무" } : null
  ].filter(Boolean);
  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div className="detail-heading-main">
          <div className="detail-topline">
            <span className="panel-label">업무 상세</span>
            <div className="detail-actions">
              {canManage && task.archived ? (
                <button className="icon-button" onClick={onRestore} type="button" title="업무 복원">
                  <ArchiveRestore size={15} />
                </button>
              ) : canManage ? (
                ["완료", "보류"].includes(task.status) && (
                  <button className="icon-button" onClick={onArchive} type="button" title={`${task.status} 업무 보관`}>
                    <Archive size={15} />
                  </button>
                )
              ) : (
                <span className="permission-readonly">읽기 전용</span>
              )}
              {canManage && (
                <button className="icon-button" onClick={onEdit} type="button" title="상세 수정">
                  <Edit3 size={17} />
                </button>
              )}
              {canManage && (
                <button className="icon-button danger-icon" onClick={onDelete} type="button" title="업무 삭제">
                  <Trash2 size={17} />
                </button>
              )}
              {onClose && (
                <button className="icon-button" onClick={onClose} type="button" title="업무 상세 닫기">
                  <X size={17} />
                </button>
              )}
            </div>
          </div>
          <div className="detail-title-stickers" aria-label="업무 상태 요약">
            {titleStickers.map((sticker) => (
              <span className={`detail-title-sticker ${sticker.tone}`} key={`${task.id}-${sticker.label}`} title={sticker.title || sticker.label}>
                {sticker.label}
              </span>
            ))}
          </div>
          <div className="detail-title-line">
            <h2>{displayTaskTitle(task)}</h2>
          </div>
        </div>
      </div>
      <div className="detail-body">
        <div className="detail-focus">
          <div className="tag-row">
            {taskTags(task).map((tag) => (
              <span className={`tag-tone-${tagTone(tag)}`} key={tag}>{tag}</span>
            ))}
          </div>
          <ProgressBar value={progress} />
          {task.subtasks?.length > 0 && (
            <div className="subtask-checklist">
              <h3>
                <span className="subtask-title-icon" aria-hidden="true">☑️</span>
                상세 업무 내용
              </h3>
              {task.subtasks.map((subtask) => (
                <label className={subtask.done ? "done" : ""} key={subtask.id}>
                  <input
                    aria-label={`상세 업무 내용 ${subtask.title} 완료 여부`}
                    checked={subtask.done}
                    onChange={() => onToggleSubtask(task.id, subtask.id)}
                    type="checkbox"
                  />
                  <span>{subtask.title}</span>
                </label>
              ))}
            </div>
          )}
          {task.description && (
            <div className="detail-description task-detail-description">
              <span>✎ 설명:</span>
              <p>{task.description}</p>
            </div>
          )}
          <div className="detail-callout">
            <span>다음 액션 추천</span>
            <strong>{nextAction}</strong>
          </div>
          {onCreateWikiDraft && (
            <div className="wiki-draft-action">
              <div>
                <strong>LLM-Wiki 정리</strong>
                <small>이 업무의 설명, 업데이트 로그, 업무 노트를 출처가 있는 Wiki 초안으로 만듭니다.</small>
              </div>
              <button className="secondary-button small" disabled={wikiDraftStatus === "saving"} onClick={onCreateWikiDraft} type="button">
                <NotebookPen size={13} />
                {wikiDraftStatus === "saving" ? "생성 중" : "Wiki로 정리"}
              </button>
            </div>
          )}
          <TaskPostsMockup
            canManageTask={canManage}
            currentPersonId={selectedPersonId}
            onDeletePost={onDeletePost}
            onSavePost={onSavePost}
            postCategories={postCategories}
            task={task}
          />
          <div className="detail-section">
            <div className="detail-section-title">
              <h3>
                <MessageSquareText size={16} />
                업데이트 로그
              </h3>
              <span className="detail-section-actions">
                {task.updates.length > 3 && (
                  <button
                    aria-expanded={isUpdateLogExpanded}
                    className="section-manage-button"
                    onClick={() => setIsUpdateLogExpanded((current) => !current)}
                    type="button"
                  >
                    {isUpdateLogExpanded ? "접기" : `더보기 ${task.updates.length - 3}`}
                  </button>
                )}
                {canManageAnyUpdate && (
                  <button
                    aria-pressed={isUpdateManaging}
                    className={`section-manage-button ${isUpdateManaging ? "active" : ""}`}
                    onClick={() => setIsUpdateManaging((current) => !current)}
                    type="button"
                  >
                    {isUpdateManaging ? "완료" : "관리"}
                  </button>
                )}
              </span>
            </div>
            <form
              className="quick-update-form"
              onSubmit={(event) => {
                event.preventDefault();
                onAddUpdate(quickUpdate);
                setQuickUpdate("");
              }}
            >
              <span className="avatar tiny emoji-avatar" style={avatarStyle(selectedPersonId)}>
                {personEmoji(selectedPersonId)}
              </span>
              <div className="emoji-textarea-frame quick-update-textarea-frame">
                <textarea
                  aria-label="업데이트 바로 남기기"
                  onChange={(event) => setQuickUpdate(event.target.value)}
                  placeholder="진행상황, 막힌 점, 다음 요청을 짧게 남기기"
                  ref={quickUpdateRef}
                  rows={2}
                  value={quickUpdate}
                />
                <EmojiPopover
                  onSelect={(emoji) => insertEmojiAtCursor(quickUpdateRef, quickUpdate, emoji, setQuickUpdate)}
                  triggerLabel="업데이트 로그에 이모지 넣기"
                  triggerClassName="textarea-emoji-trigger"
                />
              </div>
              <button className="primary-button small" type="submit">
                남기기
              </button>
            </form>
            {task.updates.length ? (
              (isUpdateLogExpanded ? task.updates : task.updates.slice(0, 3)).map((update, index) => {
                const canManageThisUpdate = canManage || update.authorId === selectedPersonId;
                const editUpdate = () => {
                  const nextText = window.prompt("업데이트 로그 내용을 수정하세요.", update.text ?? "");
                  if (nextText === null) return;
                  onUpdateLog(update, index, nextText);
                };
                const deleteUpdate = () => {
                  const confirmed = window.confirm("이 업데이트 로그를 삭제할까요?");
                  if (!confirmed) return;
                  onDeleteUpdate(update, index);
                };
                return (
                  <div className={`log-item ${showUpdateActions && canManageThisUpdate ? "is-managing" : ""}`} key={`${update.id ?? update.date}-${update.text}-${index}`}>
                    <strong>{personName(update.authorId)}</strong>
                    <small>{update.date}</small>
                    <p>{update.text}</p>
                    {showUpdateActions && canManageThisUpdate && (
                      <span className="log-item-actions">
                        <button className="ghost-icon" onClick={editUpdate} type="button" title="업데이트 로그 수정">
                          <Edit3 size={13} />
                        </button>
                        <button className="ghost-icon danger" onClick={deleteUpdate} type="button" title="업데이트 로그 삭제">
                          <Trash2 size={13} />
                        </button>
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="empty-note">아직 업데이트 로그가 없습니다.</p>
            )}
          </div>
          <div className="detail-section">
            <h3>
              <Link2 size={16} />
              관련 링크
            </h3>
            {onAddLink && (
              <form
                className="quick-link-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!quickLink.url.trim()) return;
                  onAddLink(quickLink);
                  setQuickLink({ title: "", url: "", type: "자료" });
                }}
              >
                <input
                  aria-label="관련 링크 제목"
                  onChange={(event) => setQuickLink((current) => ({ ...current, title: event.target.value }))}
                  placeholder="링크 제목"
                  value={quickLink.title}
                />
                <input
                  aria-label="관련 링크 주소"
                  onChange={(event) => setQuickLink((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https:// 또는 공유 문서 주소"
                  value={quickLink.url}
                />
                <select
                  aria-label="관련 링크 유형"
                  onChange={(event) => setQuickLink((current) => ({ ...current, type: event.target.value }))}
                  value={quickLink.type}
                >
                  <option value="자료">자료</option>
                  <option value="문서">문서</option>
                  <option value="회의록">회의록</option>
                  <option value="보고서">보고서</option>
                  <option value="링크">링크</option>
                </select>
                <button className="secondary-button small" disabled={!quickLink.url.trim()} type="submit">
                  추가
                </button>
              </form>
            )}
            {task.links.length ? (
              task.links.map((link) => (
                <a href={link.url} key={`${link.title}-${link.url}`} rel="noreferrer" target="_blank">
                  <span>{link.title}</span>
                  <small>{link.type}</small>
                </a>
              ))
            ) : (
              <p className="empty-note">아직 등록된 링크가 없습니다.</p>
            )}
          </div>
        </div>
        <div className="detail-context">
          <div className="detail-grid compact">
            <InfoItem label="담당자" value={personName(task.ownerId)} />
            <InfoItem label="업무배정자" value={task.assignerType || "개인"} />
            <InfoItem label="등록자" value={personName(task.creatorId || task.ownerId)} />
            <InfoItem label="상태" value={task.status} />
            {task.status === "완료" && <InfoItem label="완료일" value={completionDate(task) || "완료일 미기록"} />}
            {task.status === "완료" && <InfoItem label="완료자" value={personName(task.completedBy || task.ownerId)} />}
            <InfoItem label="우선순위" value={task.priority} />
          <InfoItem label="기간" value={`${task.startDate} - ${task.dueDate}`} />
            <InfoItem label="상위 업무흐름" value={taskWorkstreamLabel(task)} />
            <InfoItem label="태그" value={taskTags(task).join(", ")} />
            <InfoItem label="반복" value={recurringLabel(task)} />
            <InfoItem label="보관" value={task.archived ? "보관됨" : "메인 표시"} />
          </div>
          {task.statusHistory?.length > 0 && (
            <div className="detail-section status-history-section">
              <div className="detail-section-title">
                <h3>
                  <Activity size={16} />
                  변경 이력
                </h3>
                {canManageHistory && (
                  <button
                    aria-pressed={isHistoryManaging}
                    className={`section-manage-button ${isHistoryManaging ? "active" : ""}`}
                    onClick={() => setIsHistoryManaging((current) => !current)}
                    type="button"
                  >
                    {isHistoryManaging ? "완료" : "관리"}
                  </button>
                )}
              </div>
              <div className="status-history-table" role="table" aria-label="업무 변경 이력">
                <div className={`status-history-head ${showHistoryActions ? "can-manage" : ""}`} role="row">
                  <span role="columnheader">처리일자</span>
                  <span role="columnheader">처리자</span>
                  <span role="columnheader">처리내용</span>
                  {showHistoryActions && <span role="columnheader">관리</span>}
                </div>
                {task.statusHistory.slice(0, 6).map((entry, index) => {
                  const changeText = taskChangeText(entry);
                  const editHistory = () => {
                    const nextNote = window.prompt("변경 이력 메모를 수정하세요. 비우면 기본 문구로 표시됩니다.", entry.note ?? "");
                    if (nextNote === null) return;
                    onUpdateHistory(entry, index, nextNote);
                  };
                  const deleteHistory = () => {
                    const confirmed = window.confirm("이 변경 이력을 삭제할까요? 현재 업무 상태는 바뀌지 않습니다.");
                    if (!confirmed) return;
                    onDeleteHistory(entry, index);
                  };
                  return (
                    <div className={`status-history-row ${showHistoryActions ? "can-manage" : ""}`} key={`${entry.id ?? entry.date}-${entry.to}-${index}`} role="row">
                      <span role="cell">{entry.date}</span>
                      <strong role="cell">{personName(entry.actorId)}</strong>
                      <p aria-label={changeText} className="status-history-note" role="cell" tabIndex={0}>
                        <span className="status-history-clip">{changeText}</span>
                        <span className="status-history-tooltip" role="tooltip">{changeText}</span>
                      </p>
                      {showHistoryActions && (
                        <span className="status-history-actions" role="cell">
                          <button className="ghost-icon" onClick={editHistory} type="button" title="변경 이력 메모 수정">
                            <Edit3 size={13} />
                          </button>
                          <button className="ghost-icon danger" onClick={deleteHistory} type="button" title="변경 이력 삭제">
                            <Trash2 size={13} />
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TaskPostsMockup({ canManageTask, currentPersonId, onDeletePost, onSavePost, postCategories = defaultTaskPostCategories, task }) {
  const workstream = taskWorkstreamLabel(task);
  const taskTitle = displayTaskTitle(task);
  const tags = taskTags(task).slice(0, 2);
  const normalizedPostCategories = normalizeTaskPostCategories(postCategories);
  const activePostCategories = normalizedPostCategories.filter((category) => category.active);
  const defaultScope = activePostCategories[0]?.label || normalizedPostCategories[0]?.label || "기억할 점";
  const blankDraft = {
    id: "",
    scope: defaultScope,
    title: "",
    url: "",
    body: "",
    attachmentLabel: "",
    attachmentCaption: "",
    attachmentText: "",
    attachmentSummary: "",
    attachmentSource: "manual",
    attachmentImageDataUrl: "",
    attachmentMimeType: "",
    attachmentFileName: ""
  };
  const [expandedImageId, setExpandedImageId] = useState(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [activePostDialog, setActivePostDialog] = useState(null);
  const [postDraft, setPostDraft] = useState(blankDraft);
  const postBodyRef = useRef(null);
  const postItems = taskKnowledgePosts(task, postCategories);
  const recentPosts = postItems.slice(0, 3);
  const olderPosts = postItems.slice(3);
  const activePost =
    activePostDialog?.mode === "read"
      ? postItems.find((post) => post.id === activePostDialog.postId)
      : null;
  const expandedImagePost = postItems.find((post) => post.id === expandedImageId);
  const canEditActivePost = activePost && (canManageTask || activePost.authorId === currentPersonId);
  const openPost = (postId) => {
    setActivePostDialog({ mode: "read", postId });
    setExpandedImageId(null);
  };
  const openWriteDialog = () => {
    setPostDraft(blankDraft);
    setActivePostDialog({ mode: "write" });
    setExpandedImageId(null);
  };
  const openEditDialog = (post) => {
    const attachment = normalizePostAttachment(post.attachment);
    setPostDraft({
      id: post.id,
      scope: post.scope || defaultScope,
      title: post.title || "",
      url: post.url || "",
      body: post.body || "",
      attachmentLabel: attachment?.label || "",
      attachmentCaption: attachment?.caption || "",
      attachmentText: attachment?.ocrText || "",
      attachmentSummary: attachment?.visionSummary || "",
      attachmentSource: attachment?.source || "manual",
      attachmentImageDataUrl: attachment?.imageDataUrl || "",
      attachmentMimeType: attachment?.mimeType || "",
      attachmentFileName: attachment?.fileName || ""
    });
    setActivePostDialog({ mode: "edit", postId: post.id });
    setExpandedImageId(null);
  };
  const handlePostPaste = (event) => {
    const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!imageDataUrl) return;
      setPostDraft((current) => ({
        ...current,
        attachmentLabel: current.attachmentLabel || file.name || "붙여넣은 이미지",
        attachmentCaption: current.attachmentCaption || "게시글에 붙여넣은 이미지",
        attachmentImageDataUrl: imageDataUrl,
        attachmentMimeType: file.type,
        attachmentFileName: file.name || ""
      }));
    };
    reader.readAsDataURL(file);
  };
  const closePostDialog = () => {
    setActivePostDialog(null);
    setExpandedImageId(null);
  };
  const submitPost = (event) => {
    event.preventDefault();
    if (!onSavePost?.(postDraft)) return;
    closePostDialog();
  };
  const deleteActivePost = () => {
    if (!activePost || !onDeletePost) return;
    onDeletePost(activePost.id);
    closePostDialog();
  };

  return (
    <div className="task-posts-mockup-panel" aria-label="업무 노트">
      <div className="task-posts-mockup-head">
        <div>
          <strong>업무 노트</strong>
        </div>
        <button className="secondary-button small" onClick={openWriteDialog} type="button">
          <Plus size={13} />
          노트 작성
        </button>
      </div>
      <div className="task-post-feed-grid">
        <section>
          <h3>
            <MessageSquareText size={15} />
            최근 노트
          </h3>
          {recentPosts.map((post) => (
            <button className="task-post-list-row" key={post.id} onClick={() => openPost(post.id)} type="button">
              <span className={`post-scope-chip tone-${taskPostCategoryMeta(post.scope, postCategories).tone}`}>{post.scope}</span>
              <div>
                <strong>{post.title}</strong>
                <small>{post.date} · {personName(post.authorId)}{post.url ? " · URL" : ""}{post.attachment ? " · 이미지" : ""}</small>
              </div>
            </button>
          ))}
        </section>
        {olderPosts.length > 0 && (
          <section>
            <div className="task-post-more-title">
              <h3>
                <MessageSquareText size={15} />
                이 업무 노트 더보기
              </h3>
              <button aria-expanded={isMoreOpen} className="section-manage-button" onClick={() => setIsMoreOpen((current) => !current)} type="button">
                {isMoreOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {isMoreOpen ? "접기" : `펼치기 ${olderPosts.length}`}
              </button>
            </div>
            {isMoreOpen && (
              <div className="task-post-more-list">
                {olderPosts.map((post) => (
                  <button
                    className="task-post-more-row"
                    key={`task-more-${post.id}`}
                    onClick={() => openPost(post.id)}
                    type="button"
                  >
                    <span className={`post-scope-chip tone-${taskPostCategoryMeta(post.scope, postCategories).tone}`}>{post.scope}</span>
                    <div>
                      <strong>{post.title}</strong>
                      <small>{post.date} · {personName(post.authorId)}{post.url ? " · URL" : ""}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      {activePostDialog && (
        <div className="task-post-dialog-layer" role="dialog" aria-label={activePostDialog.mode === "read" ? "업무 노트 상세" : "업무 노트 작성"}>
          <button className="task-post-dialog-backdrop" onClick={closePostDialog} type="button" aria-label="업무 노트 창 닫기" />
          <div className="task-post-dialog">
            <div className="task-post-dialog-head">
              <div>
                <strong>{activePostDialog.mode === "read" ? activePost?.title : activePostDialog.mode === "edit" ? "업무 노트 수정" : "업무 노트 작성"}</strong>
                <small>{activePostDialog.mode === "read" ? `${activePost?.date} · ${personName(activePost?.authorId)} · ${activePost?.taskTitle}` : `${taskTitle} · ${workstream}`}</small>
              </div>
              <button className="icon-button" onClick={closePostDialog} type="button" title="업무 노트 창 닫기">
                <X size={16} />
              </button>
            </div>
            {activePostDialog.mode !== "read" && (
            <form className="task-post-write-mockup" onPaste={handlePostPaste} onSubmit={submitPost}>
              <div className="task-post-type-field">
                <span>노트 구분</span>
                <div className="task-post-type-options" role="group" aria-label="업무 노트 구분 선택">
                  {[...activePostCategories, ...normalizedPostCategories.filter((category) => category.label === postDraft.scope && !category.active)].map((category) => (
                    <button
                      className={`post-scope-chip tone-${category.tone} ${postDraft.scope === category.label ? "active" : ""}`}
                      key={category.id}
                      onClick={() => setPostDraft((current) => ({ ...current, scope: category.label }))}
                      type="button"
                    >
                      {postDraft.scope === category.label && <Check size={13} aria-hidden="true" />}
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                <span>제목</span>
                <input
                  onChange={(event) => setPostDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="나중에 찾을 수 있는 제목"
                  value={postDraft.title}
                />
              </label>
              <label>
                <span>URL</span>
                <input
                  onChange={(event) => setPostDraft((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https:// 또는 공유 문서 주소"
                  value={postDraft.url}
                />
              </label>
              <div className="task-post-attachment-fields">
                {postDraft.attachmentImageDataUrl && (
                  <div className="task-post-pasted-image">
                    <img alt={postDraft.attachmentLabel || "붙여넣은 이미지"} src={postDraft.attachmentImageDataUrl} />
                    <button
                      className="secondary-button small"
                      onClick={() =>
                        setPostDraft((current) => ({
                          ...current,
                          attachmentImageDataUrl: "",
                          attachmentMimeType: "",
                          attachmentFileName: ""
                        }))
                      }
                      type="button"
                    >
                      이미지 제거
                    </button>
                  </div>
                )}
                <label>
                  <span>이미지 이름</span>
                  <input
                    onChange={(event) => setPostDraft((current) => ({ ...current, attachmentLabel: event.target.value }))}
                    placeholder="예: 회의 캡처, 보고서 표 이미지"
                    value={postDraft.attachmentLabel}
                  />
                </label>
                <label>
                  <span>이미지 설명</span>
                  <input
                    onChange={(event) => setPostDraft((current) => ({ ...current, attachmentCaption: event.target.value }))}
                    placeholder="이미지에 담긴 자료의 맥락"
                    value={postDraft.attachmentCaption}
                  />
                </label>
                <label>
                  <span>이미지 요약</span>
                  <textarea
                    onChange={(event) => setPostDraft((current) => ({ ...current, attachmentSummary: event.target.value }))}
                    placeholder="이미지 전체에서 확인되는 핵심 내용을 짧게 정리"
                    rows={3}
                    value={postDraft.attachmentSummary}
                  />
                </label>
                <label>
                  <span>이미지 판독 텍스트</span>
                  <textarea
                    onChange={(event) => setPostDraft((current) => ({ ...current, attachmentText: event.target.value }))}
                    placeholder="캡처/표/문서 이미지 안의 글자를 붙여넣거나 OCR 결과를 남기세요."
                    rows={5}
                    value={postDraft.attachmentText}
                  />
                </label>
              </div>
              <label>
                <span>본문</span>
                <div className="emoji-textarea-frame task-post-body-frame">
                  <textarea
                    ref={postBodyRef}
                    onChange={(event) => setPostDraft((current) => ({ ...current, body: event.target.value }))}
                    placeholder={"기억해야 할 내용, 결정사항, 회의록, 중요문서, 리스크, 확인 질문 등을 남겨두세요.\n\n- 핵심 내용:\n- 확인 필요:\n- 다음 액션:"}
                    rows={10}
                    value={postDraft.body}
                  />
                  <EmojiPopover
                    onSelect={(emoji) =>
                      insertEmojiAtCursor(postBodyRef, postDraft.body, emoji, (value) => setPostDraft((current) => ({ ...current, body: value })))
                    }
                    triggerClassName="textarea-emoji-trigger"
                  />
                </div>
              </label>
              <div className="task-post-write-foot">
                <span className={`post-scope-chip tone-${taskPostCategoryMeta(postDraft.scope, postCategories).tone}`}>{postDraft.scope}</span>
                {tags.length > 0 && <small>업무 태그</small>}
                {tags.map((tag) => (
                  <em className={`tag-tone-${tagTone(tag)}`} key={tag}>{tag}</em>
                ))}
                <button className="primary-button small" disabled={!postDraft.title.trim() || !postDraft.body.trim() || !onSavePost} type="submit">
                  {activePostDialog.mode === "edit" ? "수정 저장" : "노트 남기기"}
                </button>
              </div>
            </form>
            )}
            {activePostDialog.mode === "read" && activePost && (
              <article className="task-post-read-mockup">
                <div className="task-post-read-meta">
                  <span className={`post-scope-chip tone-${taskPostCategoryMeta(activePost.scope, postCategories).tone}`}>{activePost.scope}</span>
                  <small>{workstream}</small>
                </div>
                <p>{activePost.body}</p>
                {activePost.url && (
                  <a className="task-post-url-card" href={activePost.url} rel="noreferrer" target="_blank">
                    <Link2 size={14} />
                    <span>{activePost.url}</span>
                  </a>
                )}
                {activePost.attachment && (
                  <button className="task-post-image-thumb" onClick={() => setExpandedImageId(activePost.id)} type="button">
                    {activePost.attachment.imageDataUrl && (
                      <img alt={activePost.attachment.label || "첨부 이미지"} src={activePost.attachment.imageDataUrl} />
                    )}
                    <span>
                      <FileText size={13} />
                      {activePost.attachment.label || "이미지 근거"}
                    </span>
                    <small>{activePost.attachment.caption || "판독 텍스트 포함"} · 클릭해서 크게 보기</small>
                  </button>
                )}
                {attachmentEvidenceText(activePost.attachment) && (
                  <div className="task-post-attachment-evidence">
                    <strong>이미지 판독 근거</strong>
                    {activePost.attachment?.visionSummary && <p>{activePost.attachment.visionSummary}</p>}
                    {activePost.attachment?.ocrText && <pre>{activePost.attachment.ocrText}</pre>}
                  </div>
                )}
                {canEditActivePost && (
                  <div className="task-post-read-actions">
                    <button className="secondary-button small" onClick={() => openEditDialog(activePost)} type="button">
                      <Edit3 size={13} />
                      수정
                    </button>
                    <button className="secondary-button small danger-text" onClick={deleteActivePost} type="button">
                      <Trash2 size={13} />
                      삭제
                    </button>
                  </div>
                )}
              </article>
            )}
          </div>
        </div>
      )}
      {expandedImagePost?.attachment && (
        <div className="task-post-image-lightbox" role="dialog" aria-label={`${expandedImagePost.attachment.label} 확대 보기`}>
          <button className="task-post-image-backdrop" onClick={() => setExpandedImageId(null)} type="button" aria-label="첨부 이미지 확대 닫기" />
          <div className="task-post-image-modal">
            <div className="task-post-image-modal-head">
              <strong>{expandedImagePost.attachment.label}</strong>
              <button className="icon-button" onClick={() => setExpandedImageId(null)} type="button" title="첨부 이미지 닫기">
                <X size={16} />
              </button>
            </div>
            <div className="task-post-image-preview-large">
              {expandedImagePost.attachment.imageDataUrl ? (
                <img alt={expandedImagePost.attachment.label || "첨부 이미지"} src={expandedImagePost.attachment.imageDataUrl} />
              ) : (
                <>
                  <span>{workstream}</span>
                  <strong>{expandedImagePost.attachment.caption || expandedImagePost.attachment.visionSummary || "이미지 근거"}</strong>
                  <em>{taskTitle}</em>
                  {attachmentEvidenceText(expandedImagePost.attachment) && (
                    <p>{attachmentEvidenceText(expandedImagePost.attachment)}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function TaskModal({ availableTags, mode = "task", onClose, onSave, task, workstreamOptions = [] }) {
  const isRecurringRuleMode = mode === "recurringRule";
  const canEditRecurringFields = isRecurringRuleMode || !task.id || (!task.recurring && !task.recurringTemplateId);
  const [draft, setDraft] = useState({
    ...task,
    workstream: taskWorkstreamLabel(task, workstreamOptions),
    recurringInterval: Math.max(1, Number(task.recurringInterval) || 1),
    recurringWeekdays: normalizeRecurringWeekdays(task.recurringWeekdays, task.dueDate),
    recurringStartDate: task.recurringStartDate || task.startDate || TODAY,
    recurringEndDate: task.recurringEndDate || "",
    recurringNoEnd: Boolean(task.recurringNoEnd || (task.recurring && !task.recurringEndDate)),
    recurringDurationDays: Math.max(1, Number(task.recurringDurationDays) || 1),
    tagsText: taskTags(task).join(", "),
    links: [...task.links, ...Array.from({ length: Math.max(1, 3 - task.links.length) }, () => ({ title: "", url: "", type: "" }))],
    subtasks: task.subtasks?.length ? task.subtasks.map((subtask) => ({ ...subtask })) : [{ id: "", title: "", done: false }],
    updateText: ""
  });
  const [tagDraft, setTagDraft] = useState("");
  const [tagError, setTagError] = useState("");
  const [subtaskError, setSubtaskError] = useState("");
  const [isWorkstreamEdited, setIsWorkstreamEdited] = useState(Boolean(task.workstream));
  const titleInputRef = useRef(null);
  const modalUpdateRef = useRef(null);
  const lastAutoWorkstreamRef = useRef(task.workstream ? "" : taskWorkstreamLabel(task, workstreamOptions));

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTitle(value) {
    update("title", value);
  }

  function suggestWorkstreamFromTitle() {
    if (isWorkstreamEdited) return;
    setDraft((current) => {
      const shouldRefreshWorkstream = !current.workstream || current.workstream === lastAutoWorkstreamRef.current;
      if (!shouldRefreshWorkstream) return current;
      const nextWorkstream = taskWorkstreamLabel(current, workstreamOptions);
      lastAutoWorkstreamRef.current = nextWorkstream;
      return { ...current, workstream: nextWorkstream };
    });
  }

  function updateWorkstream(value) {
    setIsWorkstreamEdited(true);
    update("workstream", value);
  }

  function updateLink(index, field, value) {
    setDraft((current) => ({
      ...current,
      links: current.links.map((link, linkIndex) => (linkIndex === index ? { ...link, [field]: value } : link))
    }));
  }

  function updateSubtask(index, field, value) {
    setSubtaskError("");
    setDraft((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask, subtaskIndex) =>
        subtaskIndex === index ? { ...subtask, [field]: value } : subtask
      )
    }));
  }

  function selectedDraftTags() {
    return normalizeTags(
      draft.tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    );
  }

  function setDraftTags(tags) {
    update("tagsText", normalizeTags(tags).join(", "));
    setTagError("");
  }

  function toggleDraftTag(tag) {
    const currentTags = selectedDraftTags();
    setDraftTags(currentTags.includes(tag) ? currentTags.filter((item) => item !== tag) : [...currentTags, tag]);
  }

  function addDraftTag() {
    const cleanTag = tagDraft.trim();
    if (!cleanTag) return;
    setDraftTags([...selectedDraftTags(), cleanTag]);
    setTagDraft("");
  }

  function addSubtask() {
    setSubtaskError("");
    setDraft((current) => ({
      ...current,
      subtasks: [...current.subtasks, { id: "", title: "", done: false }]
    }));
  }

  function changeRecurring(value) {
    const nextRecurring = value || null;
    setDraft((current) => ({
      ...current,
      recurring: nextRecurring,
      recurringInterval: current.recurringInterval || 1,
      recurringWeekdays: normalizeRecurringWeekdays(current.recurringWeekdays, current.dueDate),
      recurringStartDate: current.recurringStartDate || current.startDate,
      recurringEndDate: current.recurringEndDate || current.dueDate,
      recurringNoEnd: Boolean(current.recurringNoEnd),
      recurringDurationDays: current.recurringDurationDays || 1
    }));
  }

  function toggleRecurringWeekday(day) {
    setDraft((current) => ({
      ...current,
      recurringWeekdays: normalizeRecurringWeekdays(
        current.recurringWeekdays?.includes(day)
          ? current.recurringWeekdays.filter((item) => item !== day)
          : [...(current.recurringWeekdays ?? []), day],
        current.dueDate
      )
    }));
  }

  function removeSubtask(index) {
    if (draft.subtasks.length <= 1) {
      setSubtaskError("진행률 계산 기준이 필요해 상세 업무 내용은 최소 1개가 필요합니다.");
      return;
    }
    setSubtaskError("");
    setDraft((current) => ({
      ...current,
      subtasks: current.subtasks.filter((_, subtaskIndex) => subtaskIndex !== index)
    }));
  }

  function submit(event) {
    event.preventDefault();
    const nextTags = selectedDraftTags();
    if (!nextTags.length) {
      setTagError("태그는 1개 이상 선택하거나 추가해야 합니다.");
      return;
    }
    const links = draft.links
      .map((link) => ({
        title: link.title.trim() || "관련 링크",
        url: link.url.trim(),
        type: link.type.trim() || "링크"
      }))
      .filter((link, index) => draft.links[index].title.trim() || draft.links[index].url.trim());
    const updates = draft.updateText
      ? [{ authorId: draft.creatorId || draft.ownerId, date: TODAY, text: draft.updateText }, ...draft.updates]
      : draft.updates;

    const subtasks = draft.subtasks
      .map((subtask, index) => ({
        ...subtask,
        id: subtask.id || `st-${Date.now()}-${index}`,
        title: subtask.title.trim()
      }))
      .filter((subtask) => subtask.title);
    if (!subtasks.length) {
      setSubtaskError("상세 업무 내용을 1개 이상 적어주세요. 업무명과 같은 내용이어도 괜찮습니다.");
      return;
    }
    const { tagsText, updateText, ...taskDraft } = draft;
    const recurringDraft = taskDraft.recurring
      ? {
          recurringDetail: recurringDescription(taskDraft),
          recurringInterval: Math.max(1, Number(taskDraft.recurringInterval) || 1),
          recurringWeekdays: normalizeRecurringWeekdays(taskDraft.recurringWeekdays, taskDraft.dueDate),
          recurringStartDate: taskDraft.recurringStartDate || taskDraft.startDate,
          recurringEndDate: taskDraft.recurringNoEnd ? "" : taskDraft.recurringEndDate || taskDraft.dueDate,
          recurringNoEnd: Boolean(taskDraft.recurringNoEnd),
          recurringDurationDays: Math.max(1, Number(taskDraft.recurringDurationDays) || 1)
        }
      : {
          recurringDetail: "",
          recurringInterval: 1,
          recurringWeekdays: [],
          recurringStartDate: "",
          recurringEndDate: "",
          recurringNoEnd: false,
          recurringDurationDays: Math.max(1, Number(taskDraft.recurringDurationDays) || 1)
        };
    onSave({
      ...taskDraft,
      ...recurringDraft,
      workstream: taskWorkstreamLabel({ ...taskDraft, tags: nextTags }, workstreamOptions),
      tags: nextTags,
      links,
      subtasks,
      updates
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className={`task-modal ${isRecurringRuleMode ? "recurring-rule-mode" : ""}`} onSubmit={submit} role="dialog" aria-modal="true" aria-label={isRecurringRuleMode ? "미수행 반복 일정 수정" : task.id ? "업무 수정" : "업무 추가"}>
        <div className="modal-header">
          <div>
            <span className="panel-label">{isRecurringRuleMode ? "미수행 반복 일정 수정" : task.id ? "업무 수정" : "업무 추가"}</span>
            <h2>{!isRecurringRuleMode && (task.recurring || task.recurringTemplateId) ? "🔁 " : ""}{task.id ? task.title : "새 업무 만들기"}</h2>
            {!isRecurringRuleMode && (task.recurring || task.recurringTemplateId) && (
              <p className="recurring-edit-warning">
                <span aria-hidden="true">!</span>
                반복업무 내용으로 본 화면에서는 선택한 회차의 업무명, 기간, 상세 업무 내용만 수정합니다. 반복 주기와 앞으로의 일정은 반복 업무 탭에서 수정하세요.
              </p>
            )}
          </div>
          <button className="icon-button" onClick={onClose} type="button" title="닫기">
            <X size={18} />
          </button>
        </div>
        {isRecurringRuleMode && (
          <div className="recurring-rule-context">
            <span>🔁 반복 규칙</span>
            <strong>{recurringDescription(draft)}</strong>
            <p>아직 시작하지 않은 회차의 반복 일정만 조정합니다. 업무명, 상세 업무 내용, 링크와 로그는 그대로 유지됩니다.</p>
          </div>
        )}
        <label className="field wide task-modal-full-field">
          <span>업무명</span>
          <input
            ref={titleInputRef}
            required
            value={draft.title}
            onBlur={suggestWorkstreamFromTitle}
            onChange={(event) => updateTitle(event.target.value)}
          />
        </label>
        <label className="field wide task-modal-full-field">
          <span className="field-label-with-note">
            상위 업무흐름
            <small className="field-note-badge">ⓘ 업무명 입력 후 자동 추천 · 필요 시 직접 수정 · 실적/마인드맵 묶음 기준</small>
          </span>
          <input
            aria-label="상위 업무흐름"
            list="workstream-options"
            value={draft.workstream}
            onChange={(event) => updateWorkstream(event.target.value)}
          />
          <datalist id="workstream-options">
            {workstreamOptions.map((workstream) => (
              <option key={workstream.label} value={workstream.label} />
            ))}
          </datalist>
        </label>
        <div className="field wide subtask-editor task-modal-full-field">
          <span className="field-label-with-note">
            상세 업무 내용
            <small className="field-note-badge">ⓘ 최소 1개 필요 · 체크 완료 기준으로 진행률 계산</small>
          </span>
          <div className="subtask-editor-list">
            {draft.subtasks.map((subtask, index) => (
              <div className="subtask-editor-row" key={`${subtask.id || "new"}-${index}`}>
                <input
                  aria-label={`상세 업무 내용 ${index + 1} 완료 여부`}
                  checked={subtask.done}
                  onChange={(event) => updateSubtask(index, "done", event.target.checked)}
                  type="checkbox"
                />
                <input
                  placeholder={`상세 업무 내용 ${index + 1}`}
                  value={subtask.title}
                  onChange={(event) => updateSubtask(index, "title", event.target.value)}
                />
                <button
                  disabled={draft.subtasks.length <= 1}
                  onClick={() => removeSubtask(index)}
                  type="button"
                  title={draft.subtasks.length <= 1 ? "상세 업무 내용은 최소 1개가 필요합니다" : "상세 업무 내용 삭제"}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          {subtaskError && <em className="field-error">{subtaskError}</em>}
          <button className="secondary-button small subtask-add" onClick={addSubtask} type="button">
            <Plus size={15} />
            상세 업무 내용 추가
          </button>
        </div>
        <label className="field wide task-modal-full-field">
          <span>설명</span>
          <textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows={3} />
        </label>

        <div className="form-grid">
          <label className="field task-modal-full-field">
            <span>담당자</span>
            <select value={draft.ownerId} onChange={(event) => update("ownerId", event.target.value)}>
              {taskOwnerOptions().map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} {person.role}
                </option>
              ))}
            </select>
          </label>
          <label className="field task-modal-full-field">
            <span>업무배정자</span>
            <select value={draft.assignerType || "개인"} onChange={(event) => update("assignerType", event.target.value)}>
              {assignerTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="field task-modal-full-field">
            <span>상태</span>
            <select value={draft.status} onChange={(event) => update("status", event.target.value)}>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="field task-modal-full-field">
            <span>우선순위</span>
            <select value={draft.priority} onChange={(event) => update("priority", event.target.value)}>
              {["낮음", "보통", "높음"].map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <label className="field task-modal-full-field">
            <span>업무 성격</span>
            <select value={taskWorkKind(draft)} onChange={(event) => update("workKind", event.target.value)}>
              {workKindOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="field task-modal-full-field">
            <span>시작일</span>
            <input type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} />
          </label>
          <label className="field task-modal-full-field">
            <span>마감일</span>
            <input type="date" value={draft.dueDate} onChange={(event) => update("dueDate", event.target.value)} />
          </label>
          <label className={`field task-modal-full-field ${!canEditRecurringFields ? "recurring-instance-hidden-field" : ""}`}>
            <span>반복 여부</span>
            <select value={draft.recurring || ""} onChange={(event) => changeRecurring(event.target.value)}>
              <option value="">없음</option>
              <option value="매주">주 단위</option>
              <option value="매월">월 단위</option>
            </select>
          </label>
          {canEditRecurringFields && draft.recurring && (
            <div className="field wide recurring-config-field">
              <span>반복 설정</span>
              <div className="recurring-config-card">
                <label className="recurring-unit-field">
                  <small>반복 단위</small>
                  <select value={draft.recurring || ""} onChange={(event) => changeRecurring(event.target.value)}>
                    {recurringTypes.map((type) => (
                      <option key={type} value={type}>{type === "매주" ? "주 단위" : "월 단위"}</option>
                    ))}
                  </select>
                </label>
                <label className="recurring-interval-field">
                  <small>반복 주기</small>
                  <span className="inline-number-field">
                    <input
                      min="1"
                      max="52"
                      type="number"
                      value={draft.recurringInterval || 1}
                      onChange={(event) => update("recurringInterval", event.target.value)}
                    />
                    <b>{draft.recurring === "매주" ? "주마다" : "개월마다"}</b>
                  </span>
                </label>
                {draft.recurring === "매월" && (
                  <label className="recurring-duration-field">
                    <small>업무 기간</small>
                    <span className="inline-number-field">
                      <input
                        min="1"
                        max="31"
                        type="number"
                        value={draft.recurringDurationDays || 1}
                        onChange={(event) => update("recurringDurationDays", event.target.value)}
                      />
                      <b>일</b>
                    </span>
                  </label>
                )}
                {draft.recurring === "매주" && (
                  <div className="recurring-weekday-picker">
                    <small>반복일</small>
                    <div>
                      {weekdayOptions.map((day) => (
                        <button
                          className={draft.recurringWeekdays?.includes(day.value) ? "selected" : ""}
                          key={day.value}
                          onClick={() => toggleRecurringWeekday(day.value)}
                          type="button"
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="recurring-start-field">
                  <small>반복 시작</small>
                  <input
                    type="date"
                    value={draft.recurringStartDate || draft.startDate}
                    onChange={(event) => update("recurringStartDate", event.target.value)}
                  />
                </label>
                <label className="recurring-end-field">
                  <small>반복 종료</small>
                  <input
                    disabled={draft.recurringNoEnd}
                    type="date"
                    value={draft.recurringNoEnd ? "" : draft.recurringEndDate || draft.dueDate}
                    onChange={(event) => update("recurringEndDate", event.target.value)}
                  />
                </label>
                <label className="recurring-continue-toggle">
                  <input
                    checked={draft.recurringNoEnd}
                    onChange={(event) => update("recurringNoEnd", event.target.checked)}
                    type="checkbox"
                  />
                  <span>종료일 없이 계속 반복</span>
                </label>
                <div className="recurring-summary-preview">
                  <small>요약</small>
                  <strong>{recurringDescription(draft)}</strong>
                  <em>ⓘ 주말·공휴일은 자동 보정하지 않으니, 휴일이 포함된 회차는 해당 월 업무에서 일정을 조정하세요.</em>
                </div>
              </div>
            </div>
          )}
          <label className="field task-modal-full-field">
            <span>보관 여부</span>
            <select value={draft.archived ? "true" : "false"} onChange={(event) => update("archived", event.target.value === "true")}>
              <option value="false">메인에 표시</option>
              <option value="true">보관함으로 이동</option>
            </select>
          </label>
        </div>

        <div className="field wide tag-picker task-modal-full-field">
          <span>태그</span>
          <div className="tag-option-grid">
            {availableTags.map((tag) => (
              <button
                aria-pressed={selectedDraftTags().includes(tag)}
                className={`tag-tone-${tagTone(tag)} ${selectedDraftTags().includes(tag) ? "selected" : ""}`}
                key={tag}
                onClick={() => toggleDraftTag(tag)}
                title={selectedDraftTags().includes(tag) ? `${tag} 태그 선택 해제` : `${tag} 태그 선택`}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
          {!selectedDraftTags().length && <small className="tag-picker-help">업무를 모아볼 기준 태그를 1개 이상 선택하세요.</small>}
          <div className="tag-compose-row">
            <input
              list="tag-options"
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addDraftTag();
                }
              }}
              placeholder="새 태그 입력"
              value={tagDraft}
            />
            <datalist id="tag-options">
              {availableTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <button className="secondary-button small" onClick={addDraftTag} type="button">
              <Plus size={14} />
              추가
            </button>
          </div>
          {tagError && <em className="field-error">{tagError}</em>}
        </div>
        <label className="field wide task-modal-full-field">
          <span>관련 링크</span>
          <div className="link-input-list">
            {draft.links.map((link, index) => (
              <div className="link-input-row" key={index}>
                <input
                  placeholder={`링크 제목 ${index + 1}`}
                  value={link.title}
                  onChange={(event) => updateLink(index, "title", event.target.value)}
                />
                <input
                  placeholder="https://자료 주소"
                  value={link.url}
                  onChange={(event) => updateLink(index, "url", event.target.value)}
                />
                <input
                  placeholder="문서/시트/드라이브"
                  value={link.type}
                  onChange={(event) => updateLink(index, "type", event.target.value)}
                />
              </div>
            ))}
          </div>
        </label>
        <label className="field wide task-modal-full-field">
          <span>업데이트 로그 추가</span>
          <div className="emoji-textarea-frame">
            <textarea
              placeholder="이번 수정에서 남길 짧은 진행상황을 입력"
              value={draft.updateText}
              onChange={(event) => update("updateText", event.target.value)}
              ref={modalUpdateRef}
              rows={2}
            />
            <EmojiPopover
              onSelect={(emoji) => insertEmojiAtCursor(modalUpdateRef, draft.updateText, emoji, (value) => update("updateText", value))}
              triggerLabel="업데이트 로그에 이모지 넣기"
              triggerClassName="textarea-emoji-trigger"
            />
          </div>
        </label>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            취소
          </button>
          <button className="primary-button" type="submit">
            <CheckCircle2 size={18} />
            {isRecurringRuleMode ? "반복 일정 저장" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BadgeRow({ badges }) {
  if (!badges.length) return null;
  return (
    <div className="badge-row">
      {badges.map((badge) => (
        <span className={`badge badge-${badge.tone}`} key={`${badge.label}-${badge.tone}`}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="progress-wrap" aria-label={`진행률 ${value}%`}>
      <span style={{ width: `${value}%` }} />
      <small>{value}%</small>
    </div>
  );
}

function InfoItem({ className = "", label, value }) {
  return (
    <div className={`info-item ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
