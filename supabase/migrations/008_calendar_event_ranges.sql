alter table public.calendar_events
  add column if not exists start_date date,
  add column if not exists end_date date;

update public.calendar_events
set
  start_date = coalesce(start_date, event_date),
  end_date = coalesce(end_date, start_date, event_date)
where start_date is null or end_date is null;

alter table public.calendar_events
  alter column start_date set default current_date,
  alter column end_date set default current_date;

alter table public.calendar_events
  drop constraint if exists calendar_events_date_range_check;

alter table public.calendar_events
  add constraint calendar_events_date_range_check
  check (end_date >= start_date);

create index if not exists calendar_events_range_idx
  on public.calendar_events(start_date, end_date);
