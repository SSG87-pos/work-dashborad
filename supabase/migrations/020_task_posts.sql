-- Task-level remembered-context posts used by 업무 노트 and the
-- Highlights workstream post rollup. This is refresh-based shared storage;
-- realtime feeds, attachments in Storage, and post change history remain later scope.

create table if not exists public.task_post_categories (
  id text primary key,
  label text unique not null,
  tone text not null default 'slate',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_post_categories_id_not_blank check (length(btrim(id)) > 0),
  constraint task_post_categories_label_not_blank check (length(btrim(label)) > 0),
  constraint task_post_categories_tone_allowed check (tone in ('blue', 'green', 'amber', 'red', 'violet', 'slate'))
);

create table if not exists public.task_posts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  scope text not null default '기억할 점',
  title text not null,
  body text not null,
  url text,
  attachment jsonb,
  author_id uuid not null references public.users(id),
  posted_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_posts_scope_not_blank check (length(btrim(scope)) > 0),
  constraint task_posts_title_not_blank check (length(btrim(title)) > 0),
  constraint task_posts_body_not_blank check (length(btrim(body)) > 0),
  constraint task_posts_attachment_is_object check (attachment is null or jsonb_typeof(attachment) = 'object')
);

create index if not exists task_post_categories_sort_idx on public.task_post_categories(sort_order, label);
create index if not exists task_posts_task_created_idx on public.task_posts(task_id, created_at desc);
create index if not exists task_posts_author_created_idx on public.task_posts(author_id, created_at desc);
create index if not exists task_posts_scope_created_idx on public.task_posts(scope, created_at desc);

drop trigger if exists task_post_categories_touch_updated_at on public.task_post_categories;
create trigger task_post_categories_touch_updated_at before update on public.task_post_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists task_posts_touch_updated_at on public.task_posts;
create trigger task_posts_touch_updated_at before update on public.task_posts
  for each row execute function public.touch_updated_at();

alter table public.task_post_categories enable row level security;
alter table public.task_posts enable row level security;

drop policy if exists task_post_categories_read_active_or_admin on public.task_post_categories;
drop policy if exists task_post_categories_insert_admin on public.task_post_categories;
drop policy if exists task_post_categories_update_admin on public.task_post_categories;
drop policy if exists task_post_categories_delete_admin on public.task_post_categories;
create policy task_post_categories_read_active_or_admin on public.task_post_categories
  for select to authenticated
  using (active or (select private.is_admin()));
create policy task_post_categories_insert_admin on public.task_post_categories
  for insert to authenticated
  with check (
    (select private.is_admin())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy task_post_categories_update_admin on public.task_post_categories
  for update to authenticated
  using ((select private.is_admin()))
  with check (
    (select private.is_admin())
    and updated_by = (select auth.uid())
  );
create policy task_post_categories_delete_admin on public.task_post_categories
  for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists task_posts_read_visible_task on public.task_posts;
drop policy if exists task_posts_insert_visible_task on public.task_posts;
drop policy if exists task_posts_update_author_or_task_manager on public.task_posts;
drop policy if exists task_posts_delete_author_or_task_manager on public.task_posts;
create policy task_posts_read_visible_task on public.task_posts
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy task_posts_insert_visible_task on public.task_posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id)
  );
create policy task_posts_update_author_or_task_manager on public.task_posts
  for update to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  )
  with check (
    author_id = (select auth.uid())
    or exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );
create policy task_posts_delete_author_or_task_manager on public.task_posts
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.tasks t where t.id = task_id and private.can_manage_task(t))
  );

revoke all privileges on public.task_post_categories from authenticated;
revoke all privileges on public.task_posts from authenticated;
grant select, insert, update, delete on public.task_post_categories to authenticated;
grant select, insert, delete on public.task_posts to authenticated;
grant update (scope, title, body, url, attachment, updated_at) on public.task_posts to authenticated;

insert into public.task_post_categories (id, label, tone, active, sort_order)
values
  ('decision', '결정사항', 'blue', true, 10),
  ('memory', '기억할 점', 'green', true, 20),
  ('risk', '리스크', 'red', true, 30),
  ('meeting', '회의록', 'slate', true, 40),
  ('important-doc', '중요문서', 'violet', true, 50),
  ('reference', '참고자료', 'slate', true, 60),
  ('followup', '다음 확인', 'amber', true, 70)
on conflict (id) do update
set
  label = excluded.label,
  tone = excluded.tone,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();
