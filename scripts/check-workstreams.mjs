import assert from "node:assert/strict";
import {
  deriveWorkstreamLabel,
  groupTasksByWorkstream,
  recommendWorkstream
} from "../src/workstreams.js";

const existingWorkstreams = [
  { label: "혁신아이디어 추진" },
  { label: "월간 KPI 관리" }
];

assert.equal(
  deriveWorkstreamLabel("혁신아이디어 행사 기획"),
  "혁신아이디어",
  "new title-derived workstream should not receive a generic suffix"
);

assert.equal(
  deriveWorkstreamLabel("혁신기술 아이디어 중간평가"),
  "혁신기술 아이디어",
  "title-derived workstream should keep the meaningful title core"
);

assert.equal(
  deriveWorkstreamLabel("g"),
  "",
  "single IME roman fragments should not become a workstream"
);

assert.equal(
  recommendWorkstream({ title: "g", tags: ["기획보고"] }, existingWorkstreams).label,
  "",
  "in-progress IME fragments should leave the workstream empty"
);

assert.equal(
  recommendWorkstream(
    { title: "혁신아이디어 중간평가", tags: ["행사", "기획보고"] },
    existingWorkstreams
  ).label,
  "혁신아이디어 추진",
  "existing workstream should win when title core matches"
);

assert.equal(
  recommendWorkstream(
    { title: "월간 KPI 원본 시트 검수", tags: ["KPI", "월간보고"] },
    existingWorkstreams
  ).label,
  "월간 KPI 관리",
  "title words should match existing workstream even with multiple tags"
);

const grouped = groupTasksByWorkstream([
  { id: "t-1", title: "혁신아이디어 중간평가", workstream: "혁신아이디어 추진", tags: ["기획보고"] },
  { id: "t-2", title: "혁신아이디어 행사 기획", tags: ["행사", "운영"] },
  { id: "t-3", title: "임원보고용 혁신아이디어 자료정리", tags: ["임원보고", "자료조사"] }
], existingWorkstreams);

const innovationGroup = grouped.find((group) => group.label === "혁신아이디어 추진");

assert.ok(innovationGroup, "workstream group should be created");
assert.deepEqual(
  innovationGroup.tasks.map((task) => task.id),
  ["t-1", "t-2"],
  "clear innovation tasks should be grouped together"
);
assert.equal(
  grouped.find((group) => group.tasks.some((task) => task.id === "t-3"))?.label,
  "임원보고용 혁신아이디어",
  "ambiguous prefixed report task should not be silently merged into the innovation flow"
);

console.log("workstream checks passed");
