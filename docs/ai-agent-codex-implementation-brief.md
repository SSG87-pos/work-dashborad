# AI Agent Codex Implementation Brief

This is the developer execution brief for future Codex sessions that implement HERmes/OpenAI AI-agent integration for the work dashboard.

Use this file when the user says something like:

```txt
docs/ai-agent-codex-implementation-brief.md 읽고 AI 에이전트 연동 작업 시작해줘.
```

## Objective

Implement AI-agent support in the safest useful order:

1. Build a read-only evidence layer from dashboard/FastAPI/PostgreSQL data.
2. Expose that evidence through `/ai/read/...` query APIs or equivalent local adapters.
3. Validate OpenAI tool/function calling against that evidence.
4. Wrap the same read-only operations as MCP tools for HERmes.

Do not implement AI write-back first.

## Required Reading Order

Read these files before editing code:

1. `AGENTS.md`
2. `src/AGENTS.md`
3. `docs/fastapi-postgres-backend-spec.md`
4. `docs/ai-agent-implementation-guide.md`
5. `docs/ai-agent-readiness.md`
6. `docs/backend-api-spec.md`
7. `docs/data-model.md`
8. `docs/permission-rules.md`
9. `docs/performance-report-rules.md`
10. `HANDOFF.md`
11. `TODO.md`

## Current Recommended Architecture

```txt
HERmes Agent / OpenAI model
-> MCP tool or OpenAI function tool
-> dashboard read-only API
-> permission-filtered FastAPI/PostgreSQL query
-> evidence bundle
-> grounded answer or draft report
```

Implementation rule:

- REST/read-only API is the durable company boundary.
- MCP is the agent-friendly wrapper.
- PostgreSQL behind FastAPI is the planned system of record.
- The model writes prose, not database rows.

## First Implementation Target

Start with `report-evidence`.

Why:

- It supports useful report-draft PoC quickly.
- It reuses existing performance/report concepts.
- It is easier to verify than open-ended chat.

Initial question to support:

```txt
이번 주 연구기획그룹-전략 업무현황 보고서 초안을 만들어줘.
완료된 일, 진행 중인 일, 이슈, 다음 액션을 나눠서 정리하고 근거 업무를 붙여줘.
```

## Phase 1: Evidence Bundle Builder

Add a pure data builder before adding model calls.

Suggested file:

- `src/aiEvidence.js`

Suggested exports:

```js
export function buildReportEvidence({ tasks, people, periodStart, periodEnd, reportType, filters }) {}
export function buildPersonWorkStatusEvidence({ tasks, people, personId, periodStart, periodEnd }) {}
export function buildTopicSearchEvidence({ tasks, people, query, periodStart, periodEnd }) {}
export function buildWorkstreamIssuesEvidence({ tasks, people, workstream, periodStart, periodEnd }) {}
export function buildRecentUpdatesEvidence({ tasks, people, filters, periodStart, periodEnd }) {}
```

Keep these functions deterministic and framework-independent so they can be tested with Node scripts.

Minimum output shape:

```json
{
  "generatedAt": "2026-06-08T00:00:00.000Z",
  "questionType": "report-evidence",
  "period": {
    "start": "2026-06-01",
    "end": "2026-06-08"
  },
  "items": [
    {
      "taskId": "task-id",
      "taskTitle": "업무명",
      "ownerName": "담당자",
      "status": "진행중",
      "workstream": "상위 업무흐름",
      "tags": ["AI활용"],
      "dueDate": "2026-06-10",
      "progress": 60,
      "recentUpdates": [
        {
          "id": "update-id",
          "date": "2026-06-07",
          "type": "issue",
          "body": "자료 수급 지연"
        }
      ],
      "signals": [
        {
          "type": "inferred",
          "label": "최근 기록 부족",
          "reason": "선택 기간 내 업데이트 없음"
        }
      ]
    }
  ],
  "excluded": {
    "personalNotes": true,
    "privateCalendarDetails": true
  }
}
```

## Phase 1 Verification

Add a script before adding UI or network calls.

Suggested file:

- `scripts/check-ai-evidence.mjs`

Suggested package script:

```json
"check:ai-evidence": "node scripts/check-ai-evidence.mjs"
```

The check should verify:

- report evidence contains task id/title/status/owner/date fields
- topic search finds matching title/tag/workstream/update/post content
- person status filters by owner or roster identity
- personal notes are absent
- private calendar details are absent
- issue signals distinguish explicit from inferred
- output is stable enough for snapshot-like assertions

Run:

```txt
/Users/seulgi/Library/pnpm/bin/pnpm run check:ai-evidence
CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build
```

## Phase 2: Read-Only API Boundary

After pure evidence builders pass, expose equivalent read operations.

Preferred endpoint names:

- `GET /ai/read/report-evidence`
- `GET /ai/read/person-work-status`
- `GET /ai/read/topic-search`
- `GET /ai/read/workstream-issues`
- `GET /ai/read/recent-updates`

If the app still has no custom server when this starts, implement the evidence builders first and document the API contract without inventing a server framework prematurely.

API rules:

- require authenticated user context
- apply the same visibility rules as the dashboard
- return evidence bundles only
- do not return raw Supabase rows wholesale
- do not generate AI prose inside the data API
- do not expose service-role credentials

## Phase 3: OpenAI Tool Calling PoC

Add this only after evidence builders are verified.

Goal:

- prove that an OpenAI model can call a read-only tool, receive evidence, and produce a grounded answer/report draft

Suggested server-side function tool names:

- `get_report_evidence`
- `get_person_work_status`
- `search_work_topics`
- `get_workstream_issues`
- `get_recent_updates`

Rules:

- keep `OPENAI_API_KEY` server-side only
- use environment variables, never hardcode keys
- log tool name and scope, not secret values
- require source references in the final prompt/instructions

## Phase 4: HERmes MCP Wrapper

Add MCP only after the API/evidence operations are stable.

MCP server role:

- expose the same five tool names to HERmes
- validate tool inputs
- call the internal read-only API
- return compact evidence bundles

MCP server must not:

- run arbitrary SQL from user prompts
- connect with Supabase service role unless a future approved server-only design requires it and hides it from HERmes
- provide task mutation tools in the first version

## Files Likely To Change

Likely in Phase 1:

- `src/aiEvidence.js`
- `scripts/check-ai-evidence.mjs`
- `package.json`
- `docs/ai-agent-readiness.md`
- `docs/ai-agent-implementation-guide.md`
- `TODO.md`
- `HANDOFF.md`

Likely in later API/MCP phases:

- `src/supabaseStore.js` or a new backend/API adapter
- `docs/backend-api-spec.md`
- `docs/permission-rules.md`
- a future `mcp/` or `tools/` folder if MCP server code is added

Do not spread Supabase or localStorage access into arbitrary view code. Preserve `src/storage.js` and `src/supabaseStore.js` as persistence boundaries.

## Acceptance Criteria For First PR

The first implementation PR is complete when:

- `buildReportEvidence` or equivalent exists
- at least one deterministic check script covers report evidence
- output includes source task/update/post ids or titles and dates
- personal notes and private calendar details are excluded
- no AI model call is required to test the evidence layer
- `TODO.md` and `HANDOFF.md` explain the new state
- build passes

Nice to have:

- topic/person/workstream evidence builders included
- concise sample JSON output in docs
- OpenAI tool-calling stub documented but not wired to secrets

## Non-Goals

Do not implement these in the first pass:

- AI changes task status
- AI creates or deletes tasks
- AI writes update logs automatically
- AI reads personal notes
- AI reads private calendar detail
- AI makes personnel/performance judgments
- browser-based OpenAI API key usage
- direct HERmes-to-Supabase full database access

## Suggested Prompt For Future Codex Session

```txt
Read docs/ai-agent-codex-implementation-brief.md and implement Phase 1 only.
Create the deterministic AI evidence builder and check script.
Do not add OpenAI calls or MCP yet.
Keep TODO.md and HANDOFF.md updated.
Run the relevant checks and build.
```
