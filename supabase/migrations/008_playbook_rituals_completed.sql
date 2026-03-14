-- Playbook-only ritual checklist (Sustain your mandates). Independent from Sanctuary vitals.
-- Integrity is derived from this; marking in Playbook does not change Sanctuary/Altar state.

alter table public.app_state
  add column if not exists playbook_rituals_completed jsonb default '{}'::jsonb;

comment on column public.app_state.playbook_rituals_completed is 'Ritual id -> boolean: completed in Daily Playbook; drives Integrity score.';
