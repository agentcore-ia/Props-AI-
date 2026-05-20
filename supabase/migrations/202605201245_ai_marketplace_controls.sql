alter table public.agencies
  add column if not exists whatsapp_ai_enabled boolean not null default true;

alter table public.properties
  add column if not exists publish_marketplace boolean not null default true;

create index if not exists properties_marketplace_visible_idx
  on public.properties (publish_marketplace, status, created_at desc);
