create table if not exists public.class_system_state (
  app_id text not null,
  bucket text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_by text not null default 'browser',
  updated_at timestamptz not null default now(),
  primary key (app_id, bucket),
  constraint class_system_state_bucket_check check (
    bucket in ('shiftOverrides', 'coursePermissions', 'customCatalog', 'lessonEdits')
  )
);

create or replace function public.set_class_system_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists class_system_state_set_updated_at on public.class_system_state;

create trigger class_system_state_set_updated_at
before update on public.class_system_state
for each row
execute function public.set_class_system_state_updated_at();

alter table public.class_system_state enable row level security;

drop policy if exists "class system authenticated read" on public.class_system_state;
create policy "class system authenticated read"
on public.class_system_state
for select
to authenticated
using (true);

drop policy if exists "class system authenticated insert" on public.class_system_state;
create policy "class system authenticated insert"
on public.class_system_state
for insert
to authenticated
with check (
  bucket in ('shiftOverrides', 'coursePermissions', 'customCatalog', 'lessonEdits')
);

drop policy if exists "class system authenticated update" on public.class_system_state;
create policy "class system authenticated update"
on public.class_system_state
for update
to authenticated
using (true)
with check (
  bucket in ('shiftOverrides', 'coursePermissions', 'customCatalog', 'lessonEdits')
);

do $$
begin
  alter publication supabase_realtime add table public.class_system_state;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
