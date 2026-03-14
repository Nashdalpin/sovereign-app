-- Optional unit for target/current value (e.g. kg, lbs, cm)

alter table public.assets
  add column if not exists target_unit text default null;

comment on column public.assets.target_unit is 'Optional unit for target_weight/current_weight (e.g. kg, lbs, cm)';
