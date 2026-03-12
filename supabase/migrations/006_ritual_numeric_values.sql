-- Daily numeric values for rituals with type 'number' (e.g. weight, waist).
-- Keys: ritual id, values: number. Per user per day in app_state.

alter table public.app_state
  add column if not exists ritual_numeric_values jsonb default '{}'::jsonb;

comment on column public.app_state.ritual_numeric_values is 'Ritual id -> number for numeric rituals (e.g. weigh-in).';
