-- Split broad FOR ALL manage policies into write-specific policies so SELECT
-- paths do not evaluate both read and manage policies.

drop policy if exists personal_notes_write_owner_or_admin on public.personal_notes;
drop policy if exists personal_notes_insert_owner_or_admin on public.personal_notes;
drop policy if exists personal_notes_update_owner_or_admin on public.personal_notes;
drop policy if exists personal_notes_delete_owner_or_admin on public.personal_notes;
create policy personal_notes_insert_owner_or_admin on public.personal_notes
  for insert to authenticated
  with check (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy personal_notes_update_owner_or_admin on public.personal_notes
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()))
  with check (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy personal_notes_delete_owner_or_admin on public.personal_notes
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists subtasks_manage_task_manager on public.subtasks;
drop policy if exists subtasks_insert_task_manager on public.subtasks;
drop policy if exists subtasks_update_task_manager on public.subtasks;
drop policy if exists subtasks_delete_task_manager on public.subtasks;
create policy subtasks_insert_task_manager on public.subtasks
  for insert to authenticated
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
create policy subtasks_update_task_manager on public.subtasks
  for update to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  )
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
create policy subtasks_delete_task_manager on public.subtasks
  for delete to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );

drop policy if exists links_manage_task_manager on public.task_links;
drop policy if exists links_insert_task_manager on public.task_links;
drop policy if exists links_update_task_manager on public.task_links;
drop policy if exists links_delete_task_manager on public.task_links;
create policy links_insert_task_manager on public.task_links
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
create policy links_update_task_manager on public.task_links
  for update to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  )
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
create policy links_delete_task_manager on public.task_links
  for delete to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );

drop policy if exists task_tags_manage_task_manager on public.task_tags;
drop policy if exists task_tags_insert_task_manager on public.task_tags;
drop policy if exists task_tags_update_task_manager on public.task_tags;
drop policy if exists task_tags_delete_task_manager on public.task_tags;
create policy task_tags_insert_task_manager on public.task_tags
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
create policy task_tags_update_task_manager on public.task_tags
  for update to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  )
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
create policy task_tags_delete_task_manager on public.task_tags
  for delete to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
