alter table public.crm_leads
add column if not exists ai_enabled boolean not null default true;

update public.crm_leads
set ai_enabled = true
where ai_enabled is null;
