alter table public.agencies
  add column if not exists business_hours text not null default '';
