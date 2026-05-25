alter table public.crm_lead_messages replica identity full;

grant select on public.crm_lead_messages to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'crm_lead_messages'
    )
  then
    alter publication supabase_realtime add table public.crm_lead_messages;
  end if;
end $$;

drop policy if exists "CRM users can read realtime lead messages" on public.crm_lead_messages;

create policy "CRM users can read realtime lead messages"
on public.crm_lead_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and (
        profile.role = 'superadmin'
        or (
          profile.role in ('agency_admin', 'agent')
          and exists (
            select 1
            from public.agencies agency
            where agency.id = crm_lead_messages.agency_id
              and agency.slug = profile.agency_slug
          )
        )
      )
  )
);
