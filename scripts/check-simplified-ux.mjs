import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(file, source, expected) {
  if (!source.includes(expected)) {
    throw new Error(`${file} is missing required text: ${expected}`);
  }
}

function assertNotIncludes(file, source, unexpected) {
  if (source.includes(unexpected)) {
    throw new Error(`${file} still includes removed text: ${unexpected}`);
  }
}

const app = read("src/App.jsx");
const css = read("src/styles.css");
const design = read("DESIGN.md");

[
  "나의 업무",
  "팀 업무",
  "일정",
  "자료/보고",
  "전체 업무 보기",
  "isSimpleTodayMode",
  "is-briefing-only",
  "showDashboardAiButton",
  "const showDashboardAiButton = true",
  "showSecondaryTopActions",
  "shouldShowWorkflowArea",
  "setIsWorkflowAreaOpen(false)",
  "!isSimpleTodayMode && (",
  "workspace-team-strip",
  "<span className=\"panel-label\">팀원</span>",
  "aria-label=\"오늘 브리핑\"",
  "이름과 직책은 팀 구성과 계정 버튼에 바로 반영됩니다."
].forEach((text) => assertIncludes("src/App.jsx", app, text));

if (app.includes("shouldShowWorkflowSummary")) {
  throw new Error("src/App.jsx should not render the duplicated workflow summary cards.");
}

[
  "자동 선별",
  "팀 전체 오늘 업무 흐름",
  "personalBriefingGreeting(briefing)",
  "briefing-chip",
  "triggerLabel=\"프로필 이모지 선택\"",
  "onUpdateEmoji",
  "updateProfileEmoji",
  "이름, 직책, 이모지는 팀 구성과 계정 버튼에 바로 반영됩니다.",
  "보드, 필터, 타임라인은 필요할 때만 엽니다.",
  "data-initials={initials(person.name)}",
  "data-initials={initials(selectedPerson.name)}",
  "Team Members"
].forEach((text) => assertNotIncludes("src/App.jsx", app, text));

assertNotIncludes("src/styles.css", css, "briefing-chip");

[
  ".simple-today-actions",
  ".quiet-topbar",
  ".quiet-top-actions",
  ".poslab-entry-visual",
  "radial-gradient(125% 125% at 36% 8%",
  ".entry-ai-panel",
  ".poslab-lanyard-wrapper",
  "Simplified dashboard quiet-tone pass",
  "Apple-token adaptation",
  "--apple-action-blue: #0066cc",
  "--apple-parchment: #f5f5f7",
  "--apple-hairline: #e0e0e0",
  ".dashboard-ai-button",
  ".nav-list::before"
].forEach((text) => assertIncludes("src/styles.css", css, text));

[
  "작은 안내판",
  "나의 업무",
  "오늘 할 일",
  "전체 업무 보기",
  "40대",
  "Apple-inspired operational",
  "`#0066cc` Action Blue",
  "`#f5f5f7`",
  "`#e0e0e0` hairlines",
  "name and role only",
  "without avatar/initial badges",
  "centered team selector",
  "plain Korean",
  "profile/team-member emoji selection",
  "button only",
  "Hide the duplicated workspace team-member strip",
  "hide empty `오늘 일정` and empty `업무 Note`/`팀 체크` side widgets",
  "Keep `오늘 브리핑` rows recognizable",
  "preserving the top title gradient",
  "avoid decorative gradients and card shadows",
  "sidebar brand divider"
].forEach((text) => assertIncludes("DESIGN.md", design, text));

console.log("Simplified UX contract check passed.");
