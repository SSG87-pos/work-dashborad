# Permission Rules

This note defines the production permission model for the shared work dashboard. The current React prototype enforces these rules only in the UI. A real backend must enforce the same rules on every read and write endpoint.

## Roles

### admin

System administrator account. Not part of the visible team composition.

Allowed:

- Manage all users and permission roles.
- Manage all shared tags.
- Read, create, update, archive, and restore all tasks.
- Read and update all calendar events.
- Read all reports.
- Read personal notes only for support/admin purposes when explicitly needed.

### lead

Team leader account.

Allowed:

- Create tasks for any team member.
- Update status, owner, priority, dates, tags, links, subtasks, and archive state for team tasks.
- Add shared tags.
- Read team calendar and public team workflow.
- Add update logs to any team task.
- Read team performance reports.

Restricted:

- Cannot change admin accounts.
- Cannot rename or delete shared tags unless separately granted admin permission.
- Cannot read member personal notes.
- Cannot read member personal calendar events unless those events are team-scoped.

### member

Team member account.

Allowed:

- Read public team workflow.
- Create own tasks.
- Create a task assigned to another person only when explicitly marked as a request or handoff; production UI should make this uncommon.
- Edit tasks where the member is owner or creator.
- Add update logs to visible team tasks.
- Manage own personal calendar events and personal notes.
- Read own performance data and public team report summaries.

Restricted:

- Cannot rename or delete shared tags.
- Cannot change another person's profile or permission role.
- Cannot archive another person's task unless they created it and still own the work handoff.
- Cannot read another person's personal notes or personal calendar events.

## Task Ownership Rules

Use these fields consistently:

- `owner_id`: accountable assignee.
- `creator_id`: person who registered the task.
- `assigner_type`: source category, such as 원장님, 소장님, 그룹장님, 팀장님, 개인, 기타.
- `assigner_id`: internal person who assigned or entered the assignment, when applicable.

When a team leader assigns work, `creator_id` and `assigner_id` can both be the leader, while `owner_id` is the assignee.

When a member registers work assigned by a leader, set:

- `owner_id`: the member
- `creator_id`: the member
- `assigner_type`: 팀장님
- `assigner_id`: the leader, if known

If the exact assigner person is not known, keep `assigner_type` and leave `assigner_id` blank.

## Multi-Assignee Work

Prefer one accountable owner per task.

Use subtasks when:

- one person owns the final deliverable
- other people contribute support work
- all work shares the same due date and output

Create separate tasks when:

- owners have different deliverables
- due dates differ
- progress should be tracked independently
- one person's completion should not imply another person's completion

Connect related tasks with shared tags and related links.

## Archive Rules

Completed and held tasks can be archived.

Allowed archive actions:

- admin: any task
- lead: any team task
- member: own task or created task, subject to team policy

Archived tasks remain readable in 보관함 and reports. They are hidden from main board, briefing, and default timeline views.

## Calendar Rules

Team events:

- visible to all team members
- editable by admin, lead, or event creator

Personal events:

- visible in the shared calendar so the team can coordinate schedules
- editable only by owner, creator, lead, or admin

Task due dates appear in the calendar as derived work items and are edited through task detail, not calendar event editing.

## Update Log Rules

Update logs are append-first records.

Allowed:

- visible team task updates can be added by admin, lead, and members
- update authors or task managers can correct the update body
- update authors or task managers can delete an accidental update row
- update author and timestamp should be immutable after creation

Editing update logs must be limited to the body text. Editing or deleting an update row must not change task status, task history, author, or timestamp.

## Task Post Rules

업무 노트 posts are task-level remembered-context records, not chat messages.

Allowed:

- authenticated users can read posts for visible team tasks
- members can add posts to visible team tasks
- post authors can edit or delete their own posts
- task managers can edit or delete posts attached to tasks they manage
- admin users can manage post category labels, tones, and active/hidden state

Restricted:

- editing or deleting a post must not change task status, task history, update logs, or due dates
- non-admin users cannot rename or hide shared post categories
- attachment file access requires separate Storage policies before real files are stored

## Notification Rules

Future dashboard notifications are personal read-state records. They tell each user what changed in work they need to see.

Allowed:

- authenticated users can read their own notification rows
- authenticated users can update only their own `read_at` and `dismissed_at`
- notification rows can link to visible tasks, update logs, change history rows, or 업무 노트 posts
- high-signal notification types can later be bridged to Teams after company approval

Restricted:

- users cannot read another user's notification inbox
- users cannot change another user's read state
- ordinary frontend code cannot arbitrarily edit notification title, body, type, severity, recipient, or source fields
- Teams delivery must not bypass dashboard RLS or expose private data in channel messages

## Task Change History Rules

Task change history is append-first and should usually represent status, due-date, archive, delete, and recurring-instance events.

Allowed:

- task managers can update only a history row's display note
- task managers can delete an accidental history row

Restricted:

- editing or deleting a history row must not change the current task status, due date, completion metadata, or archive state
- members who cannot manage the task cannot edit or delete its history rows

## Tag Rules

Tags are shared team metadata.

Allowed:

- all users can create shared tags
- admin can rename and delete shared tags
- all users can apply existing tags to tasks they can edit

When deleting a tag, remove the task relation but do not delete the task.

## Report Rules

Members can see their own detailed performance rows.

Lead and admin can see team-wide performance rows.

If future reports include personal notes or private calendar data, those fields must be opt-in and excluded by default.

## AI Agent Read Rules

Future AI/HERmes access is read-only by default.

Allowed:

- Read only data the requesting user could read through the normal dashboard.
- Query visible tasks, subtasks, updates, change history, links, task-level posts, tags, workstreams, roster display names, and report evidence.
- Generate draft answers and draft reports with source task/update dates.

Restricted:

- Cannot create, update, archive, delete, or assign work without a separately approved write workflow.
- Cannot bypass RLS or use service-role credentials from the frontend/model runtime.
- Cannot read personal notes by default.
- Cannot read private calendar event detail unless a future permission change explicitly allows it.
- Cannot present personnel evaluation, blame, or HR-sensitive judgments as facts from ordinary task data.

AI outputs must distinguish recorded facts from inferred signals and should say `최근 기록 부족` when source updates are stale or missing.
