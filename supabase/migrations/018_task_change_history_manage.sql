-- Allow task managers to correct accidental task change-history entries.
-- Updates are intentionally limited to the display note; deleting a history row
-- does not change the current task status.

grant update (note), delete on public.task_change_history to authenticated;

drop policy if exists history_update_task_manager on public.task_change_history;
create policy history_update_task_manager on public.task_change_history
  for update to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  )
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );

drop policy if exists history_delete_task_manager on public.task_change_history;
create policy history_delete_task_manager on public.task_change_history
  for delete to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
