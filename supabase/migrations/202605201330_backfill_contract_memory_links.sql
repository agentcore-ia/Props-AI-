do $$
begin
create temp table tenant_contacts on commit drop as
  select
    rc.agency_id,
    rc.id as contract_id,
    rc.property_id,
    rc.tenant_name as display_name,
    case
      when regexp_replace(coalesce(rc.tenant_phone, ''), '\D', '', 'g') = '' then null
      when regexp_replace(coalesce(rc.tenant_phone, ''), '\D', '', 'g') like '54%' then regexp_replace(coalesce(rc.tenant_phone, ''), '\D', '', 'g')
      else '54' || regexp_replace(coalesce(rc.tenant_phone, ''), '\D', '', 'g')
    end as normalized_phone,
    nullif(lower(trim(coalesce(rc.tenant_email, ''))), '') as email,
    p.title as property_title,
    p.location as property_location
  from public.rental_contracts rc
  join public.properties p on p.id = rc.property_id
  where rc.status <> 'Finalizado'
    and (coalesce(rc.tenant_phone, '') <> '' or coalesce(rc.tenant_email, '') <> '');

create temp table owner_contacts on commit drop as
  select
    rc.agency_id,
    rc.id as contract_id,
    rc.property_id,
    coalesce(nullif(rco.full_name, ''), nullif(rc.owner_name, ''), 'Propietario') as display_name,
    case
      when regexp_replace(coalesce(rco.phone, rc.owner_phone, ''), '\D', '', 'g') = '' then null
      when regexp_replace(coalesce(rco.phone, rc.owner_phone, ''), '\D', '', 'g') like '54%' then regexp_replace(coalesce(rco.phone, rc.owner_phone, ''), '\D', '', 'g')
      else '54' || regexp_replace(coalesce(rco.phone, rc.owner_phone, ''), '\D', '', 'g')
    end as normalized_phone,
    nullif(lower(trim(coalesce(rco.email, rc.owner_email, ''))), '') as email,
    p.title as property_title,
    p.location as property_location,
    coalesce(rco.id::text, 'owner:' || rc.id::text) as owner_entity_id
  from public.rental_contracts rc
  join public.properties p on p.id = rc.property_id
  left join public.rental_contract_owners rco on rco.contract_id = rc.id
  where rc.status <> 'Finalizado'
    and (coalesce(rco.phone, rc.owner_phone, '') <> '' or coalesce(rco.email, rc.owner_email, '') <> '');

create temp table all_contacts on commit drop as
  select agency_id, display_name, normalized_phone, email
  from tenant_contacts
  union
  select agency_id, display_name, normalized_phone, email
  from owner_contacts;

create temp table distinct_contacts on commit drop as
  select distinct on (agency_id, coalesce(normalized_phone, email))
    agency_id,
    display_name,
    normalized_phone,
    email
  from all_contacts
  where coalesce(normalized_phone, email) is not null
  order by agency_id, coalesce(normalized_phone, email), display_name;

insert into public.client_memory_profiles (
  agency_id,
  display_name,
  normalized_phone,
  email,
  summary,
  facts,
  tags,
  last_interaction_at
)
select
  contact.agency_id,
  contact.display_name,
  contact.normalized_phone,
  contact.email,
  'Perfil creado desde contrato activo.',
  jsonb_build_object('source', 'contract_backfill'),
  array['contrato']::text[],
  timezone('utc'::text, now())
from distinct_contacts contact
where not exists (
  select 1
  from public.client_memory_profiles cmp
  where cmp.agency_id = contact.agency_id
    and (
      (contact.normalized_phone is not null and cmp.normalized_phone = contact.normalized_phone)
      or (contact.email is not null and lower(cmp.email) = contact.email)
    )
);

insert into public.client_memory_links (memory_id, agency_id, entity_type, entity_id, label, metadata)
select
  cmp.id,
  tenant.agency_id,
  'tenant',
  'tenant:' || tenant.contract_id::text,
  tenant.display_name,
  jsonb_build_object('contractId', tenant.contract_id, 'propertyId', tenant.property_id, 'propertyTitle', tenant.property_title)
from tenant_contacts tenant
join public.client_memory_profiles cmp
  on cmp.agency_id = tenant.agency_id
 and (
    (tenant.normalized_phone is not null and cmp.normalized_phone = tenant.normalized_phone)
    or (tenant.email is not null and lower(cmp.email) = tenant.email)
 )
on conflict (memory_id, entity_type, entity_id) do update
set label = excluded.label,
    metadata = excluded.metadata,
    updated_at = timezone('utc'::text, now());

insert into public.client_memory_links (memory_id, agency_id, entity_type, entity_id, label, metadata)
select
  cmp.id,
  owner.agency_id,
  'owner',
  owner.owner_entity_id,
  owner.display_name,
  jsonb_build_object('contractId', owner.contract_id, 'propertyId', owner.property_id, 'propertyTitle', owner.property_title)
from owner_contacts owner
join public.client_memory_profiles cmp
  on cmp.agency_id = owner.agency_id
 and (
    (owner.normalized_phone is not null and cmp.normalized_phone = owner.normalized_phone)
    or (owner.email is not null and lower(cmp.email) = owner.email)
 )
on conflict (memory_id, entity_type, entity_id) do update
set label = excluded.label,
    metadata = excluded.metadata,
    updated_at = timezone('utc'::text, now());

insert into public.client_memory_links (memory_id, agency_id, entity_type, entity_id, label, metadata)
select
  cmp.id,
  tenant.agency_id,
  'contract',
  tenant.contract_id::text,
  tenant.property_title || ' - ' || tenant.property_location,
  jsonb_build_object('propertyId', tenant.property_id, 'tenantName', tenant.display_name)
from tenant_contacts tenant
join public.client_memory_profiles cmp
  on cmp.agency_id = tenant.agency_id
 and (
    (tenant.normalized_phone is not null and cmp.normalized_phone = tenant.normalized_phone)
    or (tenant.email is not null and lower(cmp.email) = tenant.email)
 )
on conflict (memory_id, entity_type, entity_id) do update
set label = excluded.label,
    metadata = excluded.metadata,
    updated_at = timezone('utc'::text, now());

insert into public.client_memory_links (memory_id, agency_id, entity_type, entity_id, label, metadata)
select
  cmp.id,
  tenant.agency_id,
  'property',
  tenant.property_id::text,
  tenant.property_title || ' - ' || tenant.property_location,
  jsonb_build_object('contractId', tenant.contract_id)
from tenant_contacts tenant
join public.client_memory_profiles cmp
  on cmp.agency_id = tenant.agency_id
 and (
    (tenant.normalized_phone is not null and cmp.normalized_phone = tenant.normalized_phone)
    or (tenant.email is not null and lower(cmp.email) = tenant.email)
 )
on conflict (memory_id, entity_type, entity_id) do update
set label = excluded.label,
    metadata = excluded.metadata,
    updated_at = timezone('utc'::text, now());
end $$;
