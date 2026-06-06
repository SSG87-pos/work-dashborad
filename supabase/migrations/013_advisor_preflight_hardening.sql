-- Preflight hardening from Supabase advisors.
-- This migration is intentionally limited to low-risk function metadata and
-- covering indexes. SECURITY DEFINER execute grants need a separate role/RLS
-- test pass before live application.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists calendar_events_created_by_idx
  on public.calendar_events(created_by);
create index if not exists calendar_events_owner_id_idx
  on public.calendar_events(owner_id)
  where owner_id is not null;
create index if not exists calendar_events_owner_roster_id_idx
  on public.calendar_events(owner_roster_id)
  where owner_roster_id is not null;

create index if not exists dashboard_memos_updated_by_idx
  on public.dashboard_memos(updated_by)
  where updated_by is not null;

create index if not exists recurring_task_templates_assigner_id_idx
  on public.recurring_task_templates(assigner_id)
  where assigner_id is not null;
create index if not exists recurring_task_templates_creator_id_idx
  on public.recurring_task_templates(creator_id);
create index if not exists recurring_task_templates_owner_id_idx
  on public.recurring_task_templates(owner_id);

create index if not exists subtasks_done_by_idx
  on public.subtasks(done_by)
  where done_by is not null;

create index if not exists tag_groups_created_by_idx
  on public.tag_groups(created_by)
  where created_by is not null;
create index if not exists tags_created_by_idx
  on public.tags(created_by)
  where created_by is not null;

create index if not exists task_change_history_actor_id_idx
  on public.task_change_history(actor_id);

create index if not exists task_links_created_by_idx
  on public.task_links(created_by)
  where created_by is not null;
create index if not exists task_links_task_id_idx
  on public.task_links(task_id);

create index if not exists task_tags_created_by_idx
  on public.task_tags(created_by)
  where created_by is not null;

create index if not exists tasks_archived_by_idx
  on public.tasks(archived_by)
  where archived_by is not null;
create index if not exists tasks_assigner_id_idx
  on public.tasks(assigner_id)
  where assigner_id is not null;
create index if not exists tasks_assigner_roster_id_idx
  on public.tasks(assigner_roster_id)
  where assigner_roster_id is not null;
create index if not exists tasks_completed_by_idx
  on public.tasks(completed_by)
  where completed_by is not null;
create index if not exists tasks_creator_id_idx
  on public.tasks(creator_id);
create index if not exists tasks_creator_roster_id_idx
  on public.tasks(creator_roster_id)
  where creator_roster_id is not null;
