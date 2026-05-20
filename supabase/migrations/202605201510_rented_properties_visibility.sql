-- Keep rented properties out of the public marketplace and AI portfolio.

create or replace function public.sync_property_visibility_from_rental_contract()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Activo' then
    update public.properties
    set
      status = 'Alquilada',
      publish_marketplace = false,
      updated_at = now()
    where id = new.property_id;
  end if;

  return new;
end;
$$;

drop trigger if exists rental_contracts_sync_property_visibility on public.rental_contracts;

create trigger rental_contracts_sync_property_visibility
  after insert or update of status on public.rental_contracts
  for each row
  execute function public.sync_property_visibility_from_rental_contract();

update public.properties as p
set
  status = 'Alquilada',
  publish_marketplace = false,
  updated_at = now()
where exists (
  select 1
  from public.rental_contracts rc
  where rc.property_id = p.id
    and rc.status = 'Activo'
);
