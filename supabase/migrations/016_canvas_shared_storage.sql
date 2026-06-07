-- Shared Canvas persistence for the team Canvas MVP.
-- This is refresh-based shared storage, not realtime collaboration.

create table if not exists public.canvas_tabs (
  id text primary key,
  label text not null,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  constraint canvas_tabs_id_not_blank check (length(btrim(id)) > 0),
  constraint canvas_tabs_label_not_blank check (length(btrim(label)) > 0),
  constraint canvas_tabs_title_not_blank check (length(btrim(title)) > 0)
);

create table if not exists public.canvas_nodes (
  tab_id text not null references public.canvas_tabs(id) on delete cascade,
  id text not null,
  title text not null,
  body text not null default '',
  template text not null default 'memo',
  parent_id text,
  x integer not null default 0,
  y integer not null default 0,
  sort_order integer not null default 0,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  primary key (tab_id, id),
  constraint canvas_nodes_id_not_blank check (length(btrim(id)) > 0),
  constraint canvas_nodes_title_not_blank check (length(btrim(title)) > 0)
);

create table if not exists public.canvas_links (
  tab_id text not null references public.canvas_tabs(id) on delete cascade,
  id text not null,
  source_id text not null,
  target_id text not null,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  primary key (tab_id, id),
  constraint canvas_links_id_not_blank check (length(btrim(id)) > 0),
  constraint canvas_links_distinct_nodes check (source_id <> target_id),
  foreign key (tab_id, source_id) references public.canvas_nodes(tab_id, id) on delete cascade,
  foreign key (tab_id, target_id) references public.canvas_nodes(tab_id, id) on delete cascade
);

create index if not exists canvas_nodes_tab_sort_idx on public.canvas_nodes(tab_id, sort_order);
create index if not exists canvas_nodes_parent_idx on public.canvas_nodes(tab_id, parent_id);
create index if not exists canvas_links_tab_source_idx on public.canvas_links(tab_id, source_id);
create index if not exists canvas_tabs_updated_by_idx on public.canvas_tabs(updated_by);
create index if not exists canvas_nodes_updated_by_idx on public.canvas_nodes(updated_by);
create index if not exists canvas_links_updated_by_idx on public.canvas_links(updated_by);

drop trigger if exists canvas_tabs_touch_updated_at on public.canvas_tabs;
create trigger canvas_tabs_touch_updated_at before update on public.canvas_tabs
  for each row execute function public.touch_updated_at();
drop trigger if exists canvas_nodes_touch_updated_at on public.canvas_nodes;
create trigger canvas_nodes_touch_updated_at before update on public.canvas_nodes
  for each row execute function public.touch_updated_at();
drop trigger if exists canvas_links_touch_updated_at on public.canvas_links;
create trigger canvas_links_touch_updated_at before update on public.canvas_links
  for each row execute function public.touch_updated_at();

alter table public.canvas_tabs enable row level security;
alter table public.canvas_nodes enable row level security;
alter table public.canvas_links enable row level security;

drop policy if exists canvas_tabs_select_active on public.canvas_tabs;
drop policy if exists canvas_tabs_insert_active on public.canvas_tabs;
drop policy if exists canvas_tabs_update_active on public.canvas_tabs;
drop policy if exists canvas_tabs_delete_active on public.canvas_tabs;
create policy canvas_tabs_select_active on public.canvas_tabs
  for select to authenticated
  using ((select private.current_user_is_active()));
create policy canvas_tabs_insert_active on public.canvas_tabs
  for insert to authenticated
  with check (
    (select private.current_user_is_active())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy canvas_tabs_update_active on public.canvas_tabs
  for update to authenticated
  using ((select private.current_user_is_active()))
  with check (
    (select private.current_user_is_active())
    and updated_by = (select auth.uid())
  );
create policy canvas_tabs_delete_active on public.canvas_tabs
  for delete to authenticated
  using ((select private.current_user_is_active()));

drop policy if exists canvas_nodes_select_active on public.canvas_nodes;
drop policy if exists canvas_nodes_insert_active on public.canvas_nodes;
drop policy if exists canvas_nodes_update_active on public.canvas_nodes;
drop policy if exists canvas_nodes_delete_active on public.canvas_nodes;
create policy canvas_nodes_select_active on public.canvas_nodes
  for select to authenticated
  using ((select private.current_user_is_active()));
create policy canvas_nodes_insert_active on public.canvas_nodes
  for insert to authenticated
  with check (
    (select private.current_user_is_active())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy canvas_nodes_update_active on public.canvas_nodes
  for update to authenticated
  using ((select private.current_user_is_active()))
  with check (
    (select private.current_user_is_active())
    and updated_by = (select auth.uid())
  );
create policy canvas_nodes_delete_active on public.canvas_nodes
  for delete to authenticated
  using ((select private.current_user_is_active()));

drop policy if exists canvas_links_select_active on public.canvas_links;
drop policy if exists canvas_links_insert_active on public.canvas_links;
drop policy if exists canvas_links_update_active on public.canvas_links;
drop policy if exists canvas_links_delete_active on public.canvas_links;
create policy canvas_links_select_active on public.canvas_links
  for select to authenticated
  using ((select private.current_user_is_active()));
create policy canvas_links_insert_active on public.canvas_links
  for insert to authenticated
  with check (
    (select private.current_user_is_active())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy canvas_links_update_active on public.canvas_links
  for update to authenticated
  using ((select private.current_user_is_active()))
  with check (
    (select private.current_user_is_active())
    and updated_by = (select auth.uid())
  );
create policy canvas_links_delete_active on public.canvas_links
  for delete to authenticated
  using ((select private.current_user_is_active()));

revoke all privileges on public.canvas_tabs from authenticated;
revoke all privileges on public.canvas_nodes from authenticated;
revoke all privileges on public.canvas_links from authenticated;
grant select, insert, update, delete on public.canvas_tabs to authenticated;
grant select, insert, update, delete on public.canvas_nodes to authenticated;
grant select, insert, update, delete on public.canvas_links to authenticated;
