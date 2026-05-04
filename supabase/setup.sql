create extension if not exists pgcrypto;

alter table public.profiles drop constraint if exists profiles_role_check;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'agent' check (role in ('superadmin', 'agency_admin', 'agent', 'customer')),
  agency_slug text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  slug text not null unique,
  email text not null unique,
  phone text not null,
  owner_name text not null,
  owner_email text not null unique,
  plan text not null default 'Starter' check (plan in ('Starter', 'Growth', 'Scale')),
  status text not null default 'Activa' check (status in ('Activa', 'En onboarding')),
  city text not null,
  tagline text not null default '',
  messaging_instance text not null default 'agentcore',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  title text not null,
  price numeric(14, 2) not null default 0,
  location text not null,
  status text not null check (status in ('Disponible', 'Reservada', 'Vendida', 'Alquilada')),
  operation text not null check (operation in ('Venta', 'Alquiler')),
  description text not null,
  image text not null,
  images jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.catalog_inquiries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  name text not null,
  email text not null,
  phone text not null,
  message text not null,
  budget text,
  operation text,
  status text not null default 'Nuevo' check (status in ('Nuevo', 'Contactado', 'Visitando', 'Cerrado')),
  source text not null default 'catalog',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.marketplace_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  title text not null default 'Consulta desde marketplace',
  status text not null default 'Abierta' check (status in ('Abierta', 'Cerrada')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversations (id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'assistant')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.rental_contracts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  tenant_name text not null,
  tenant_phone text not null,
  tenant_email text,
  current_rent numeric(14, 2) not null default 0,
  currency text not null default 'ARS' check (currency in ('ARS')),
  index_type text not null check (index_type in ('IPC', 'ICL')),
  adjustment_frequency_months integer not null check (adjustment_frequency_months > 0),
  contract_start_date date not null,
  rent_reference_date date not null,
  next_adjustment_date date not null,
  last_adjustment_date date,
  auto_notify boolean not null default true,
  notification_channel text not null default 'whatsapp' check (notification_channel in ('whatsapp')),
  status text not null default 'Activo' check (status in ('Activo', 'Pausado', 'Finalizado')),
  notes text not null default '',
  contract_file_name text,
  contract_file_path text,
  contract_file_mime_type text,
  contract_file_size_bytes integer,
  contract_text text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.rental_adjustments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rental_contracts (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  index_type text not null check (index_type in ('IPC', 'ICL')),
  applied_on date not null,
  reference_start_date date not null,
  reference_end_date date not null,
  factor numeric(18, 8) not null,
  previous_rent numeric(14, 2) not null,
  new_rent numeric(14, 2) not null,
  source_label text not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  message_body text not null default '',
  notification_status text not null default 'Pendiente' check (notification_status in ('Pendiente', 'Enviado', 'Fallido')),
  notification_response jsonb not null default '{}'::jsonb,
  notified_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.agencies
  add column if not exists messaging_instance text not null default 'agentcore';

alter table public.rental_contracts
  add column if not exists contract_file_name text,
  add column if not exists contract_file_path text,
  add column if not exists contract_file_mime_type text,
  add column if not exists contract_file_size_bytes integer,
  add column if not exists contract_text text not null default '';

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.properties enable row level security;
alter table public.catalog_inquiries enable row level security;
alter table public.marketplace_conversations enable row level security;
alter table public.marketplace_messages enable row level security;
alter table public.rental_contracts enable row level security;
alter table public.rental_adjustments enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
drop trigger if exists agencies_set_updated_at on public.agencies;
drop trigger if exists properties_set_updated_at on public.properties;
drop trigger if exists marketplace_conversations_set_updated_at on public.marketplace_conversations;
drop trigger if exists rental_contracts_set_updated_at on public.rental_contracts;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

create trigger agencies_set_updated_at
  before update on public.agencies
  for each row execute procedure public.touch_updated_at();

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute procedure public.touch_updated_at();

create trigger marketplace_conversations_set_updated_at
  before update on public.marketplace_conversations
  for each row execute procedure public.touch_updated_at();

create trigger rental_contracts_set_updated_at
  before update on public.rental_contracts
  for each row execute procedure public.touch_updated_at();

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Public can view agencies" on public.agencies;
drop policy if exists "Public can view properties" on public.properties;
drop policy if exists "Service role manages inquiries" on public.catalog_inquiries;
drop policy if exists "Users can view their own conversations" on public.marketplace_conversations;
drop policy if exists "Users can view their own marketplace messages" on public.marketplace_messages;
drop policy if exists "Service role manages marketplace conversations" on public.marketplace_conversations;
drop policy if exists "Service role manages marketplace messages" on public.marketplace_messages;
drop policy if exists "Service role manages rental contracts" on public.rental_contracts;
drop policy if exists "Service role manages rental adjustments" on public.rental_adjustments;

create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "Public can view agencies"
on public.agencies
for select
using (true);

create policy "Public can view properties"
on public.properties
for select
using (true);

create policy "Service role manages inquiries"
on public.catalog_inquiries
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Users can view their own conversations"
on public.marketplace_conversations
for select
using (auth.uid() = customer_id);

create policy "Users can view their own marketplace messages"
on public.marketplace_messages
for select
using (
  exists (
    select 1
    from public.marketplace_conversations conversations
    where conversations.id = marketplace_messages.conversation_id
      and conversations.customer_id = auth.uid()
  )
);

create policy "Service role manages marketplace conversations"
on public.marketplace_conversations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages marketplace messages"
on public.marketplace_messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages rental contracts"
on public.rental_contracts
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages rental adjustments"
on public.rental_adjustments
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
