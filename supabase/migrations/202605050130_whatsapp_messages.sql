create table if not exists public.crm_lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  direction text not null check (direction in ('incoming', 'outgoing')),
  sender_role text not null check (sender_role in ('customer', 'assistant', 'agent', 'system')),
  content text not null,
  wa_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists crm_lead_messages_wa_message_id_idx
  on public.crm_lead_messages (wa_message_id)
  where wa_message_id is not null;

alter table public.crm_lead_messages enable row level security;

drop policy if exists "Service role manages crm lead messages" on public.crm_lead_messages;

create policy "Service role manages crm lead messages"
on public.crm_lead_messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
