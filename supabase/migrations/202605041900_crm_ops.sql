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

alter table public.crm_leads enable row level security;
alter table public.visit_appointments enable row level security;
alter table public.employee_tasks enable row level security;

drop trigger if exists crm_leads_set_updated_at on public.crm_leads;
drop trigger if exists visit_appointments_set_updated_at on public.visit_appointments;
drop trigger if exists employee_tasks_set_updated_at on public.employee_tasks;

create trigger crm_leads_set_updated_at
before update on public.crm_leads
for each row execute procedure public.touch_updated_at();

create trigger visit_appointments_set_updated_at
before update on public.visit_appointments
for each row execute procedure public.touch_updated_at();

create trigger employee_tasks_set_updated_at
before update on public.employee_tasks
for each row execute procedure public.touch_updated_at();

drop policy if exists "Service role manages crm leads" on public.crm_leads;
drop policy if exists "Service role manages visit appointments" on public.visit_appointments;
drop policy if exists "Service role manages employee tasks" on public.employee_tasks;

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
