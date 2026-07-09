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
  "오늘",
  "팀 업무",
  "일정",
  "자료/보고",
  "전체 업무 보기",
  "isSimpleTodayMode",
  "shouldShowWorkflowArea",
  "setIsWorkflowAreaOpen(false)"
].forEach((text) => assertIncludes("src/App.jsx", app, text));

[
  ".simple-today-actions",
  ".poslab-entry-visual",
  "display: none",
  "#0066cc",
  "#f5f5f7"
].forEach((text) => assertIncludes("src/styles.css", css, text));

[
  "작은 안내판",
  "오늘 할 일",
  "전체 업무 보기",
  "40대",
  "Apple-inspired operational"
].forEach((text) => assertIncludes("DESIGN.md", design, text));

console.log("Simplified UX contract check passed.");
