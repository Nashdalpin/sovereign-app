-- Financial goals: target_type on assets + goal_entries for money contributions

-- Extend assets for money goals
alter table public.assets
  add column if not exists target_type text not null default 'hours' check (target_type in ('hours','money')),
  add column if not exists target_amount numeric default null,
  add column if not exists invested_amount numeric not null default 0,
  add column if not exists currency text default 'EUR';

comment on column public.assets.target_type is 'hours = time-based goal, money = amount-based goal';
comment on column public.assets.target_amount is 'Target value when target_type = money';
comment on column public.assets.invested_amount is 'Accumulated amount when target_type = money (sum of goal_entries)';
comment on column public.assets.currency is 'Currency code when target_type = money (e.g. EUR)';

-- Entries (deposits) for money goals
create table if not exists public.goal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  asset_id uuid references public.assets on delete cascade not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  note text default null,
  timestamp timestamptz not null default now()
);

create index if not exists goal_entries_asset_id_idx on public.goal_entries(asset_id);
create index if not exists goal_entries_user_id_idx on public.goal_entries(user_id);

alter table public.goal_entries enable row level security;
create policy "Users can CRUD own goal_entries" on public.goal_entries for all using (auth.uid() = user_id);
