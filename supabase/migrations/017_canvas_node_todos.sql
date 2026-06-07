-- Structured Canvas node payloads for checklist-style nodes.
-- The first use is data.todoItems for Canvas todo list nodes.

alter table public.canvas_nodes
  add column if not exists data jsonb not null default '{}'::jsonb;

alter table public.canvas_nodes
  add constraint canvas_nodes_data_is_object
  check (jsonb_typeof(data) = 'object')
  not valid;

alter table public.canvas_nodes
  validate constraint canvas_nodes_data_is_object;
