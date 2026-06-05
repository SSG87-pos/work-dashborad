-- Let a teammate manage pre-created work after their signup email links to a
-- team_roster row.

create or replace function public.can_manage_task(task_row public.tasks)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_lead_or_admin()
    or task_row.owner_id = auth.uid()
    or task_row.creator_id = auth.uid()
    or exists (
      select 1
      from public.team_roster r
      where r.id in (task_row.owner_roster_id, task_row.creator_roster_id)
        and r.auth_user_id = auth.uid()
    ),
    false
  )
$$;
