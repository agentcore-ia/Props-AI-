create extension if not exists pgcrypto;

alter table public.profiles drop constraint if exists profiles_role_check;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  role text not null default 'agent' check (role in ('superadmin', 'agency_admin', 'agent', 'customer')),
  agency_slug text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles
  add column if not exists phone text;

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
  website_url text,
  instagram_url text,
  facebook_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  title text not null,
  price numeric(14, 2) not null default 0,
  currency text not null default 'USD' check (currency in ('USD', 'ARS')),
  location text not null,
  exact_address text not null default '',
  status text not null check (status in ('Disponible', 'Reservada', 'Vendida', 'Alquilada')),
  operation text not null check (operation in ('Venta', 'Alquiler')),
  description text not null,
  image text not null,
  images jsonb not null default '[]'::jsonb,
  property_type text not null default 'Departamento' check (property_type in ('Departamento', 'Casa', 'PH', 'Loft', 'Townhouse', 'Oficina', 'Local')),
  bedrooms integer not null default 0,
  bathrooms numeric(5, 2) not null default 0,
  area numeric(10, 2) not null default 0,
  parking_spots integer not null default 0,
  furnished boolean not null default false,
  expenses numeric(14, 2),
  expenses_currency text check (expenses_currency in ('USD', 'ARS')),
  available_from date,
  pets_policy text not null default '',
  requirements text not null default '',
  amenities jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.properties
  add column if not exists currency text not null default 'USD',
  add column if not exists exact_address text not null default '',
  add column if not exists property_type text not null default 'Departamento',
  add column if not exists bedrooms integer not null default 0,
  add column if not exists bathrooms numeric(5, 2) not null default 0,
  add column if not exists area numeric(10, 2) not null default 0,
  add column if not exists parking_spots integer not null default 0,
  add column if not exists furnished boolean not null default false,
  add column if not exists expenses numeric(14, 2),
  add column if not exists expenses_currency text,
  add column if not exists available_from date,
  add column if not exists pets_policy text not null default '',
  add column if not exists requirements text not null default '',
  add column if not exists amenities jsonb not null default '[]'::jsonb;

alter table public.properties drop constraint if exists properties_currency_check;
alter table public.properties drop constraint if exists properties_expenses_currency_check;
alter table public.properties drop constraint if exists properties_property_type_check;

alter table public.properties
  add constraint properties_currency_check
    check (currency in ('USD', 'ARS')),
  add constraint properties_expenses_currency_check
    check (expenses_currency is null or expenses_currency in ('USD', 'ARS')),
  add constraint properties_property_type_check
    check (property_type in ('Departamento', 'Casa', 'PH', 'Loft', 'Townhouse', 'Oficina', 'Local'));

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

create table if not exists public.owner_settlements (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rental_contracts (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  settlement_month text not null,
  owner_name text not null,
  owner_email text,
  owner_phone text,
  rent_collected numeric(14, 2) not null default 0,
  management_fee_percent numeric(7, 2) not null default 0,
  management_fee_amount numeric(14, 2) not null default 0,
  monthly_owner_costs numeric(14, 2) not null default 0,
  other_charges_amount numeric(14, 2) not null default 0,
  other_charges_detail text not null default '',
  owner_payout_amount numeric(14, 2) not null default 0,
  status text not null default 'Emitida' check (status in ('Borrador', 'Emitida', 'Pagada')),
  sent_at timestamptz,
  paid_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (contract_id, settlement_month)
);

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  conversation_id uuid unique references public.marketplace_conversations (id) on delete set null,
  inquiry_id uuid unique references public.catalog_inquiries (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  source text not null default 'manual',
  stage text not null default 'Nuevo' check (stage in ('Nuevo', 'Precalificado', 'Visita', 'Seguimiento', 'Propuesta', 'Cerrado', 'Descartado')),
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  score integer not null default 0 check (score >= 0 and score <= 100),
  qualification_summary text not null default '',
  ai_reply_draft text not null default '',
  intent text,
  desired_operation text,
  desired_location text,
  desired_timeline text,
  budget text,
  requirements_summary text,
  last_customer_message text not null default '',
  needs_response boolean not null default true,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  last_activity_at timestamptz not null default timezone('utc'::text, now()),
  owner_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.visit_appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'Programada' check (status in ('Programada', 'Confirmada', 'Realizada', 'Reprogramar', 'Cancelada')),
  notes text not null default '',
  reminder_sent_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.employee_tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  visit_id uuid references public.visit_appointments (id) on delete cascade,
  title text not null,
  details text not null default '',
  due_at timestamptz not null,
  task_type text not null default 'General' check (task_type in ('Responder', 'Seguimiento', 'Visita', 'Contrato', 'General')),
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  status text not null default 'Pendiente' check (status in ('Pendiente', 'Hecha')),
  automation_source text,
  assigned_user_id uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.crm_lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'web', 'instagram', 'crm')),
  direction text not null check (direction in ('incoming', 'outgoing')),
  sender_role text not null check (sender_role in ('customer', 'assistant', 'agent', 'system')),
  content text not null,
  wa_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.crm_lead_messages
  drop constraint if exists crm_lead_messages_channel_check;

alter table public.crm_lead_messages
  add constraint crm_lead_messages_channel_check
  check (channel in ('whatsapp', 'web', 'instagram', 'crm'));

create table if not exists public.agency_message_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  template_key text not null check (template_key in ('rental_requirements', 'sale_reply', 'follow_up', 'visit_confirmation', 'gentle_rejection')),
  label text not null,
  body text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (agency_id, template_key)
);

create unique index if not exists crm_lead_messages_wa_message_id_idx
  on public.crm_lead_messages (wa_message_id)
  where wa_message_id is not null;

alter table public.agencies
  add column if not exists messaging_instance text not null default 'agentcore',
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;

alter table public.rental_contracts
  add column if not exists contract_file_name text,
  add column if not exists contract_file_path text,
  add column if not exists contract_file_mime_type text,
  add column if not exists contract_file_size_bytes integer,
  add column if not exists contract_text text not null default '',
  add column if not exists owner_name text,
  add column if not exists owner_phone text,
  add column if not exists owner_email text,
  add column if not exists management_fee_percent numeric(7, 2) not null default 0,
  add column if not exists monthly_owner_costs numeric(14, 2) not null default 0,
  add column if not exists owner_notes text not null default '';

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.properties enable row level security;
alter table public.catalog_inquiries enable row level security;
alter table public.marketplace_conversations enable row level security;
alter table public.marketplace_messages enable row level security;
alter table public.rental_contracts enable row level security;
alter table public.rental_adjustments enable row level security;
alter table public.owner_settlements enable row level security;
alter table public.crm_leads enable row level security;
alter table public.visit_appointments enable row level security;
alter table public.employee_tasks enable row level security;
alter table public.crm_lead_messages enable row level security;
alter table public.agency_message_templates enable row level security;

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
drop trigger if exists owner_settlements_set_updated_at on public.owner_settlements;
drop trigger if exists crm_leads_set_updated_at on public.crm_leads;
drop trigger if exists visit_appointments_set_updated_at on public.visit_appointments;
drop trigger if exists employee_tasks_set_updated_at on public.employee_tasks;
drop trigger if exists agency_message_templates_set_updated_at on public.agency_message_templates;

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

create trigger owner_settlements_set_updated_at
  before update on public.owner_settlements
  for each row execute procedure public.touch_updated_at();

create trigger crm_leads_set_updated_at
  before update on public.crm_leads
  for each row execute procedure public.touch_updated_at();

create trigger visit_appointments_set_updated_at
  before update on public.visit_appointments
  for each row execute procedure public.touch_updated_at();

create trigger employee_tasks_set_updated_at
  before update on public.employee_tasks
  for each row execute procedure public.touch_updated_at();

create trigger agency_message_templates_set_updated_at
  before update on public.agency_message_templates
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
drop policy if exists "Service role manages crm leads" on public.crm_leads;
drop policy if exists "Service role manages visit appointments" on public.visit_appointments;
drop policy if exists "Service role manages employee tasks" on public.employee_tasks;
drop policy if exists "Service role manages crm lead messages" on public.crm_lead_messages;
drop policy if exists "Service role manages agency message templates" on public.agency_message_templates;

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

create policy "Service role manages crm leads"
on public.crm_leads
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages visit appointments"
on public.visit_appointments
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages employee tasks"
on public.employee_tasks
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages crm lead messages"
on public.crm_lead_messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role manages agency message templates"
on public.agency_message_templates
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
