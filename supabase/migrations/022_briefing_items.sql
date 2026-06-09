-- Structured Today Briefing capture items.
-- My Desk uses inbox-style records for mail, ideas, risks, references, and notes.
-- Team Flow uses todo-style records that teammates can check together.

create table if not exists public.briefing_items (
  id text primary key,
  scope text not null default 'my',
  kind text not null default 'inbox',
  item_type text not null default 'note',
  title text not null,
  body text,
  url text,
  status text not null default 'new',
  done boolean not null default false,
  owner_id uuid references public.users(id),
  owner_roster_id text references public.team_roster(id),
  task_id uuid references public.tasks(id) on delete set null,
  author_id uuid not null references public.users(id),
  author_roster_id text references public.team_roster(id),
  created_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint briefing_items_id_not_blank check (length(btrim(id)) > 0),
  constraint briefing_items_title_not_blank check (length(btrim(title)) > 0),
  constraint briefing_items_scope_allowed check (scope in ('my', 'team')),
  constraint briefing_items_kind_allowed check (kind in ('inbox', 'todo')),
  constraint briefing_items_type_allowed check (item_type in ('mail', 'meeting', 'idea', 'risk', 'reference', 'todo', 'note')),
  constraint briefing_items_status_allowed check (status in ('new', 'reviewing', 'converted', 'archived', 'open', 'done'))
);

create index if not exists briefing_items_scope_created_idx on public.briefing_items(scope, created_at desc);
create index if not exists briefing_items_author_created_idx on public.briefing_items(author_id, created_at desc);
create index if not exists briefing_items_owner_created_idx on public.briefing_items(owner_id, created_at desc);
create index if not exists briefing_items_owner_roster_created_idx on public.briefing_items(owner_roster_id, created_at desc);
create index if not exists briefing_items_task_idx on public.briefing_items(task_id);

drop trigger if exists briefing_items_touch_updated_at on public.briefing_items;
create trigger briefing_items_touch_updated_at before update on public.briefing_items
  for each row execute function public.touch_updated_at();

alter table public.briefing_items enable row level security;

drop policy if exists briefing_items_read_authenticated on public.briefing_items;
drop policy if exists briefing_items_insert_self on public.briefing_items;
drop policy if exists briefing_items_update_author_admin_or_team on public.briefing_items;
drop policy if exists briefing_items_delete_author_admin_or_team on public.briefing_items;

create policy briefing_items_read_authenticated on public.briefing_items
  for select to authenticated
  using (
    scope = 'team'
    or author_id = (select auth.uid())
    or owner_id = (select auth.uid())
    or exists (
      select 1
      from public.team_roster roster
      where roster.id = owner_roster_id
        and roster.auth_user_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

create policy briefing_items_insert_self on public.briefing_items
  for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy briefing_items_update_author_admin_or_team on public.briefing_items
  for update to authenticated
  using (
    scope = 'team'
    or author_id = (select auth.uid())
    or owner_id = (select auth.uid())
    or exists (
      select 1
      from public.team_roster roster
      where roster.id = owner_roster_id
        and roster.auth_user_id = (select auth.uid())
    )
    or (select private.is_admin())
  )
  with check (
    scope = 'team'
    or author_id = (select auth.uid())
    or owner_id = (select auth.uid())
    or exists (
      select 1
      from public.team_roster roster
      where roster.id = owner_roster_id
        and roster.auth_user_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

create policy briefing_items_delete_author_admin_or_team on public.briefing_items
  for delete to authenticated
  using (
    scope = 'team'
    or author_id = (select auth.uid())
    or owner_id = (select auth.uid())
    or exists (
      select 1
      from public.team_roster roster
      where roster.id = owner_roster_id
        and roster.auth_user_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

revoke all privileges on public.briefing_items from authenticated;
grant select, insert, delete on public.briefing_items to authenticated;
grant update (
  scope,
  kind,
  item_type,
  title,
  body,
  url,
  status,
  done,
  owner_id,
  owner_roster_id,
  task_id,
  author_roster_id,
  created_on,
  updated_at
) on public.briefing_items to authenticated;
