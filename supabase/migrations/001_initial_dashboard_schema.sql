-- Research Strategy Work Dashboard
-- Initial Supabase/Postgres schema for the shared dashboard.
-- Auth policy:
-- - Anyone who can sign up is created as a member by default.
-- - Admin permission is assigned separately after signup.
-- - Future internal SSO can map into the same public.users profile table.

create extension if not exists pgcrypto;

create type public.permission_role as enum ('admin', 'lead', 'member');
create type public.task_status as enum ('검토/대기', '계획', '진행중', '완료', '보류');
create type public.task_priority as enum ('높음', '보통', '낮음');
create type public.assigner_type as enum ('원장님', '소장님', '그룹장님', '팀장님', '개인', '기타');
create type public.calendar_scope as enum ('team', 'personal');
create type public.recurring_frequency as enum ('weekly', 'monthly', 'quarterly');
create type public.change_type as enum ('status', 'due_date', 'archive', 'delete', 'recurring');
create type public.update_type as enum ('note', 'issue', 'decision', 'request', 'completion');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  title text not null default '팀원',
  team text not null default '연구기획그룹-전략',
  profile_emoji text not null default '🌿',
  permission_role public.permission_role not null default 'member',
  is_team_member boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_roster (
  id text primary key,
  expected_email text unique,
  auth_user_id uuid unique references public.users(id) on delete set null,
  name text not null,
  title text not null default '팀원',
  profile_emoji text not null default '🌿',
  permission_role public.permission_role not null default 'member',
  is_team_member boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  tone text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid not null references public.users(id),
  assigner_type public.assigner_type not null default '개인',
  assigner_id uuid references public.users(id),
  creator_id uuid not null references public.users(id),
  status public.task_status not null default '계획',
  priority public.task_priority not null default '보통',
  start_date date not null,
  due_date date not null,
  completed_at date,
  completed_by uuid references public.users(id),
  progress_before_complete integer,
  progress integer not null default 0 check (progress between 0 and 100),
  archived_at timestamptz,
  archived_by uuid references public.users(id),
  recurring_template_id uuid,
  recurring_frequency public.recurring_frequency,
  recurring_interval integer check (recurring_interval >= 1),
  recurring_weekdays integer[] not null default '{}',
  recurring_start_date date,
  recurring_end_date date,
  recurring_no_end boolean not null default false,
  recurring_rule_detail text,
  recurring_duration_days integer not null default 1 check (recurring_duration_days between 1 and 31),
  owner_roster_id text references public.team_roster(id),
  assigner_roster_id text references public.team_roster(id),
  creator_roster_id text references public.team_roster(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references public.users(id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_change_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  change_type public.change_type not null,
  from_value text,
  to_value text,
  actor_id uuid not null references public.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  update_type public.update_type not null default 'note',
  created_at timestamptz not null default now()
);

create table public.task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  url text not null,
  link_type text not null default '자료',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  primary key (task_id, tag_id)
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  scope public.calendar_scope not null default 'team',
  owner_id uuid references public.users(id),
  owner_roster_id text references public.team_roster(id),
  note text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_event_requires_owner check (scope = 'team' or owner_id is not null)
);

create table public.dashboard_memos (
  page_key text primary key check (page_key in ('my', 'team')),
  body text not null default '',
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

create table public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  note_date date not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique (owner_id, note_date)
);

create table public.recurring_task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid not null references public.users(id),
  assigner_type public.assigner_type not null default '개인',
  assigner_id uuid references public.users(id),
  creator_id uuid not null references public.users(id),
  frequency public.recurring_frequency not null,
  interval integer not null default 1 check (interval >= 1),
  weekdays integer[] not null default '{}',
  start_date date not null,
  end_date date,
  no_end boolean not null default false,
  rule_detail text not null,
  duration_days integer not null default 1 check (duration_days between 1 and 31),
  next_due_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add constraint tasks_recurring_template_fk
  foreign key (recurring_template_id) references public.recurring_task_templates(id);

create table public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  active_page text,
  active_view text,
  selected_tag text,
  timeline_mode text,
  timeline_month text,
  timeline_year text,
  selected_task_id uuid,
  updated_at timestamptz not null default now()
);

create index users_permission_role_idx on public.users(permission_role);
create index team_roster_expected_email_idx on public.team_roster(lower(expected_email)) where expected_email is not null;
create index team_roster_auth_user_idx on public.team_roster(auth_user_id) where auth_user_id is not null;
create index tasks_owner_status_idx on public.tasks(owner_id, status);
create index tasks_owner_roster_status_idx on public.tasks(owner_roster_id, status) where owner_roster_id is not null;
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_start_date_idx on public.tasks(start_date);
create index tasks_archived_at_idx on public.tasks(archived_at) where archived_at is not null;
create index tasks_recurring_frequency_idx on public.tasks(recurring_frequency) where recurring_frequency is not null;
create index subtasks_task_sort_idx on public.subtasks(task_id, sort_order);
create index task_updates_task_created_idx on public.task_updates(task_id, created_at desc);
create index task_updates_author_created_idx on public.task_updates(author_id, created_at desc);
create index task_change_history_task_created_idx on public.task_change_history(task_id, created_at desc);
create index task_tags_tag_idx on public.task_tags(tag_id);
create index calendar_events_date_scope_idx on public.calendar_events(event_date, scope);
create index recurring_templates_active_next_due_idx on public.recurring_task_templates(is_active, next_due_date);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at before update on public.users
  for each row execute function public.touch_updated_at();
create trigger team_roster_touch_updated_at before update on public.team_roster
  for each row execute function public.touch_updated_at();
create trigger tags_touch_updated_at before update on public.tags
  for each row execute function public.touch_updated_at();
create trigger tasks_touch_updated_at before update on public.tasks
  for each row execute function public.touch_updated_at();
create trigger subtasks_touch_updated_at before update on public.subtasks
  for each row execute function public.touch_updated_at();
create trigger calendar_events_touch_updated_at before update on public.calendar_events
  for each row execute function public.touch_updated_at();
create trigger recurring_templates_touch_updated_at before update on public.recurring_task_templates
  for each row execute function public.touch_updated_at();

create or replace function public.current_permission_role()
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

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_active
  from public.users
  where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_permission_role() = 'admin', false)
$$;

create or replace function public.is_lead_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_permission_role() in ('lead', 'admin'), false)
$$;

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

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    name,
    title,
    profile_emoji,
    permission_role,
    is_team_member
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'title', ''), '팀원'),
    coalesce(nullif(new.raw_user_meta_data ->> 'profile_emoji', ''), '🌿'),
    'member',
    true
  )
  on conflict (id) do nothing;

  update public.team_roster
  set auth_user_id = new.id,
      updated_at = now()
  where expected_email is not null
    and lower(expected_email) = lower(new.email)
    and auth_user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.team_roster enable row level security;
alter table public.tags enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.task_change_history enable row level security;
alter table public.task_updates enable row level security;
alter table public.task_links enable row level security;
alter table public.task_tags enable row level security;
alter table public.calendar_events enable row level security;
alter table public.dashboard_memos enable row level security;
alter table public.personal_notes enable row level security;
alter table public.recurring_task_templates enable row level security;
alter table public.user_preferences enable row level security;

create policy users_read_team on public.users
  for select to authenticated
  using (is_active or public.is_admin());

create policy users_update_self_profile on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      id = auth.uid()
      and permission_role = public.current_permission_role()
      and is_active = public.current_user_is_active()
    )
  );

create policy team_roster_read_active on public.team_roster
  for select to authenticated
  using (is_active or public.is_admin());

create policy team_roster_insert_admin on public.team_roster
  for insert to authenticated
  with check (public.is_admin());

create policy team_roster_update_admin on public.team_roster
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy team_roster_delete_admin on public.team_roster
  for delete to authenticated
  using (public.is_admin());

create policy tags_read_all on public.tags
  for select to authenticated
  using (true);

create policy tags_insert_all on public.tags
  for insert to authenticated
  with check (created_by = auth.uid());

create policy tags_admin_update on public.tags
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy tags_admin_delete on public.tags
  for delete to authenticated
  using (public.is_admin());

create policy tasks_read_all_team on public.tasks
  for select to authenticated
  using (true);

create policy tasks_insert_owner_or_lead on public.tasks
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and (owner_id = auth.uid() or public.is_lead_or_admin())
  );

create policy tasks_update_manager on public.tasks
  for update to authenticated
  using (public.can_manage_task(tasks))
  with check (public.can_manage_task(tasks));

create policy tasks_delete_manager on public.tasks
  for delete to authenticated
  using (public.can_manage_task(tasks));

create policy subtasks_read_all on public.subtasks
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy subtasks_manage_task_manager on public.subtasks
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_manage_task(t)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.can_manage_task(t)));

create policy history_read_all on public.task_change_history
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy history_insert_task_manager on public.task_change_history
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and public.can_manage_task(t))
  );

create policy updates_read_all on public.task_updates
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy updates_insert_visible on public.task_updates
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id)
  );

create policy links_read_all on public.task_links
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy links_manage_task_manager on public.task_links
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_manage_task(t)))
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and public.can_manage_task(t))
  );

create policy task_tags_read_all on public.task_tags
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy task_tags_manage_task_manager on public.task_tags
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_manage_task(t)))
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and public.can_manage_task(t))
  );

create policy calendar_read_by_scope on public.calendar_events
  for select to authenticated
  using (
    scope = 'team'
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy calendar_insert_by_scope on public.calendar_events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      scope = 'team'
      or owner_id = auth.uid()
      or public.is_admin()
    )
  );

create policy calendar_update_by_scope on public.calendar_events
  for update to authenticated
  using (
    public.is_admin()
    or (scope = 'team' and (public.is_lead_or_admin() or created_by = auth.uid()))
    or (scope = 'personal' and owner_id = auth.uid())
  )
  with check (
    public.is_admin()
    or (scope = 'team' and (public.is_lead_or_admin() or created_by = auth.uid()))
    or (scope = 'personal' and owner_id = auth.uid())
  );

create policy calendar_delete_by_scope on public.calendar_events
  for delete to authenticated
  using (
    public.is_admin()
    or (scope = 'team' and (public.is_lead_or_admin() or created_by = auth.uid()))
    or (scope = 'personal' and owner_id = auth.uid())
  );

create policy dashboard_memos_read_all on public.dashboard_memos
  for select to authenticated
  using (true);

create policy dashboard_memos_write_all on public.dashboard_memos
  for all to authenticated
  using (true)
  with check (updated_by = auth.uid());

create policy personal_notes_read_owner_or_admin on public.personal_notes
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy personal_notes_write_owner_or_admin on public.personal_notes
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy recurring_read_all on public.recurring_task_templates
  for select to authenticated
  using (true);

create policy recurring_insert_owner_or_lead on public.recurring_task_templates
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and (owner_id = auth.uid() or public.is_lead_or_admin())
  );

create policy recurring_update_manager on public.recurring_task_templates
  for update to authenticated
  using (owner_id = auth.uid() or creator_id = auth.uid() or public.is_lead_or_admin())
  with check (owner_id = auth.uid() or creator_id = auth.uid() or public.is_lead_or_admin());

create policy preferences_owner on public.user_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into public.dashboard_memos (page_key, body)
values ('my', ''), ('team', '')
on conflict (page_key) do nothing;

-- Data API table grants are manual because "Automatically expose new tables" is disabled.
-- RLS policies above still decide which rows each authenticated user can access.
grant usage on schema public to anon, authenticated;

grant select on public.users to authenticated;
grant update (name, title, profile_emoji, updated_at) on public.users to authenticated;
grant select, insert, update, delete on public.team_roster to authenticated;

grant select, insert on public.tags to authenticated;
grant update, delete on public.tags to authenticated;

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.subtasks to authenticated;
grant select, insert on public.task_change_history to authenticated;
grant select, insert on public.task_updates to authenticated;
grant select, insert, update, delete on public.task_links to authenticated;
grant select, insert, update, delete on public.task_tags to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.dashboard_memos to authenticated;
grant select, insert, update, delete on public.personal_notes to authenticated;
grant select, insert, update, delete on public.recurring_task_templates to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
