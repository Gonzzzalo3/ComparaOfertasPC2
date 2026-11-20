-- Datos personales de cuenta; las políticas impiden acceder a preferencias ajenas.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  favorites jsonb not null default '[]'::jsonb check (jsonb_typeof(favorites) = 'array'),
  basket jsonb not null default '[]'::jsonb check (jsonb_typeof(basket) = 'array'),
  thresholds jsonb not null default '{}'::jsonb check (jsonb_typeof(thresholds) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from anon, authenticated;
grant select, insert, update on public.user_preferences to authenticated;

create policy "Read own preferences" on public.user_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Insert own preferences" on public.user_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own preferences" on public.user_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
