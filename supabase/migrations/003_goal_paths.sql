-- Goal paths: long-term goals with ordered baby steps (sub-goals)

alter table public.assets
  add column if not exists parent_asset_id uuid references public.assets(id) on delete set null,
  add column if not exists step_order smallint default null;

comment on column public.assets.parent_asset_id is 'Parent long-term goal; null = root goal';
comment on column public.assets.step_order is 'Order in path (1 = first step) among siblings';

create index if not exists assets_parent_asset_id_idx on public.assets(parent_asset_id);
