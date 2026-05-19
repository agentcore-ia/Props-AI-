alter table public.rental_collections
  add column if not exists receipt_number text;

alter table public.owner_settlements
  add column if not exists settlement_number text;

alter table public.owner_transfers
  add column if not exists transfer_number text;

alter table public.cash_movements
  add column if not exists movement_number text;

alter table public.owner_settlements
  drop constraint if exists owner_settlements_contract_id_settlement_month_key;

create table if not exists public.financial_audit_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  document_number text not null default '',
  amount numeric(14, 2),
  currency text not null default 'ARS',
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists financial_audit_logs_agency_created_idx
  on public.financial_audit_logs (agency_id, created_at desc);

create index if not exists financial_audit_logs_entity_idx
  on public.financial_audit_logs (entity_table, entity_id);

create unique index if not exists rental_collections_receipt_number_idx
  on public.rental_collections (agency_id, receipt_number)
  where receipt_number is not null and receipt_number <> '';

create unique index if not exists owner_settlements_settlement_number_idx
  on public.owner_settlements (agency_id, settlement_number)
  where settlement_number is not null and settlement_number <> '';

create unique index if not exists owner_settlements_contract_owner_month_idx
  on public.owner_settlements (contract_id, settlement_month, coalesce(contract_owner_id, '00000000-0000-0000-0000-000000000000'::uuid));

create unique index if not exists owner_transfers_transfer_number_idx
  on public.owner_transfers (agency_id, transfer_number)
  where transfer_number is not null and transfer_number <> '';

create unique index if not exists cash_movements_movement_number_idx
  on public.cash_movements (agency_id, movement_number)
  where movement_number is not null and movement_number <> '';
