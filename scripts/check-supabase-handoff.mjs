import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const platformDoc = read("docs/company-supabase-platform-image-handoff.md");
const alignedPlan = read("docs/supabase-aligned-backend-plan.md");
const agents = read("AGENTS.md");
const handoff = read("HANDOFF.md");
const todo = read("TODO.md");

const requiredLinks = [
  "https://supabase.com/docs/guides/self-hosting",
  "https://supabase.com/docs/guides/self-hosting/docker",
  "https://github.com/supabase/supabase/tree/master/docker",
  "https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml",
  "https://raw.githubusercontent.com/supabase/supabase/master/docker/.env.example",
  "https://github.com/supabase/supabase/blob/master/docker/versions.md",
  "https://github.com/supabase/supabase/archive/refs/tags/v1.26.05.tar.gz"
];

const requiredImages = [
  "supabase/studio:2026.06.03-sha-0bca601",
  "kong/kong:3.9.1",
  "supabase/gotrue:v2.189.0",
  "postgrest/postgrest:v14.12",
  "supabase/realtime:v2.102.3",
  "supabase/storage-api:v1.60.4",
  "darthsim/imgproxy:v3.30.1",
  "supabase/postgres-meta:v0.96.6",
  "supabase/edge-runtime:v1.74.0",
  "supabase/postgres:17.6.1.136",
  "supabase/supavisor:2.9.5"
];

const requiredCompanyQuestions = [
  "Docker Compose 또는 multi-container stack 지원",
  "Persistent volume 지원",
  "Secret/env 관리",
  "Reverse proxy/TLS",
  "SMTP 설정",
  "백업/복구 정책",
  "Edge Functions 지원 여부"
];

const requiredConnectionValues = [
  "SUPABASE_PUBLIC_URL",
  "SUPABASE_ANON_OR_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_OR_SECRET_KEY",
  "POSTGRES_CONNECTION_STRING",
  "AUTH_ENABLED",
  "STORAGE_ENABLED",
  "REALTIME_ENABLED",
  "EDGE_FUNCTIONS_ENABLED"
];

for (const link of requiredLinks) {
  assert.ok(platformDoc.includes(link), `missing platform link: ${link}`);
}

for (const image of requiredImages) {
  assert.ok(platformDoc.includes(image), `missing image manifest entry: ${image}`);
  assert.ok(platformDoc.includes(`docker.io/${image}`), `missing Docker Hub image reference: docker.io/${image}`);
  assert.ok(
    platformDoc.includes(`https://hub.docker.com/r/${image.split(":")[0]}`),
    `missing Docker Hub repo link: ${image.split(":")[0]}`
  );
}

for (const question of requiredCompanyQuestions) {
  assert.ok(platformDoc.includes(question), `missing company platform question: ${question}`);
}

for (const value of requiredConnectionValues) {
  assert.ok(alignedPlan.includes(value), `missing connection value in aligned plan: ${value}`);
}

for (const phrase of [
  "FastAPI 유지 + Supabase Postgres/Auth/API/Storage",
  "Phase 1. DB 연결만 Supabase Postgres로 검증",
  "기존 `release/company-supabase-c3` 브랜치로 돌아가지 않습니다",
  "service role key가 frontend bundle에 포함되지 않음"
]) {
  assert.ok(alignedPlan.includes(phrase), `missing aligned plan phrase: ${phrase}`);
}

for (const doc of [agents, handoff, todo]) {
  assert.ok(
    doc.includes("docs/company-supabase-platform-image-handoff.md"),
    "company Supabase platform image handoff is not linked everywhere"
  );
  assert.ok(
    doc.includes("docs/supabase-aligned-backend-plan.md"),
    "Supabase-aligned backend plan is not linked everywhere"
  );
}

const alembicMigrations = readdirSync("backend/alembic/versions")
  .filter((name) => /^20260625_\d+_.+\.py$/.test(name))
  .sort();
assert.deepEqual(
  alembicMigrations.map((name) => name.match(/^20260625_(\d+)_/)?.[1]),
  ["0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009", "0010", "0011", "0012"],
  "FastAPI Alembic migration sequence changed unexpectedly"
);

const supabaseMigrations = readdirSync("supabase/migrations")
  .filter((name) => /^\d{3}_.+\.sql$/.test(name))
  .sort();
assert.deepEqual(
  supabaseMigrations.map((name) => name.slice(0, 3)),
  [
    "001",
    "002",
    "003",
    "004",
    "005",
    "006",
    "007",
    "008",
    "009",
    "010",
    "011",
    "012",
    "013",
    "014",
    "015",
    "016",
    "017",
    "018",
    "019",
    "020",
    "021",
    "022"
  ],
  "legacy Supabase migration sequence changed unexpectedly"
);

console.log("supabase handoff checks passed");
