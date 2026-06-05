-- Persist the dashboard's recurring task rules on the task row itself.
-- The existing app treats the visible recurring work item as the canonical task,
-- while generated future occurrences remain linked through recurring_template_id.

alter table public.tasks
  add column if not exists recurring_frequency public.recurring_frequency,
  add column if not exists recurring_interval integer check (recurring_interval >= 1),
  add column if not exists recurring_weekdays integer[] not null default '{}',
  add column if not exists recurring_start_date date,
  add column if not exists recurring_end_date date,
  add column if not exists recurring_no_end boolean not null default false,
  add column if not exists recurring_rule_detail text,
  add column if not exists recurring_duration_days integer not null default 1 check (recurring_duration_days between 1 and 31);

create index if not exists tasks_recurring_frequency_idx
  on public.tasks(recurring_frequency)
  where recurring_frequency is not null;
