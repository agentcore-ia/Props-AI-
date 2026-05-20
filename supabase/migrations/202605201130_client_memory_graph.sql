create table if not exists public.client_memory_profiles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  display_name text not null default 'Cliente',
  normalized_phone text,
  email text,
  summary text not null default '',
  facts jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  last_interaction_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.client_memory_events (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.client_memory_profiles (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  contract_id uuid references public.rental_contracts (id) on delete set null,
  source_type text not null default 'manual',
  source_id text,
  direction text not null check (direction in ('incoming', 'outgoing', 'internal')),
  role text not null check (role in ('customer', 'assistant', 'agent', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.client_memory_links (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.client_memory_profiles (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  entity_type text not null check (entity_type in ('lead', 'tenant', 'owner', 'property', 'contract', 'conversation')),
  entity_id text not null,
  label text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (memory_id, entity_type, entity_id)
);

create unique index if not exists client_memory_profiles_agency_phone_idx
  on public.client_memory_profiles (agency_id, normalized_phone)
  where normalized_phone is not null and btrim(normalized_phone) <> '';

create index if not exists client_memory_profiles_agency_email_idx
  on public.client_memory_profiles (agency_id, lower(email))
  where email is not null and btrim(email) <> '';

create index if not exists client_memory_events_memory_created_idx
  on public.client_memory_events (memory_id, created_at desc);

create index if not exists client_memory_events_agency_created_idx
  on public.client_memory_events (agency_id, created_at desc);

create index if not exists client_memory_links_entity_idx
  on public.client_memory_links (agency_id, entity_type, entity_id);

alter table public.client_memory_profiles enable row level security;
alter table public.client_memory_events enable row level security;
alter table public.client_memory_links enable row level security;

drop trigger if exists client_memory_profiles_set_updated_at on public.client_memory_profiles;
drop trigger if exists client_memory_links_set_updated_at on public.client_memory_links;

create trigger client_memory_profiles_set_updated_at
before update on public.client_memory_profiles
for each row execute procedure public.touch_updated_at();

create trigger client_memory_links_set_updated_at
before update on public.client_memory_links
for each row execute procedure public.touch_updated_at();

drop policy if exists "Service role manages client memory profiles" on public.client_memory_profiles;
drop policy if exists "Service role manages client memory events" on public.client_memory_events;
drop policy if exists "Service role manages client memory links" on public.client_memory_links;

create policy "Service role manages client memory profiles"
on public.client_memory_profiles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages client memory events"
on public.client_memory_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages client memory links"
on public.client_memory_links
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
