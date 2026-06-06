-- Move RLS helper functions out of the API-exposed public schema and tighten
-- shared dashboard memo writes.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_permission_role()
returns public.permission_role
language sql
stable
security definer
set search_path = public
as $$
  select permission_role
  from public.users
  where id = auth.uid()
$$;

create or replace function private.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select is_active
    from public.users
    where id = auth.uid()
  ), false)
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_permission_role() = 'admin', false)
$$;

create or replace function private.is_lead_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_permission_role() in ('lead', 'admin'), false)
$$;

create or replace function private.can_manage_task(task_row public.tasks)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    private.is_lead_or_admin()
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

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
grant execute on function private.current_permission_role() to authenticated;
grant execute on function private.current_user_is_active() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_lead_or_admin() to authenticated;
grant execute on function private.can_manage_task(public.tasks) to authenticated;

revoke execute on function public.current_permission_role() from public, anon, authenticated;
revoke execute on function public.current_user_is_active() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_lead_or_admin() from public, anon, authenticated;
revoke execute on function public.can_manage_task(public.tasks) from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

drop policy if exists users_read_team on public.users;
drop policy if exists users_update_self_profile on public.users;
create policy users_read_team on public.users
  for select to authenticated
  using (is_active or (select private.is_admin()));
create policy users_update_self_profile on public.users
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (select private.is_admin())
    or (
      id = (select auth.uid())
      and permission_role = (select private.current_permission_role())
      and is_active = (select private.current_user_is_active())
    )
  );

drop policy if exists team_roster_read_active on public.team_roster;
drop policy if exists team_roster_insert_admin on public.team_roster;
drop policy if exists team_roster_update_admin on public.team_roster;
drop policy if exists team_roster_delete_admin on public.team_roster;
create policy team_roster_read_active on public.team_roster
  for select to authenticated
  using (is_active or (select private.is_admin()));
create policy team_roster_insert_admin on public.team_roster
  for insert to authenticated
  with check ((select private.is_admin()));
create policy team_roster_update_admin on public.team_roster
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy team_roster_delete_admin on public.team_roster
  for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists tags_insert_all on public.tags;
drop policy if exists tags_admin_update on public.tags;
drop policy if exists tags_admin_delete on public.tags;
create policy tags_insert_all on public.tags
  for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy tags_admin_update on public.tags
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy tags_admin_delete on public.tags
  for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists tag_groups_insert_admin on public.tag_groups;
drop policy if exists tag_groups_update_admin on public.tag_groups;
drop policy if exists tag_groups_delete_admin on public.tag_groups;
create policy tag_groups_insert_admin on public.tag_groups
  for insert to authenticated
  with check ((select private.is_admin()));
create policy tag_groups_update_admin on public.tag_groups
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy tag_groups_delete_admin on public.tag_groups
  for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists tasks_insert_owner_or_lead on public.tasks;
drop policy if exists tasks_update_manager on public.tasks;
drop policy if exists tasks_delete_manager on public.tasks;
create policy tasks_insert_owner_or_lead on public.tasks
  for insert to authenticated
  with check (
    creator_id = (select auth.uid())
    and (owner_id = (select auth.uid()) or (select private.is_lead_or_admin()))
  );
create policy tasks_update_manager on public.tasks
  for update to authenticated
  using (private.can_manage_task(tasks))
  with check (private.can_manage_task(tasks));
create policy tasks_delete_manager on public.tasks
  for delete to authenticated
  using (private.can_manage_task(tasks));

drop policy if exists subtasks_manage_task_manager on public.subtasks;
create policy subtasks_manage_task_manager on public.subtasks
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t)));

drop policy if exists updates_insert_visible on public.task_updates;
create policy updates_insert_visible on public.task_updates
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id)
  );

drop policy if exists links_manage_task_manager on public.task_links;
create policy links_manage_task_manager on public.task_links
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t)))
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );

drop policy if exists task_tags_manage_task_manager on public.task_tags;
create policy task_tags_manage_task_manager on public.task_tags
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t)))
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );

drop policy if exists history_insert_task_manager on public.task_change_history;
create policy history_insert_task_manager on public.task_change_history
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );

drop policy if exists calendar_insert_by_scope on public.calendar_events;
drop policy if exists calendar_update_by_scope on public.calendar_events;
drop policy if exists calendar_delete_by_scope on public.calendar_events;
create policy calendar_insert_by_scope on public.calendar_events
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      scope = 'team'::public.calendar_scope
      or owner_id = (select auth.uid())
      or (select private.is_lead_or_admin())
      or exists (
        select 1 from public.team_roster r
        where r.id = owner_roster_id
          and r.auth_user_id = (select auth.uid())
      )
    )
  );
create policy calendar_update_by_scope on public.calendar_events
  for update to authenticated
  using (
    (select private.is_lead_or_admin())
    or created_by = (select auth.uid())
    or owner_id = (select auth.uid())
    or exists (
      select 1 from public.team_roster r
      where r.id = owner_roster_id
        and r.auth_user_id = (select auth.uid())
    )
  )
  with check (
    (select private.is_lead_or_admin())
    or created_by = (select auth.uid())
    or owner_id = (select auth.uid())
    or exists (
      select 1 from public.team_roster r
      where r.id = owner_roster_id
        and r.auth_user_id = (select auth.uid())
    )
  );
create policy calendar_delete_by_scope on public.calendar_events
  for delete to authenticated
  using (
    (select private.is_lead_or_admin())
    or created_by = (select auth.uid())
    or owner_id = (select auth.uid())
    or exists (
      select 1 from public.team_roster r
      where r.id = owner_roster_id
        and r.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists dashboard_memos_read_all on public.dashboard_memos;
drop policy if exists dashboard_memos_write_all on public.dashboard_memos;
drop policy if exists dashboard_memos_select_active on public.dashboard_memos;
drop policy if exists dashboard_memos_insert_active on public.dashboard_memos;
drop policy if exists dashboard_memos_update_active on public.dashboard_memos;
create policy dashboard_memos_select_active on public.dashboard_memos
  for select to authenticated
  using ((select private.current_user_is_active()));
create policy dashboard_memos_insert_active on public.dashboard_memos
  for insert to authenticated
  with check (
    (select private.current_user_is_active())
    and updated_by = (select auth.uid())
    and page_key in ('my', 'team')
  );
create policy dashboard_memos_update_active on public.dashboard_memos
  for update to authenticated
  using ((select private.current_user_is_active()))
  with check (
    (select private.current_user_is_active())
    and updated_by = (select auth.uid())
    and page_key in ('my', 'team')
  );

drop policy if exists personal_notes_read_owner_or_admin on public.personal_notes;
drop policy if exists personal_notes_write_owner_or_admin on public.personal_notes;
create policy personal_notes_read_owner_or_admin on public.personal_notes
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy personal_notes_write_owner_or_admin on public.personal_notes
  for all to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()))
  with check (owner_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists recurring_insert_owner_or_lead on public.recurring_task_templates;
drop policy if exists recurring_update_manager on public.recurring_task_templates;
create policy recurring_insert_owner_or_lead on public.recurring_task_templates
  for insert to authenticated
  with check (
    creator_id = (select auth.uid())
    and (owner_id = (select auth.uid()) or (select private.is_lead_or_admin()))
  );
create policy recurring_update_manager on public.recurring_task_templates
  for update to authenticated
  using (owner_id = (select auth.uid()) or creator_id = (select auth.uid()) or (select private.is_lead_or_admin()))
  with check (owner_id = (select auth.uid()) or creator_id = (select auth.uid()) or (select private.is_lead_or_admin()));

drop policy if exists preferences_owner on public.user_preferences;
create policy preferences_owner on public.user_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
