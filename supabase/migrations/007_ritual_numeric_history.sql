-- Time series for numeric rituals (e.g. weight over time). One row per user/ritual/date.
create table if not exists public.ritual_numeric_history (
  user_id uuid references auth.users on delete cascade not null,
  ritual_id text not null,
  date text not null,
  value numeric not null,
  primary key (user_id, ritual_id, date)
);

alter table public.ritual_numeric_history enable row level security;
create policy "Users can CRUD own ritual_numeric_history"
  on public.ritual_numeric_history for all using (auth.uid() = user_id);

create index if not exists idx_ritual_numeric_history_user_ritual
  on public.ritual_numeric_history (user_id, ritual_id, date desc);

comment on table public.ritual_numeric_history is 'Time series of numeric ritual values (e.g. daily weight) for trends and charts.';
