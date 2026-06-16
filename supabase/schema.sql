-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

create table if not exists public.leads (
  id text primary key,
  user_id text not null,
  company text not null default '',
  country text not null default 'Nederland',
  employees integer not null default 0,
  revenue text not null default '',
  sector text not null default '',
  contact_name text not null default '',
  contact_title text not null default '',
  linkedin_url text not null default '',
  status text not null default 'nieuw',
  batch text not null default '',
  is_new boolean not null default true,
  notes text not null default '',
  message text not null default '',
  score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.batches (
  id text primary key,
  user_id text not null,
  date text not null,
  label text not null,
  lead_count integer not null default 0,
  credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leads_user_id_idx on public.leads (user_id);
create index if not exists batches_user_id_idx on public.batches (user_id);

alter table public.leads enable row level security;
alter table public.batches enable row level security;

-- Demo policies: API uses service role; these allow anon read/write for prototyping
create policy "leads_all" on public.leads for all using (true) with check (true);
create policy "batches_all" on public.batches for all using (true) with check (true);
