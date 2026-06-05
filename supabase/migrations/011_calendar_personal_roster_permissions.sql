-- Support shared calendar visibility and delegated personal calendar entries.
-- Calendar entries are shared with the whole team, while edit/delete rights
-- remain limited to the creator, the target person, or lead/admin users.

drop policy if exists calendar_read_by_scope on public.calendar_events;
drop policy if exists calendar_insert_by_scope on public.calendar_events;
drop policy if exists calendar_update_by_scope on public.calendar_events;
drop policy if exists calendar_delete_by_scope on public.calendar_events;

create policy calendar_read_by_scope on public.calendar_events
  for select to authenticated
  using (true);

create policy calendar_insert_by_scope on public.calendar_events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      scope = 'team'
      or owner_id = auth.uid()
      or public.is_lead_or_admin()
      or exists (
        select 1
        from public.team_roster r
        where r.id = owner_roster_id
          and r.auth_user_id = auth.uid()
      )
    )
  );

create policy calendar_update_by_scope on public.calendar_events
  for update to authenticated
  using (
    public.is_lead_or_admin()
    or created_by = auth.uid()
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.team_roster r
      where r.id = owner_roster_id
        and r.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_lead_or_admin()
    or created_by = auth.uid()
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.team_roster r
      where r.id = owner_roster_id
        and r.auth_user_id = auth.uid()
    )
  );

create policy calendar_delete_by_scope on public.calendar_events
  for delete to authenticated
  using (
    public.is_lead_or_admin()
    or created_by = auth.uid()
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.team_roster r
      where r.id = owner_roster_id
        and r.auth_user_id = auth.uid()
    )
  );
