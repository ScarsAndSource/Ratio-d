-- Run this in the Supabase SQL editor once, on your project.


create table if not exists public.face_scans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_at bigint not null,
  metrics jsonb not null,
  representative_image text,
  created_at timestamptz not null default now()
);
create index if not exists face_scans_user_captured_idx on public.face_scans (user_id, captured_at desc);
alter table public.face_scans enable row level security;
create policy "face_scans_select_own" on public.face_scans for select using (auth.uid() = user_id);
create policy "face_scans_insert_own" on public.face_scans for insert with check (auth.uid() = user_id);
create policy "face_scans_delete_own" on public.face_scans for delete using (auth.uid() = user_id);


create table if not exists public.body_scans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_at bigint not null,
  metrics jsonb not null,
  front_reference_image text,
  front_landmarks jsonb,
  created_at timestamptz not null default now()
);
create index if not exists body_scans_user_captured_idx on public.body_scans (user_id, captured_at desc);
alter table public.body_scans enable row level security;
create policy "body_scans_select_own" on public.body_scans for select using (auth.uid() = user_id);
create policy "body_scans_insert_own" on public.body_scans for insert with check (auth.uid() = user_id);
create policy "body_scans_delete_own" on public.body_scans for delete using (auth.uid() = user_id);


create table if not exists public.user_consent (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consented_at timestamptz not null default now(),
  consent_version text not null
);
alter table public.user_consent enable row level security;
create policy "user_consent_select_own" on public.user_consent for select using (auth.uid() = user_id);
create policy "user_consent_upsert_own" on public.user_consent for insert with check (auth.uid() = user_id);
create policy "user_consent_update_own" on public.user_consent for update using (auth.uid() = user_id);


create table if not exists public.worker_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  call_count int not null default 0,
  primary key (user_id, usage_day)
);
alter table public.worker_usage enable row level security;
