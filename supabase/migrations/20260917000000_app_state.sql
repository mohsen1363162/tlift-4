-- جدول همگام‌سازی وضعیت برنامه تلیفت (آینه‌ی localStorage)
create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- دسترسی خواندن/نوشتن برای کلاینت (کلید anon). در صورت نیاز بعداً به auth.uid() محدود شود.
drop policy if exists "app_state_all" on public.app_state;
create policy "app_state_all" on public.app_state
  for all using (true) with check (true);

-- فعال‌سازی Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;
