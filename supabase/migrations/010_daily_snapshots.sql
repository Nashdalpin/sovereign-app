-- Daily snapshots: one row per user per day (focus, integrity, target, objectives met).
-- Used for Progress timeline and export; filled when app detects last_date < today on hydrate.

create table if not exists public.daily_snapshots (
  user_id uuid references auth.users on delete cascade not null,
  date text not null,
  focus_hours numeric not null default 0,
  integrity smallint not null default 0 check (integrity >= 0 and integrity <= 10),
  target_hours numeric not null default 0,
  objectives_met boolean not null default false,
  primary key (user_id, date)
);

alter table public.daily_snapshots enable row level security;
drop policy if exists "Users can CRUD own daily_snapshots" on public.daily_snapshots;
create policy "Users can CRUD own daily_snapshots"
  on public.daily_snapshots for all using (auth.uid() = user_id);

create index if not exists idx_daily_snapshots_user_date
  on public.daily_snapshots (user_id, date desc);

comment on table public.daily_snapshots is 'One row per user per day: focus hours, integrity, daily target, objectives met (for Progress timeline and export).';
