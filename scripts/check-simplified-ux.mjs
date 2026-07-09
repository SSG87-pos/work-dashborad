import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(file, source, expected) {
  if (!source.includes(expected)) {
    throw new Error(`${file} is missing required text: ${expected}`);
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
  "shouldShowWorkflowArea",
  "setIsWorkflowAreaOpen(false)"
].forEach((text) => assertIncludes("src/App.jsx", app, text));

if (app.includes("shouldShowWorkflowSummary")) {
  throw new Error("src/App.jsx should not render the duplicated workflow summary cards.");
}

[
  ".simple-today-actions",
  ".poslab-entry-visual",
  "radial-gradient(125% 125% at 36% 8%",
  ".entry-ai-panel",
  ".poslab-lanyard-wrapper"
].forEach((text) => assertIncludes("src/styles.css", css, text));

[
  "작은 안내판",
  "나의 업무",
  "오늘 할 일",
  "전체 업무 보기",
  "40대",
  "Apple-inspired operational"
].forEach((text) => assertIncludes("DESIGN.md", design, text));

console.log("Simplified UX contract check passed.");
