-- Keep a hidden tombstone for a single skipped/deleted recurring occurrence.
-- This prevents the recurrence generator from recreating that date while
-- keeping the original recurring rule and other occurrences intact.

alter table public.tasks
  add column if not exists deleted_at timestamptz;

create index if not exists tasks_recurring_template_due_deleted_idx
  on public.tasks(recurring_template_id, due_date, deleted_at)
  where recurring_template_id is not null;
