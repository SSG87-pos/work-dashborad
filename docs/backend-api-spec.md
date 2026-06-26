# Backend API and Table Spec

This spec is the concrete backend contract for the `연구기획그룹-전략` work dashboard.

Current approved implementation route: **FastAPI + PostgreSQL without Docker**.

Read `docs/fastapi-postgres-backend-spec.md` first for the actual company-internal implementation architecture, PostgreSQL DDL, FastAPI endpoint plan, and deployment sequence. This file remains the app-level API/table contract that the frontend should continue to match. Older Supabase wording and migrations are retained as design history and schema reference only.

## Backend Route

Recommended implementation route:

1. Keep the React/Vite UI as the canonical product surface.
2. Use the current `src/storage.js` localStorage adapter as the development store.
3. Add a `VITE_API_BASE_URL` FastAPI-backed store behind the same state shape.
4. Use PostgreSQL as the durable database.
5. Start with auth, users/roster, tasks, subtasks, updates, links, tags, and calendar events.
6. Add task posts, briefing inbox/team check, Canvas, recurring generation, and frozen report snapshots after shared task CRUD is stable.
7. Keep future AI/HERmes integrations read-only at first; use `docs/ai-agent-readiness.md` as the grounding, permission, and report-draft contract.

Open approval required:

- Actual internal API host/port.
- Email/password first login details and future internal SSO timing.
- Production user list and initial admin account.

Until those are approved, the local prototype remains the safe implementation path.

## State Shape Used by the Frontend

The current app persists one dashboard payload:

```json
{
  "version": 1,
  "tasks": [],
  "availableTags": [],
  "calendarEvents": [],
  "isAuthenticated": true,
  "selectedPersonId": "kmryu",
  "activePage": "my",
  "activeView": "board",
  "category": "전체",
  "timelineMode": "month",
  "timelineMonth": "2026-06",
  "timelineYear": "2026",
  "selectedTaskId": "t-001",
  "personalNotes": {},
  "profileOverrides": {}
}
```

Backend integration should not store view-only fields as team data. Treat these as per-user preferences:

- `selectedPersonId`
- `activePage`
- `activeView`
- `category`
- `timelineMode`
- `timelineMonth`
- `timelineYear`
- `selectedTaskId`

## Tables

### users

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable app user id. |
| email | text unique | yes | Login id. |
| name | text | yes | Display name. |
| title | text | yes | Team title. |
| team | text | yes | Default `연구기획그룹-전략`. |
| profile_emoji | text | yes | User-selected avatar mark. |
| permission_role | enum | yes | `admin`, `lead`, `member`. |
| is_team_member | boolean | yes | False for admin/system accounts hidden from team list. |
| is_active | boolean | yes | Inactive users remain available for historical rows. |
| created_at | timestamp | yes | Audit. |
| updated_at | timestamp | yes | Audit. |

### team_roster

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable roster id that can exist before signup. |
| expected_email | text unique | no | Email expected for future signup and automatic linking. |
| auth_user_id | text fk users.id | no | Linked login profile after signup. |
| name | text | yes | Display name. |
| title | text | yes | Team title. |
| profile_emoji | text | yes | Emoji avatar. |
| permission_role | enum | yes | `admin`, `lead`, `member`. |
| is_team_member | boolean | yes | False for non-team/admin-only entries. |
| is_active | boolean | yes | Inactive roster rows remain available for history. |
| created_at | timestamp | yes | Audit. |
| updated_at | timestamp | yes | Audit. |

### tasks

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable task id. |
| title | text | yes | Task name. |
| description | text | no | Detail body. |
| workstream | text | no | `상위 업무흐름` used for mindmap and performance grouping. Recommended from title first, tags second, and confirmed by user/admin. |
| owner_id | text fk users.id | yes | Accountable assignee. |
| assigner_type | enum | yes | `원장님`, `소장님`, `그룹장님`, `팀장님`, `개인`, `기타`. |
| assigner_id | text fk users.id | no | Internal assigner when known. |
| creator_id | text fk users.id | yes | User who entered the task. |
| status | enum | yes | `검토/대기`, `계획`, `진행중`, `완료`, `보류`. |
| priority | enum | yes | `높음`, `보통`, `낮음`. |
| work_kind | enum | yes | `standard` or `spot`. Spot means short/one-time work; weekly/monthly reports include it, quarterly/yearly summaries exclude it unless detailed results are enabled. |
| start_date | date | yes | Planned start. |
| due_date | date | yes | Planned deadline. Changes must be appended to task change history. |
| completed_at | date | no | Actual completion date. Set when status first enters `완료`; clear when completion is cancelled. |
| completed_by | text fk users.id | no | User who marked the task complete. |
| progress_before_complete | integer | no | Manual-progress fallback used when accidental completion is cancelled. |
| progress | integer | yes | Manual progress only when no subtasks exist. |
| archived_at | timestamp | no | Main board/timeline hide flag. |
| archived_by | text fk users.id | no | Audit. |
| recurring_template_id | text fk recurring_task_templates.id | no | Source template for generated instances. |
| recurring_frequency | enum | no | Visible recurring source task rule: `weekly`, `monthly`, `quarterly`. |
| recurring_interval | integer | no | Repeat every N weeks/months/quarters. |
| recurring_weekdays | integer[] | no | Weekly repeat days. Empty for monthly/quarterly rules. |
| recurring_start_date | date | no | Repeat rule start date for the visible source task. |
| recurring_end_date | date | no | Repeat rule end date unless `recurring_no_end` is true. |
| recurring_no_end | boolean | yes | True when the recurring rule continues indefinitely. |
| recurring_rule_detail | text | no | Human-readable recurrence summary. |
| recurring_duration_days | integer | yes | Planned work duration for each recurrence. |
| owner_roster_id | text fk team_roster.id | no | Display assignee before/after signup. |
| assigner_roster_id | text fk team_roster.id | no | Roster assigner before/after signup. |
| creator_roster_id | text fk team_roster.id | no | Roster creator before/after signup. |
| created_at | timestamp | yes | Audit. |
| updated_at | timestamp | yes | Audit. |

### subtasks

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable subtask id. |
| task_id | text fk tasks.id | yes | Parent task. |
| title | text | yes | Checklist label. |
| done | boolean | yes | Completion state. |
| done_at | timestamp | no | Set when checked. |
| done_by | text fk users.id | no | User who checked it. |
| sort_order | integer | yes | Display order. |

Progress rule:

- If a task has subtasks, progress is `done subtasks / total subtasks`.
- If a task has no subtasks, use `tasks.progress`.
- When a task enters `완료`, set `completed_at`, `completed_by`, preserve `progress_before_complete`, and set progress to 100.
- When a task leaves `완료`, clear `completed_at` and `completed_by`; restore `progress_before_complete` only for no-subtask manual-progress tasks.
- Reports must use `completed_at` as the actual completion date. `due_date` remains the planned deadline and is only a fallback for legacy completed rows.

### task_change_history

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable change id. |
| task_id | text fk tasks.id | yes | Parent task. |
| change_type | enum | yes | `status`, `due_date`, `archive`, `delete`, `recurring`. |
| from_value | text | no | Previous status or due date. |
| to_value | text | yes | New status or due date. |
| actor_id | text fk users.id | yes | User who changed the status. |
| note | text | no | Display memo. Example: `완료 처리`, `완료 처리 취소`, `마감일 변경: 2026-06-04 → 2026-06-07`. Task managers may update this column to correct an accidental display memo. |
| created_at | timestamp | yes | Change timestamp. |

Task changes are append-first audit records. Accidental completion or deadline changes should normally be represented by later change-history rows instead of editing the previous row. If a history row itself was created by mistake, task managers may update only `note` or delete the history row; this does not change the current task status, completion metadata, or due date.

### task_updates

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable update id. |
| task_id | text fk tasks.id | yes | Parent task. |
| author_id | text fk users.id | yes | Writer. |
| body | text | yes | Short update. |
| update_type | enum | no | `note`, `issue`, `decision`, `request`, `completion`. |
| created_at | timestamp | yes | Sort newest first. |

Updates are append-first. The author or a task manager may update only `body` or delete an accidental update row. Author and timestamp stay immutable.

### task_post_categories

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable category id such as `decision`, `memory`, `risk`. |
| label | text unique | yes | Visible label used in note chips and post rows. |
| tone | text | yes | `blue`, `green`, `amber`, `red`, `violet`, `slate`. |
| active | boolean | yes | Hidden categories are not offered for new posts but old posts remain readable. |
| sort_order | integer | yes | Admin display order. |
| created_by | text fk users.id | no | First admin creator. |
| updated_by | text fk users.id | no | Last admin editor. |
| created_at | timestamp | yes | Audit. |
| updated_at | timestamp | yes | Audit. |

Only admin users can insert, rename, recolor, hide, or delete post categories.

### task_posts

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable post id. |
| task_id | text fk tasks.id | yes | Parent task. |
| scope | text | yes | Visible category label such as `결정사항`, `기억할 점`, `중요문서`. |
| title | text | yes | Title-first list label. |
| body | text | yes | Main remembered-context body. |
| url | text | no | Optional Teams, document, or reference URL. |
| attachment | jsonb | no | Optional pasted-image/file metadata and AI-readable extraction result. Supported keys include `label`, `caption`, `imageDataUrl` for local/prototype paste preview, `fileName`, `mimeType`, `ocrText`, `visionSummary`, and `source`. In production, replace `imageDataUrl` with a storage key or signed URL while keeping `ocrText`/`visionSummary` as the AI-readable fields. |
| author_id | text fk users.id | yes | Writer. |
| posted_at | date | yes | Reader-facing post date. |
| created_at | timestamp | yes | Audit. |
| updated_at | timestamp | yes | Audit. |

`업무 노트` reads only posts attached to the selected task. Highlights `업무흐름별 게시글 모음` derives its grouped view from `task_posts` joined to the parent task and grouped by `상위 업무흐름`. Authors or task managers may edit/delete task posts.

For internal security environments, do not assume the AI can open `url`. If users paste a screenshot/image into a post, the AI and LLM-Wiki layer must use `attachment.ocrText` and `attachment.visionSummary` as the grounded readable content. The pasted image itself is evidence for users, while the extracted text/summary is evidence for the AI.

### briefing_items

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable local/Supabase id. |
| scope | text | yes | `my` or `team`. |
| kind | text | yes | `inbox` or `todo`. |
| item_type | text | yes | `mail`, `meeting`, `idea`, `risk`, `reference`, `todo`, `note`. |
| title | text | yes | Compact item title. |
| body | text | no | Remembered context body. |
| url | text | no | Optional source/reference URL. |
| status | text | yes | My Desk: `new`, `reviewing`, `converted`, `archived`; Team: `open`, `done`. |
| done | boolean | yes | Checklist completion flag for Team Flow. |
| owner_id / owner_roster_id | user/roster fk | no | My Desk inbox owner. Required for personal inbox behavior; team checks may leave it empty. |
| task_id | task fk | no | Optional link after the item becomes related to an actual task. |
| author_id / author_roster_id | user/roster fk | yes/no | Writer and optional prototype roster identity. |
| created_on | date | yes | Reader-facing capture date. |
| created_at | timestamp | yes | Audit. |
| updated_at | timestamp | yes | Audit. |

`오늘 브리핑` reads `briefing_items` directly. My Desk shows only the selected person's own inbox items and lets that person change status; Team Flow shows shared todo-style rows that can be checked or deleted after confirmation. These records are the future LLM evidence layer for mail snippets, meeting reminders, ideas, risks, and team checks that are not yet full task records.

### notifications

Future backend-backed personal notification inbox. See `docs/personal-notification-inbox-plan.md` before implementing.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid pk | yes | Stable notification id. |
| recipient_user_id | uuid/text fk users.id | yes | User who should see the notification. Match the actual `users.id` type in the migration. |
| actor_user_id | uuid/text fk users.id | no | User who caused the event, when available. |
| task_id | uuid/text fk tasks.id | no | Related task for navigation. |
| source_type | text | yes | `task`, `task_update`, `task_post`, `task_change_history`, or `system`. |
| source_id | uuid/text | no | Source row id used for dedupe and navigation. |
| type | text | yes | Example: `task_assigned`, `task_overdue`, `task_update_added`, `task_post_added`, `risk_added`. |
| severity | text | yes | `low`, `normal`, `high`, or `urgent`. |
| title | text | yes | Compact list title. |
| body | text | yes | Short reader-facing summary. Avoid copying long sensitive content. |
| action_url | text | no | Optional deep link/action hint. |
| metadata | jsonb | yes | Extra structured details such as due date or event date. |
| created_at | timestamp | yes | Sort newest first. |
| read_at | timestamp | no | Set when the recipient reads it. |
| dismissed_at | timestamp | no | Set when the recipient hides it. |

Notification rule: users can read only their own notification rows and can update only their own read/dismiss state. General frontend code should not be able to arbitrarily edit notification title/body/type/source fields.

### task_links

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable link id. |
| task_id | text fk tasks.id | yes | Parent task. |
| title | text | yes | Label. |
| url | text | yes | Internal or external URL. |
| link_type | text | yes | `문서`, `보고서`, `자료`, `드라이브`, `회의록`, `링크`. |
| created_at | timestamp | yes | Audit. |

### tags and task_tags

| Table | Column | Type | Notes |
| --- | --- | --- | --- |
| tags | id | text pk | Stable tag id. |
| tags | name | text unique | Display tag. |
| tags | tone | text | Optional visual tone. |
| tags | created_by | text fk users.id | Audit. |
| task_tags | task_id | text fk tasks.id | Parent task. |
| task_tags | tag_id | text fk tags.id | Applied tag. |

Tasks should have one or more tags. All users can create and apply tags, but only admin can rename or delete shared tags.

### calendar_events

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable event id. |
| title | text | yes | Event title. |
| event_date | date | yes | Calendar date. |
| scope | enum | yes | `team`, `personal`. |
| owner_id | text fk users.id | no | Required for personal events. |
| note | text | no | Primary event detail. |
| created_by | text fk users.id | yes | Audit. |
| created_at | timestamp | yes | Audit. |
| updated_at | timestamp | yes | Audit. |

Task due items are derived from `tasks.due_date`, not duplicated as events.

### canvas_tabs, canvas_nodes, canvas_links

Canvas is a team-shared freeform thinking area. It is separate from the generated workflow mindmap.

| Table | Column | Type | Notes |
| --- | --- | --- | --- |
| canvas_tabs | id | text pk | Stable tab id such as `ideas` or `custom-...`. |
| canvas_tabs | label | text | Short tab label. |
| canvas_tabs | title | text | Canvas toolbar title. |
| canvas_tabs | description | text | Export/purpose description. |
| canvas_tabs | sort_order | integer | Tab order. |
| canvas_tabs | created_by | text fk users.id | First creator. |
| canvas_tabs | updated_by | text fk users.id | Last editor. |
| canvas_tabs | version | integer | Reserved for later conflict/history handling. |
| canvas_nodes | tab_id | text fk canvas_tabs.id | Parent tab. |
| canvas_nodes | id | text | Node id within tab. |
| canvas_nodes | title | text | Node title. |
| canvas_nodes | body | text | Card-mode body. |
| canvas_nodes | template | text | `memo`, `question`, `decision`, `action`, `todo`, `evidence`, `risk`. |
| canvas_nodes | parent_id | text | Optional parent node id for solid hierarchy links. |
| canvas_nodes | data | jsonb | Structured node payload. Todo nodes use `data.todoItems[]` with `{ id, text, done }`. |
| canvas_nodes | x | integer | Canvas plane x position. |
| canvas_nodes | y | integer | Canvas plane y position. |
| canvas_nodes | sort_order | integer | Stable order fallback. |
| canvas_nodes | created_by | text fk users.id | First creator. |
| canvas_nodes | updated_by | text fk users.id | Last editor. |
| canvas_nodes | version | integer | Reserved for later conflict/history handling. |
| canvas_links | tab_id | text fk canvas_tabs.id | Parent tab. |
| canvas_links | id | text | Link id within tab. |
| canvas_links | source_id | text | Source node id. |
| canvas_links | target_id | text | Target node id. |
| canvas_links | created_by | text fk users.id | First creator. |
| canvas_links | updated_by | text fk users.id | Last editor. |
| canvas_links | version | integer | Reserved for later conflict/history handling. |

Canvas MVP rule:

- Active signed-in users can read, insert, update, and delete shared Canvas tabs/nodes/links.
- The current shared-backend implementation should save a whole-tab snapshot after edits and refresh from the API when Canvas loads.
- Todo nodes are still Canvas-local objects, but their structured `todoItems` shape is intentionally compatible with later task detail checklist/task-linking work.
- Live cursors, simultaneous-edit conflict resolution, per-node locking, and visible change history are intentionally later collaboration features.

### personal_notes

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable note id. |
| owner_id | text fk users.id | yes | Note owner. |
| note_date | date | yes | Daily note key. |
| body | text | no | Free memo. |
| updated_at | timestamp | yes | Audit. |

### recurring_task_templates

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text pk | yes | Stable template id. |
| title | text | yes | Base task title. |
| owner_id | text fk users.id | yes | Default owner. |
| frequency | enum | yes | `weekly`, `monthly`, `quarterly`. |
| interval | integer | yes | Repeat every N weeks/months/quarters. |
| weekdays | integer[] | no | Weekly repeat days, where 0=Sunday and 1=Monday. |
| start_date | date | yes | Repeat rule start date. |
| end_date | date | no | Repeat rule end date. |
| no_end | boolean | yes | True when the rule continues indefinitely. |
| rule_detail | text | yes | Human-readable summary such as `5주마다 화요일, 목요일`. |
| duration_days | integer | yes | Length of each generated instance. |
| next_due_date | date | yes | Next generation anchor. |
| is_active | boolean | yes | Stops future generation when false. |
| created_by | text fk users.id | yes | Audit. |
| created_at | timestamp | yes | Audit. |

Generated recurring instances are normal `tasks` rows linked by `recurring_template_id`.

### user_preferences

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| user_id | text pk fk users.id | yes | Preference owner. |
| active_page | text | no | Last selected page scope. |
| active_view | text | no | Last nav view. |
| selected_tag | text | no | Last selected tag filters serialized for the frontend preference, using `전체` or delimiter-separated tag names. |
| timeline_mode | text | no | `month` or `year`. |
| timeline_month | text | no | `YYYY-MM`. |
| timeline_year | text | no | `YYYY`. |
| selected_task_id | text | no | Last selected task. |
| updated_at | timestamp | yes | Audit. |

## API Endpoints

Use `/api/v1` as the initial namespace.

### Auth and Session

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | Email/password or SSO callback. |
| POST | `/auth/logout` | user | End session. |
| GET | `/me` | user | Current user, role, profile, preferences. |
| PATCH | `/me/profile` | user | Update own profile emoji. |

### Users

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/users` | user | Team list; admin can include hidden users. |
| POST | `/users` | admin | Create account. |
| PATCH | `/users/:id` | admin | Update role/title/active state. |

### Tasks

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/tasks` | user | Role-filtered list, supports `scope`, `ownerId`, `status`, `tag`, `archived`. |
| POST | `/tasks` | user | Create own task; lead/admin can assign anyone. |
| GET | `/tasks/:id` | user | Read visible task detail. |
| PATCH | `/tasks/:id` | owner/lead/admin | Update metadata, links, tags, dates, priority, status. |
| PATCH | `/tasks/:id/status` | owner/lead/admin | Board drag/drop and status quick changes. |
| PATCH | `/tasks/:id/archive` | owner/lead/admin | Archive or restore completed/held work. |
| POST | `/tasks/:id/subtasks` | owner/lead/admin | Add subtask. |
| PATCH | `/subtasks/:id` | owner/lead/admin | Toggle or rename subtask. |
| POST | `/tasks/:id/updates` | visible user | Add update log. |
| PATCH | `/tasks/:id/updates/:updateId` | update author or task manager | Update only the update log `body`. |
| DELETE | `/tasks/:id/updates/:updateId` | update author or task manager | Delete an accidental update log row. |
| PATCH | `/tasks/:id/history/:historyId` | task manager | Update only the history row `note`. |
| DELETE | `/tasks/:id/history/:historyId` | task manager | Delete an accidental history row without changing current task state. |
| POST | `/tasks/:id/links` | owner/lead/admin | Add related link. |

### Notifications

These endpoints are future-facing and should be implemented only after the FastAPI/PostgreSQL user/task data is stable.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/notifications` | user | Return current user's notifications, newest first; supports `unreadOnly`, `limit`, and `severity`. |
| PATCH | `/notifications/:id/read` | recipient | Mark one notification as read. |
| PATCH | `/notifications/read-all` | user | Mark current user's unread notifications as read. |
| PATCH | `/notifications/:id/dismiss` | recipient | Hide one notification without deleting audit context. |

### Tags

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/tags` | user | Shared tag dictionary. |
| POST | `/tags` | user | Add tag. |
| PATCH | `/tags/:id` | admin | Rename or retone tag. |
| DELETE | `/tags/:id` | admin | Remove tag relation from tasks, keep tasks. |

### Calendar and Notes

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/calendar/events` | user | Shared team calendar entries, including team and personal schedule blocks. |
| POST | `/calendar/events` | user | Create a team event, or create a personal event for self/delegated assignee when allowed. |
| PATCH | `/calendar/events/:id` | owner/creator/lead/admin | Edit event by scope rules. |
| DELETE | `/calendar/events/:id` | owner/creator/lead/admin | Delete event by scope rules. |
| GET | `/notes/today` | user | Own note for current date. |
| PUT | `/notes/:date` | user | Upsert own note. |

### Recurring Work

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/recurring/templates` | user | Visible templates. |
| POST | `/recurring/templates` | owner/lead/admin | Create template. |
| PATCH | `/recurring/templates/:id` | owner/lead/admin | Update rule or deactivate. |
| POST | `/recurring/templates/:id/generate` | owner/lead/admin | Materialize next N task instances. |

### Reports

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/reports/performance` | user | Query by `periodType`, `periodStart`, `periodEnd`, optional `userId`. |
| POST | `/reports/performance/snapshots` | lead/admin | Freeze a generated report. |
| GET | `/reports/performance/snapshots/:id` | visible user | Read frozen report. |

### AI Agent Read API

These endpoints are read-only. They return permission-filtered evidence bundles for an approved AI agent or HERmes-style tool layer. See `docs/ai-agent-readiness.md` for answer rules, report templates, and excluded data.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/ai/read/person-work-status` | user | Query by `personId` or roster name plus period; returns visible tasks, recent updates, open checklist items, and issue signals. |
| GET | `/ai/read/topic-search` | user | Query by text plus period; searches visible task title, description, tags, workstream, updates, and task posts. |
| GET | `/ai/read/workstream-issues` | user | Query by workstream plus period; returns progress, recent updates, explicit issues, inferred signals, and source task ids. |
| GET | `/ai/read/recent-updates` | user | Query by owner/status/tag/workstream/period; returns recent update evidence sorted newest first. |
| GET | `/ai/read/report-evidence` | user | Query by report type, period, and filters; returns a report-ready evidence bundle with source ids and dates. |

Status 2026-06-26: FastAPI Phase 1 endpoints are implemented under `/api/v1/ai/read/...` for deterministic evidence bundles. They do not call OpenAI/HERmes and do not write back to the database.

### AI Wiki API

These endpoints make the LLM-Wiki layer usable from the backend without giving an AI model direct unrestricted database access. See `docs/llm-wiki-architecture-plan.md`.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/ai/wiki/search` | user | Search readable Wiki pages by query and optional `page_type`. |
| GET | `/ai/wiki/pages/{page_id}` | user | Read one Wiki page with body, revision number, source links, and outgoing links. |
| GET | `/ai/wiki/pages/{page_id}/links` | user | Follow readable incoming/outgoing typed page links. |
| GET | `/ai/wiki/pages/{page_id}/sources` | user | Return source links back to task/update/post records and stale flags. |
| GET | `/ai/wiki/drafts` | admin | List pending, rejected, approved, or all Wiki drafts for human review. |
| POST | `/ai/wiki/drafts` | user | Create a pending Wiki draft manually or from a future AI tool. |
| POST | `/ai/wiki/drafts/from-dashboard` | user | Create a deterministic pending Wiki draft from a dashboard task, its updates, and 업무 노트. |
| PATCH | `/ai/wiki/drafts/{draft_id}` | admin | Edit a pending draft's title, slug, page type, summary, or body before approval. |
| POST | `/ai/wiki/drafts/{draft_id}/approve` | admin | Publish a pending draft into `wiki_pages`, append `wiki_revisions`, and create source/link rows. |
| POST | `/ai/wiki/drafts/{draft_id}/reject` | admin | Reject a pending draft and optionally preserve a reject reason in the draft evidence JSON. |
| POST | `/ai/wiki/error-book` | user | Record a correction when an AI/Wiki answer was wrong or incomplete. |

Status 2026-06-26: FastAPI Phase 1 endpoints are implemented under `/api/v1/ai/wiki/...`, including admin draft list/edit/approve/reject. OpenAI/HERmes tool calling is not implemented yet; use the draft/approval path for any generated Wiki changes.

## Permission Enforcement

Server must enforce the same rules as `docs/permission-rules.md`.

Minimum rules:

- Members only edit tasks where they are `owner_id` or `creator_id`.
- Members can append updates to any visible team task.
- Lead/admin can edit all team tasks.
- Personal notes are readable only by owner and admin.
- Personal events are readable only by owner and admin.
- Shared tag creation is allowed for all users.
- Shared tag rename/delete is admin-only.
- Archived tasks remain report-readable.
- Notifications are personal rows: users can read only their own notifications and update only their own read/dismiss state.
- AI agent read endpoints must be read-only, permission-filtered before model access, and must exclude personal notes/private calendar data by default.

## Migration from Prototype JSON

The current `JSON 내보내기` payload can seed the backend when a legacy migration is explicitly needed. The current launch path should skip old local JSON migration and start fresh in the approved backend, so this flow is retained as an admin backup/future migration tool.

Current app behavior:

- `src/supabaseImportPlan.js` summarizes exported prototype JSON before any backend writes.
- In signed-in backend mode, `JSON 가져오기` should display the import summary and require administrator confirmation before live DB writes.
- Actual backend import execution should be merge/upsert oriented: local-id rows are inserted as new rows, same UUID rows can update, and related subtasks/links/tags/calendar events/memos/profile-roster data are written through the active store boundary.
- After a successful backend import, the browser should record a local JSON fingerprint. Selecting the same JSON again should show an additional duplicate-risk confirmation because local-id rows can be inserted again as new rows.
- If an import references local person IDs that are not present in the current people directory/team roster, the backend import must be blocked until the ID-to-person mapping is fixed. Unknown local IDs must not be auto-created as operational roster rows.

Migration order:

1. Upsert `users` from `src/data.js` or approved real user list.
2. Upsert `tags` from `availableTags`.
3. Insert each task into `tasks`.
4. Insert task subtasks into `subtasks`.
5. Insert task links into `task_links`.
6. Insert task updates into `task_updates`.
7. Insert task tag relations into `task_tags`.
8. Insert `calendarEvents` into `calendar_events`.
9. Insert `personalNotes` into `personal_notes`, keyed by owner and current date if no date exists.
10. Insert profile overrides into `users.profile_emoji`.

Validation after migration:

- Two different users see shared team tasks.
- Personal notes do not appear to other members.
- Team calendar events appear to all members.
- Personal calendar events appear only to the owner.
- Drag/drop board status changes persist after reload and another browser login.
- Subtask completion updates progress.
- Update logs sort newest first.
- Archived completed/held tasks disappear from default board but remain in archive and reports.
