const genericActionTerms = [
  "중간평가",
  "최종평가",
  "행사 기획",
  "행사기획",
  "원본 시트 검수",
  "운영자료 취합",
  "자료정리",
  "자료 정리",
  "초안 작성",
  "초안",
  "업데이트",
  "활용사례 조사",
  "사례 조사",
  "검수",
  "취합",
  "점검",
  "정리",
  "기획",
  "조사"
];

const reportSuffixTerms = ["추진", "관리", "대응", "운영", "체계화", "과제"];

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .replace(/[()[\]{}.,:;'"`~!?·ㆍ/_-]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function hasMeaningfulCore(core) {
  const text = normalizeText(core);
  if (!text) return false;
  if (/[가-힣]/u.test(text)) return normalizeKey(text).length >= 2;
  return normalizeKey(text).length >= 3;
}

function stripReportSuffix(label) {
  const text = normalizeText(label);
  const suffixPattern = new RegExp(`\\s+(${reportSuffixTerms.join("|")})$`);
  return text.replace(suffixPattern, "").trim();
}

function stripDatePrefix(title) {
  return normalizeText(title)
    .replace(/^\d{1,2}월\s+/u, "")
    .replace(/^(상반기|하반기|연간|월간|주간)\s+(?=\S+\s+\S+)/u, (match, prefix) => {
      if (["월간", "주간"].includes(prefix)) return match;
      return "";
    })
    .trim();
}

export function extractWorkstreamCore(title) {
  const cleanTitle = stripDatePrefix(title);
  if (!cleanTitle) return "";
  const indexedTerms = genericActionTerms
    .map((term) => ({ term, index: cleanTitle.indexOf(term) }))
    .filter((item) => item.index > 0)
    .sort((a, b) => a.index - b.index || b.term.length - a.term.length);
  const rawCore = indexedTerms.length ? cleanTitle.slice(0, indexedTerms[0].index) : cleanTitle;
  return normalizeText(rawCore)
    .replace(/\s+(관련|대상|후속)$/u, "")
    .trim();
}

export function deriveWorkstreamLabel(title) {
  const core = extractWorkstreamCore(title);
  if (!hasMeaningfulCore(core)) return "";
  return core;
}

function existingWorkstreamLabel(existing) {
  if (typeof existing === "string") return normalizeText(existing);
  return normalizeText(existing?.label);
}

function workstreamBaseKey(label) {
  return normalizeKey(stripReportSuffix(label));
}

function isExistingWorkstreamMatch(candidateLabel, existingLabel) {
  const candidateKey = workstreamBaseKey(candidateLabel);
  const existingKey = workstreamBaseKey(existingLabel);
  if (!candidateKey || !existingKey) return false;
  if (candidateKey === existingKey) return true;
  return false;
}

export function collectWorkstreams(tasks = []) {
  return Array.from(
    new Set(
      (tasks ?? [])
        .map((task) => normalizeText(task?.workstream))
        .filter(Boolean)
    )
  ).map((label) => ({ label }));
}

export function recommendWorkstream(task, existingWorkstreams = []) {
  const assigned = normalizeText(task?.workstream);
  if (assigned) return { label: assigned, source: "assigned" };
  const candidate = deriveWorkstreamLabel(task?.title);
  const matchedExisting = (existingWorkstreams ?? [])
    .map(existingWorkstreamLabel)
    .filter(Boolean)
    .find((label) => isExistingWorkstreamMatch(candidate, label));
  return {
    label: matchedExisting || candidate,
    source: matchedExisting ? "existing" : "title"
  };
}

export function groupTasksByWorkstream(tasks = [], existingWorkstreams = []) {
  const groups = new Map();
  (tasks ?? []).forEach((task) => {
    if (!task) return;
    const recommendation = recommendWorkstream(task, existingWorkstreams);
    const label = recommendation.label;
    if (!groups.has(label)) {
      groups.set(label, {
        label,
        source: recommendation.source,
        tasks: []
      });
    }
    groups.get(label).tasks.push(task);
  });
  return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label, "ko-KR"));
}
