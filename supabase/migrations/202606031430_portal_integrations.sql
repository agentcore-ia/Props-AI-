create table if not exists public.portal_integrations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  portal text not null,
  label text not null,
  inbound_token text not null unique,
  enabled boolean not null default true,
  last_event_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (agency_id, portal)
);

create index if not exists portal_integrations_agency_idx
  on public.portal_integrations (agency_id, portal);

create table if not exists public.portal_lead_events (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.portal_integrations (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  lead_id uuid references public.crm_leads (id) on delete set null,
  portal text not null,
  external_id text,
  customer_name text not null,
  email text,
  phone text,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists portal_lead_events_external_idx
  on public.portal_lead_events (integration_id, external_id)
  where external_id is not null and btrim(external_id) <> '';

create index if not exists portal_lead_events_agency_created_idx
  on public.portal_lead_events (agency_id, created_at desc);

drop trigger if exists portal_integrations_set_updated_at on public.portal_integrations;
create trigger portal_integrations_set_updated_at
  before update on public.portal_integrations
  for each row execute procedure public.touch_updated_at();

alter table public.portal_integrations enable row level security;
alter table public.portal_lead_events enable row level security;

drop policy if exists "Service role manages portal integrations" on public.portal_integrations;
create policy "Service role manages portal integrations"
on public.portal_integrations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role manages portal lead events" on public.portal_lead_events;
create policy "Service role manages portal lead events"
on public.portal_lead_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
