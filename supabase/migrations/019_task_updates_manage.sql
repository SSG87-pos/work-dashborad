-- Allow update-log authors or task managers to correct accidental update logs.
-- Updates are intentionally limited to the body text; author and timestamp stay immutable.

grant update (body), delete on public.task_updates to authenticated;

drop policy if exists updates_update_author_or_task_manager on public.task_updates;
create policy updates_update_author_or_task_manager on public.task_updates
  for update to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  )
  with check (
    author_id = (select auth.uid())
    or exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );

drop policy if exists updates_delete_author_or_task_manager on public.task_updates;
create policy updates_delete_author_or_task_manager on public.task_updates
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
