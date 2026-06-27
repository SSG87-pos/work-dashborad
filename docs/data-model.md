# Backend Data Model Draft

This note describes the first backend-ready model for the research strategy work dashboard.

Current approved implementation route: **FastAPI + PostgreSQL without Docker**.

Use `docs/fastapi-postgres-backend-spec.md` as the concrete PostgreSQL schema and FastAPI implementation guide. This document explains the domain model and business rules that the backend must preserve. Supabase migrations remain useful schema references, but they are no longer the operating target while the company environment cannot run Supabase Docker.

## Users and Roles

### users

Stores login identity and profile information.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable user id. |
| email | string | Login email, unique when real auth is added. |
| name | string | Display name. |
| title | string | Team title such as 팀장, 책임, 선임, 매니저. |
| team | string | Default: 연구기획그룹-전략. |
| profile_emoji | string | User-selected emoji shown in team/profile surfaces. |
| permission_role | enum | admin, lead, member. |
| is_team_member | boolean | False for system/admin-only accounts. |
| is_active | boolean | Inactive users remain in historical records. |
| created_at | datetime | Audit field. |
| updated_at | datetime | Audit field. |

### team_roster

Stores team members before or after signup. This lets the dashboard run with real assignees before every teammate has a login account.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable roster id used by existing task data, such as `kmryu`. |
| expected_email | string nullable | Email the person is expected to use when signing up. |
| auth_user_id | user id nullable | Linked `users.id` after signup. |
| name | string | Display name. |
| title | string | Team title. |
| profile_emoji | string | Emoji avatar. |
| permission_role | enum | admin, lead, member. |
| is_team_member | boolean | Whether to show in team composition and assignee lists. |
| is_active | boolean | Inactive roster rows remain available for history. |

If a teammate signs up with an email matching `expected_email`, the auth trigger links `team_roster.auth_user_id` automatically.

### role_permissions

Can be static config at first.

| Role | Permissions |
| --- | --- |
| admin | Manage users, tags, global settings, all tasks, all calendar items, all reports. |
| lead | Create and assign team work, edit team work, archive completed/held work, add shared tags, view team reports. |
| member | Create own work, edit own work, view public team flow, add updates, add shared tags, manage own notes and personal calendar. |

## Work Data

### tasks

One row is one accountable unit of work. When two or more people share work, create one task only if there is one accountable owner and split support work into subtasks. If accountability, deadline, or deliverable differs, create separate tasks linked by shared tags or links.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable task id. |
| title | string | Task name. |
| description | text | Detail shown in task detail. |
| workstream | text nullable | Single `상위 업무흐름` used for report and mindmap grouping. Tags remain separate multi-select filter metadata. |
| owner_id | user id | Main assignee. |
| assigner_type | enum | 원장님, 소장님, 그룹장님, 팀장님, 개인, 기타. |
| assigner_id | user id nullable | Internal user who assigned or entered assignment if applicable. |
| creator_id | user id | User who registered the task. |
| status | enum | 검토/대기, 계획, 진행중, 완료, 보류. |
| priority | enum | 높음, 보통, 낮음. |
| work_kind | enum | `standard` or `spot`. `spot` marks short/one-time work; weekly/monthly reports include it, quarterly/yearly summaries exclude it unless detailed results are enabled. |
| start_date | date | Planned start. |
| due_date | date | Planned deadline. |
| completed_at | date nullable | Actual completion date. Set when status enters 완료; cleared when completion is cancelled. |
| completed_by | user id nullable | User who marked the task complete. |
| progress_before_complete | number nullable | Manual-progress fallback used when accidental completion is cancelled. |
| progress | number | Manual fallback when no subtasks exist. |
| archived_at | datetime nullable | Hidden from main board when set. |
| archived_by | user id nullable | Audit field. |
| recurring_template_id | string nullable | Links generated recurring instances. |
| owner_roster_id | roster id nullable | Main assignee before or after signup. Takes display precedence over owner_id. |
| assigner_roster_id | roster id nullable | Internal roster assigner when known. |
| creator_roster_id | roster id nullable | Roster person who registered the task. |
| created_at | datetime | Audit field. |
| updated_at | datetime | Audit field. |

### subtasks

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable subtask id. |
| task_id | task id | Parent task. |
| title | string | Checklist item. |
| done | boolean | Progress input. |
| done_at | datetime nullable | Completion audit. |
| done_by | user id nullable | Completion audit. |
| sort_order | number | Manual order. |

Task progress rule: if a task has one or more subtasks, progress equals completed subtasks divided by total subtasks. If no subtasks exist, use the task.progress field.

Completion rule: `due_date` is the plan. `completed_at` is the actual result date used for 업무실적. Moving a task out of 완료 clears the active completion fields and appends a change-history row so accidental completion does not pollute reports. Changing `due_date` also appends a change-history row.

### task_change_history

Append-first audit log for important task changes.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable change id. |
| task_id | task id | Parent task. |
| change_type | enum | status, due_date, archive, delete, recurring. |
| from_value | text nullable | Previous status or due date. |
| to_value | text | New status or due date. |
| actor_id | user id | User who changed the status. |
| note | text | Display memo. Example: 완료 처리, 완료 처리 취소, 마감일 변경. Task managers may update this field to correct accidental wording. |
| created_at | datetime | Audit field. |

Correction rule: changing the current task status, completion metadata, or due date should append a new history row. If the history row itself was created by mistake, a task manager may update only `note` or delete that history row; deleting a row does not roll back current task state.

### task_updates

Short update log entries.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable update id. |
| task_id | task id | Parent task. |
| author_id | user id | Writer. |
| body | text | Update content. The author or a task manager may update this field to correct accidental wording. |
| update_type | enum | note, issue, decision, request, completion. Optional at first. |
| created_at | datetime | Sort newest first in update view. |

Update correction rule: author and timestamp are immutable. If an update row itself was created by mistake, the author or a task manager may update only `body` or delete the row.

### task_post_categories

Admin-managed 업무 노트 classification labels.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable category id such as `decision` or `memory`. |
| label | string | Display label, for example 결정사항, 기억할 점, 리스크, 회의록. |
| tone | string | Visual tone: blue, green, amber, red, violet, slate. |
| active | boolean | Hidden categories stay available for old posts but are not offered for new writing. |
| sort_order | number | Display order. |
| created_by | user id nullable | First admin creator. |
| updated_by | user id nullable | Last admin editor. |

Category rule: admins can add, rename, recolor, hide, and delete category rows. Renaming a category should update existing `task_posts.scope` values so old posts keep the expected visible label.

### task_posts

Task-level remembered-context posts used by `업무 노트` and the Highlights `업무흐름별 게시글 모음`.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable post id. |
| task_id | task id | Parent task. |
| scope | string | Category label at display time, such as 결정사항 or 중요문서. |
| title | string | Title-first list label. |
| body | text | Main post body. |
| url | string nullable | Optional Teams, document, or reference URL. |
| attachment | json object nullable | Placeholder metadata for future Storage-backed files. |
| author_id | user id | Writer. |
| posted_at | date | Reader-facing post date. |
| created_at | datetime | Creation timestamp. |
| updated_at | datetime | Last body/title/category correction timestamp. |

Post rule: visible task posts are readable by authenticated users who can see the parent task. Authors or task managers can edit/delete a post. Attachments are metadata-only until Supabase Storage policies are added.

### briefing_items

Structured Today Briefing capture records. My Desk renders inbox-style records for mail, meeting notes, ideas, risks, references, todos, and short notes. Team Flow renders todo-style records for small shared checks.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable local/Supabase id. |
| scope | string | `my` or `team`. |
| kind | string | `inbox` for My Desk, `todo` for Team Flow. |
| item_type | string | mail, meeting, idea, risk, reference, todo, note. |
| title | string | Compact list title. |
| body | text nullable | Remembered context body. |
| url | string nullable | Optional mail/document/Teams/reference URL. |
| status | string | My Desk: new, reviewing, converted, archived. Team: open, done. |
| done | boolean | Team checklist completion flag. |
| owner_id / owner_roster_id | user/roster id nullable | My Desk inbox owner. Required for personal inbox behavior; team checks may leave it empty. |
| task_id | task id nullable | Optional link once the item becomes related to a task. |
| author_id / author_roster_id | user/roster id | Writer. |
| created_on | date | Reader-facing capture date. |
| created_at / updated_at | datetime | Audit. |

LLM rule: `briefing_items` are useful as raw evidence for future AI briefing, search, and next-action suggestions. Personal My Desk inbox items are scoped to their owner and should not be included in team reports unless the user explicitly promotes or links them. Team Check items are shared team records.

### notifications

Future personal notification inbox used by the top bell icon. Implement after FastAPI/PostgreSQL auth, roster, tasks, update logs, and 업무 노트 persistence are stable. Phase 1 should stay high-signal and personal: newly assigned work, overdue owned work, and logs/notes/risk notes left by someone else on the recipient's own work. See `docs/personal-notification-inbox-plan.md`.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Stable notification id. |
| recipient_user_id | user id | User who should see this notification. |
| actor_user_id | user id nullable | User who caused the event. |
| task_id | task id nullable | Related task for click-through navigation. |
| source_type | string | task, task_update, task_post, task_change_history, or system. |
| source_id | string/uuid nullable | Source row id used for dedupe. |
| type | enum/string | Phase 1: task_assigned, task_overdue, task_update_added, task_post_added, risk_added. Later: due-soon, decision-needed, mention, and related event types. |
| severity | enum/string | low, normal, high, urgent. |
| title | string | Compact notification title. |
| body | text | Short summary, not a full copy of sensitive detail. |
| action_url | string nullable | Optional deep-link/action hint. |
| metadata | json object | Extra event-specific details. |
| created_at | datetime | Sort newest first. |
| read_at | datetime nullable | Set when recipient reads the notification. |
| dismissed_at | datetime nullable | Set when recipient hides the notification. |

Notification rule: recipients can read only their own notifications. Recipients can update only `read_at` and `dismissed_at`. Alert row creation should happen through the storage/API boundary, not directly from arbitrary view code.

### task_links

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable link id. |
| task_id | task id | Parent task. |
| title | string | Link label. |
| url | string | Internal or external URL. |
| link_type | string | 문서, 보고서, 자료, 드라이브, 회의록, 링크. |

## Tags

### tags

Shared team tag dictionary.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable tag id. |
| name | string | Unique display name. |
| tone | string | Optional visual tone. |
| created_by | user id | Audit field. |
| created_at | datetime | Audit field. |
| updated_at | datetime | Audit field. |

### task_tags

Many-to-many relation between tasks and tags.

| Field | Type | Notes |
| --- | --- | --- |
| task_id | task id | Parent task. |
| tag_id | tag id | Tag. |

Tasks must have at least one tag.

Tag permission rule: all users can create and apply tags, but only admin can rename or delete shared tags.

## Calendar and Notes

### calendar_events

Stores non-task schedules. Task due dates are derived from tasks and do not need duplicate event rows.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable event id. |
| title | string | Event title. |
| event_date | date | Event date. |
| scope | enum | team, personal. |
| owner_id | user id | Required for personal events; optional owner for team events. |
| note | text | Primary detail shown in calendar detail. |
| created_by | user id | Audit field. |
| created_at | datetime | Audit field. |
| updated_at | datetime | Audit field. |

Privacy rule: personal events are visible only to owner_id and admin unless explicitly shared later.

### dashboard_memos

Stores the shared memo surface shown in the dashboard side panels.

| Field | Type | Notes |
| --- | --- | --- |
| page_key | string | `my` or `team`. |
| body | text | Shared memo content for that dashboard page. |
| updated_by | user id | Last editor. |
| updated_at | datetime | Audit field. |

Dashboard memo rule: these memos are shared by page context, not private personal notes. Any signed-in team user can update them.

## Canvas

### canvas_tabs

Stores team-shared Canvas spaces. The default app tab is `ideas`, but users can create additional tabs.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable Canvas tab id such as `ideas` or `custom-...`. |
| label | string | Short tab label. |
| title | string | Canvas title shown in the toolbar. |
| description | text | Short purpose text used in Markdown export. |
| sort_order | number | Tab order. |
| created_by | user id nullable | First creator when inserted through Supabase. |
| updated_by | user id nullable | Last editor. |
| version | number | Reserved for future conflict/history handling. |
| created_at | datetime | Audit field. |
| updated_at | datetime | Audit field. |

### canvas_nodes

Stores editable freeform nodes per Canvas tab.

| Field | Type | Notes |
| --- | --- | --- |
| tab_id | string | Parent `canvas_tabs.id`. |
| id | string | Stable node id within the tab. |
| title | string | Node title. |
| body | text | Node body in card mode. |
| template | string | memo, question, decision, action, todo, evidence, or risk. |
| parent_id | string nullable | Parent node id for solid parent-child connectors. |
| data | object | Structured node payload. Todo nodes store `todoItems: [{ id, text, done }]`. |
| x | number | Position on the Canvas plane. |
| y | number | Position on the Canvas plane. |
| sort_order | number | Stable display order fallback. |
| created_by | user id nullable | First creator. |
| updated_by | user id nullable | Last editor. |
| version | number | Reserved for future conflict/history handling. |
| created_at | datetime | Audit field. |
| updated_at | datetime | Audit field. |

### canvas_links

Stores direct related-node links. Parent-child hierarchy stays in `canvas_nodes.parent_id`.

| Field | Type | Notes |
| --- | --- | --- |
| tab_id | string | Parent `canvas_tabs.id`. |
| id | string | Stable link id within the tab. |
| source_id | string | Source node id. |
| target_id | string | Target node id. |
| created_by | user id nullable | First creator. |
| updated_by | user id nullable | Last editor. |
| version | number | Reserved for future conflict/history handling. |
| created_at | datetime | Audit field. |
| updated_at | datetime | Audit field. |

Canvas sharing rule: active signed-in team users can read and write the shared Canvas MVP. Todo checklist items are stored as structured node data so a later phase can connect them to task detail checklists. This is refresh-based shared storage. Live cursors, concurrent edit conflict resolution, and visible change history are later collaboration layers.

### personal_notes

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable note id. |
| owner_id | user id | Note owner. |
| note_date | date | Daily note key. |
| body | text | Free memo. |
| updated_at | datetime | Audit field. |

Privacy rule: personal notes are visible only to owner_id and admin.

## Recurring Work

The current app keeps the visible recurring source item in `tasks` and stores its repeat rule on that same task row (`recurring_frequency`, interval, weekdays, start/end, no-end, rule detail, duration). Future generated instances can still point back to a source through `recurring_template_id`.

### recurring_task_templates

Reserved for a later automation worker if recurring generation needs a separate scheduler-managed template table.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable template id. |
| title | string | Base task title. |
| owner_id | user id | Default owner. |
| frequency | enum | weekly, monthly, quarterly. |
| interval | number | Repeat every N weeks/months/quarters. |
| weekdays | number array | Weekly repeat days, where 0=Sunday and 1=Monday. Empty for month/quarter rules at first. |
| start_date | date | Repeat rule start date. |
| end_date | date nullable | Repeat rule end date. |
| no_end | boolean | True when the rule continues indefinitely. |
| rule_detail | string | Human-readable summary such as 5주마다 화요일, 목요일. |
| duration_days | number | Length of each generated work instance. |
| next_due_date | date | Next generation anchor. |
| is_active | boolean | Stops future generation when false. |
| created_by | user id | Audit field. |

### recurring_task_instances

Generated task instances should be normal tasks linked to recurring_template_id. Completion, archive, subtasks, and updates belong to each generated instance, not only to the template.

## Performance Reporting

### performance_snapshots

Optional cached report output. The app can initially compute reports live from tasks, subtasks, and updates. Snapshots become useful when reports must be frozen after weekly/monthly submission.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable snapshot id. |
| period_type | enum | week, month, quarter, year. |
| period_start | date | Inclusive. |
| period_end | date | Inclusive. |
| user_id | user id nullable | Null for team snapshot. |
| body_json | json | Rendered report rows and source ids. |
| created_by | user id | User who froze/exported report. |
| created_at | datetime | Audit field. |

Report source rule: use actual completion dates for completed work, task planned dates for open work, completed subtasks, updates created in the period, task change history, and archived completion. Keep source task/update/change ids so the generated report is explainable.

## AI-Readable Work Knowledge

Future AI/HERmes integrations should not read arbitrary UI state or unrestricted database tables. They should read a permission-filtered projection built from the operational model.

Recommended evidence fields:

| Field | Source | Notes |
| --- | --- | --- |
| task id/title/status/priority | tasks | Basic cited unit for every answer. |
| owner/creator/assignee names | users, team_roster | Use display names only unless a workflow needs ids. |
| workstream | tasks.workstream | Primary grouping for topic and report answers. |
| tags | tags, task_tags | Secondary search/filter metadata. |
| due/completed dates | tasks | Used for overdue, recent completion, and report-period logic. |
| checklist progress | subtasks or tasks.progress | Used for progress and open-action summaries. |
| recent updates | task_updates | Main source for current progress and issues. |
| change history | task_change_history | Source for status, due-date, archive, and correction context. |
| task posts | task_posts | Source for decisions, risks, meeting notes, and remembered context. |
| report source ids | performance_snapshots.body_json or live report query | Required for explainable generated reports. |

Excluded by default:

- personal_notes
- private calendar event notes
- hidden/admin-only users unless the requester has admin scope
- raw service credentials or backend secrets

AI report drafts must preserve source task/update/change/post ids or titles and dates so a human reviewer can trace every claim.
