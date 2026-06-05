create table if not exists public.tag_groups (
  id text primary key,
  label text not null,
  tags text[] not null default '{}',
  tone text not null default 'custom',
  sort_order integer not null default 0,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tag_groups_touch_updated_at before update on public.tag_groups
  for each row execute function public.touch_updated_at();

alter table public.tag_groups enable row level security;

create policy tag_groups_read_all on public.tag_groups
  for select to authenticated
  using (true);

create policy tag_groups_insert_admin on public.tag_groups
  for insert to authenticated
  with check (public.is_admin());

create policy tag_groups_update_admin on public.tag_groups
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy tag_groups_delete_admin on public.tag_groups
  for delete to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.tag_groups to authenticated;
