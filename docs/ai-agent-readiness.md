# AI Agent Readiness

This note defines the future read-only AI agent layer for the `연구기획그룹-전략` work dashboard. It is a planning contract, not an implemented feature.

For a beginner-friendly implementation path, start from `docs/ai-agent-implementation-guide.md`.
For a Codex execution brief, use `docs/ai-agent-codex-implementation-brief.md`.

## Goal

The dashboard should eventually let an approved AI agent such as HERmes answer work-status questions and draft reports from the same source records used by the app.

Target questions:

- `요즘 박경수님이 하고 있는 업무 진행내용이 뭐야?`
- `아이디어 관련 진행내용과 이슈가 뭐야?`
- `이번 주 지연되거나 의사결정이 필요한 업무는 뭐야?`
- `업무흐름별 주요 성과와 다음 액션을 보고서 초안으로 정리해줘.`

The agent should act like a grounded work assistant. It should not behave like a screen reader that guesses from the rendered UI.

## Default Scope

Initial AI integration should be read-only.

Allowed:

- Read visible task metadata.
- Read task updates and task change history.
- Read task subtasks/checklist progress.
- Read task links and task-level `업무 노트` posts when the requesting user can read the parent task.
- Read shared tags, tag groups, workstream labels, roster names, and team roles needed for context.
- Read generated performance-report source data.
- Generate draft answers and draft reports with source references.

Not allowed by default:

- Create, update, archive, delete, or assign tasks.
- Change task status, due dates, updates, tags, notes, reports, or calendar events.
- Read personal notes.
- Read private calendar events unless the future permission model explicitly exposes them to the requester.
- Interpret personnel evaluation, performance rating, or HR-sensitive intent from ordinary task data.
- Use external credentials, service-role keys, or broad database access from the browser.

## Answering Principles

AI answers must be evidence-first.

- Include source task title, owner, status, and update date when making a concrete claim.
- Separate recorded facts from inferred summaries.
- Say `최근 기록 부족` when a task has no recent update instead of inventing progress.
- Mark inferred risks as `추정` unless the source row is explicitly typed as `issue`, `risk`, `request`, or similar.
- Prefer short operational answers over polished but unsupported prose.
- Treat generated reports as drafts that require human review before submission.

## Recommended Read Model

Build a dedicated read-only projection instead of letting the agent query every table directly.

Recommended shape:

```json
{
  "generatedAt": "2026-06-08T00:00:00.000Z",
  "requester": {
    "id": "user-id",
    "role": "member"
  },
  "scope": {
    "periodStart": "2026-06-01",
    "periodEnd": "2026-06-08",
    "filters": {
      "ownerId": "optional",
      "workstream": "optional",
      "query": "optional"
    }
  },
  "tasks": [
    {
      "id": "task-id",
      "title": "업무명",
      "ownerName": "담당자",
      "status": "진행중",
      "priority": "보통",
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
      "openSubtasks": ["부서 의견 취합"],
      "signals": ["지연 가능", "의사결정 필요"]
    }
  ]
}
```

This projection can be produced from Supabase using role-filtered queries, database views, or a small server/API layer. The important rule is that the projection is already permission-filtered before it reaches the AI model.

## Suggested Query Tools

Start with a small number of tools that map to real user questions.

| Tool | Purpose |
| --- | --- |
| `getPersonWorkStatus(person, period)` | 담당자별 진행 업무, 최근 업데이트, 지연/보류 신호 조회. |
| `searchWorkTopics(query, period)` | 제목, 설명, 태그, 업무흐름, 업데이트, 업무 노트에서 주제 검색. |
| `getWorkstreamIssues(workstream, period)` | 상위 업무흐름별 진행내용, 이슈, 의사결정 필요사항 조회. |
| `getRecentUpdates(filters)` | 기간/담당자/태그/상태 기준 최근 업데이트 조회. |
| `getReportEvidence(reportType, period, filters)` | 주간/월간/임원 보고서 생성을 위한 근거 묶음 조회. |

These are conceptual tool names. The implementation can be Supabase RPC, PostgREST filtered views, an internal REST API, or an MCP tool.

## Issue Signals

The agent should identify issues from explicit fields first, then from conservative signals.

Explicit sources:

- `task_updates.update_type = issue`
- `task_posts.scope` values such as `리스크`, `다음 확인`, `결정사항`
- task status `검토/대기` or `보류`
- overdue task due date

Conservative inferred signals:

- Due date is near and progress is low.
- Task has no recent update within the selected period.
- Open subtasks remain on a high-priority task.
- Update text includes waiting words such as `대기`, `확인 필요`, `자료 미확보`, `협의 필요`.

Inferred signals must be labeled as inferred. They should not be presented as confirmed blockers.

## Report Drafts

The first report templates should be narrow and repeatable.

Recommended templates:

- Weekly work-status report.
- Monthly performance report.
- Person-by-person work summary.
- Workstream progress and issue report.
- Executive five-line summary.

Every report draft should include:

- Scope and period.
- Key accomplishments.
- Work in progress.
- Issues, risks, or decisions needed.
- Next actions.
- Source appendix with task/update ids or titles and dates.

The source appendix can be hidden in the UI later, but it must remain available for review and export.

## Permission Rules

AI read access must follow the same server-side permission rules as human users.

- Member requests are filtered to visible team workflow and their own private data only.
- Lead/admin requests can include team-wide operational data.
- Personal notes are excluded by default for all report generation.
- Private calendar events are excluded unless explicitly approved in a future permission change.
- Service-role credentials must not be exposed to the frontend or to the model runtime.
- Audit logs should record who requested an AI answer/report, what scope was queried, and when.

## Implementation Phases

1. `AI 읽기용 스냅샷`: generate JSON/Markdown from the current dashboard state or Supabase reads for manual AI use.
2. `Read-only API`: expose permission-filtered task/update/workstream/report-evidence endpoints.
3. `Agent tools`: wrap the read-only API as HERmes/MCP/internal tools with grounded citations.
4. `Draft reports`: add controlled templates for weekly/monthly/workstream/executive report drafts.
5. `Human approval workflow`: let users review, edit, and export generated drafts.

Write access by AI agents is intentionally outside the initial scope.
