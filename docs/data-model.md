# Backend Data Model Draft

This note describes the first backend-ready model for the research strategy work dashboard. It is intentionally implementation-neutral so it can map to a BaaS table model, REST API, or a relational database later.

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

Append-only audit log for important task changes.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable change id. |
| task_id | task id | Parent task. |
| change_type | enum | status, due_date. |
| from_value | text nullable | Previous status or due date. |
| to_value | text | New status or due date. |
| actor_id | user id | User who changed the status. |
| note | text | Example: 완료 처리, 완료 처리 취소, 마감일 변경. |
| created_at | datetime | Audit field. |

### task_updates

Short update log entries.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Stable update id. |
| task_id | task id | Parent task. |
| author_id | user id | Writer. |
| body | text | Update content. |
| update_type | enum | note, issue, decision, request, completion. Optional at first. |
| created_at | datetime | Sort newest first in update view. |

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
| template | string | memo, question, decision, action, evidence, or risk. |
| parent_id | string nullable | Parent node id for solid parent-child connectors. |
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

Canvas sharing rule: active signed-in team users can read and write the shared Canvas MVP. This is refresh-based shared storage. Live cursors, concurrent edit conflict resolution, and visible change history are later collaboration layers.

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
