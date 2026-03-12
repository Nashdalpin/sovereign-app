-- Linked Capital sub-goal: Professional/Personal/Vitality goals that have a cost
-- can link to a Capital asset that tracks the money (auto-created).
-- Optional weight tracking for Vitality goals (e.g. lose weight).

alter table public.assets
  add column if not exists linked_capital_asset_id uuid references public.assets(id) on delete set null,
  add column if not exists target_weight numeric default null,
  add column if not exists current_weight numeric default null;

comment on column public.assets.linked_capital_asset_id is 'When set on Professional/Personal/Vitality: Capital asset that tracks money for this goal (e.g. course fees, medical)';
comment on column public.assets.target_weight is 'Target value for weight-based goals (e.g. kg); used in Vitality';
comment on column public.assets.current_weight is 'Current value for weight-based goals (e.g. kg)';

create index if not exists assets_linked_capital_asset_id_idx on public.assets(linked_capital_asset_id);
