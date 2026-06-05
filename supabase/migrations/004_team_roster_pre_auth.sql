-- Allow the team to plan and run work before every teammate has signed up.
-- Roster rows use stable local ids (for example seoyeon/junho) and can later
-- connect to auth-backed public.users rows by expected email.

create table if not exists public.team_roster (
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

alter table public.tasks
  add column if not exists owner_roster_id text references public.team_roster(id),
  add column if not exists assigner_roster_id text references public.team_roster(id),
  add column if not exists creator_roster_id text references public.team_roster(id);

alter table public.calendar_events
  add column if not exists owner_roster_id text references public.team_roster(id);

create index if not exists team_roster_expected_email_idx
  on public.team_roster(lower(expected_email))
  where expected_email is not null;

create index if not exists team_roster_auth_user_idx
  on public.team_roster(auth_user_id)
  where auth_user_id is not null;

create index if not exists tasks_owner_roster_status_idx
  on public.tasks(owner_roster_id, status)
  where owner_roster_id is not null;

create trigger team_roster_touch_updated_at before update on public.team_roster
  for each row execute function public.touch_updated_at();

alter table public.team_roster enable row level security;

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

grant select, insert, update, delete on public.team_roster to authenticated;

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
