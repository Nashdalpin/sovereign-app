-- Profiles: allow app to insert own profile (e.g. if trigger missed or first-login sync).
-- Session logs: index for listing by user and time (Progress, stats, export).

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create index if not exists idx_session_logs_user_timestamp
  on public.session_logs (user_id, timestamp desc);

comment on index public.idx_session_logs_user_timestamp is 'Efficient list/filter of sessions by user and date (Progress, export).';
