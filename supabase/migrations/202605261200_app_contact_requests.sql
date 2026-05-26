create table if not exists public.app_contact_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  agency_name text not null,
  email text not null,
  phone text not null,
  message text not null,
  source text not null default 'app_control_landing',
  status text not null default 'Nuevo' check (status in ('Nuevo', 'Contactado', 'Demo agendada', 'Cerrado', 'Descartado')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists app_contact_requests_status_created_idx
  on public.app_contact_requests (status, created_at desc);

alter table public.app_contact_requests enable row level security;

drop policy if exists "Service role manages app contact requests" on public.app_contact_requests;

create policy "Service role manages app contact requests"
on public.app_contact_requests
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
