create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  contract_id uuid references public.rental_contracts (id) on delete set null,
  tenant_name text not null default '',
  owner_name text not null default '',
  title text not null,
  description text not null default '',
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  status text not null default 'Nuevo' check (status in ('Nuevo', 'En revision', 'Proveedor asignado', 'Esperando aprobacion', 'Resuelto', 'Cancelado')),
  supplier_id uuid references public.suppliers (id) on delete set null,
  supplier_name text not null default '',
  estimated_cost numeric(14, 2) not null default 0,
  payer text not null default 'A definir' check (payer in ('Inquilino', 'Propietario', 'Inmobiliaria', 'A definir')),
  owner_approval_required boolean not null default false,
  owner_approved_at timestamptz,
  next_step text not null default '',
  photos jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists maintenance_tickets_agency_status_idx
  on public.maintenance_tickets (agency_id, status, priority, created_at desc);

create index if not exists maintenance_tickets_contract_idx
  on public.maintenance_tickets (contract_id, created_at desc);

create index if not exists maintenance_tickets_property_idx
  on public.maintenance_tickets (property_id, created_at desc);

alter table public.maintenance_tickets enable row level security;

drop policy if exists "Service role manages maintenance tickets" on public.maintenance_tickets;

create policy "Service role manages maintenance tickets"
on public.maintenance_tickets
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop trigger if exists maintenance_tickets_set_updated_at on public.maintenance_tickets;

create trigger maintenance_tickets_set_updated_at
  before update on public.maintenance_tickets
  for each row execute procedure public.touch_updated_at();
