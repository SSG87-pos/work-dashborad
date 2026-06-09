-- Add a lightweight task-kind flag for spot work.
-- Spot work is shown on the board and weekly/monthly performance reports,
-- but excluded from quarterly/yearly summary reports unless detailed results are enabled.

alter table public.tasks
  add column if not exists work_kind text not null default 'standard';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_work_kind_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_work_kind_check check (work_kind in ('standard', 'spot'));
  end if;
end $$;

create index if not exists tasks_work_kind_due_idx
  on public.tasks(work_kind, due_date)
  where deleted_at is null and archived_at is null;

grant update (work_kind) on public.tasks to authenticated;
