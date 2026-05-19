create unique index if not exists agencies_unique_messaging_instance_idx
  on public.agencies (messaging_instance)
  where messaging_instance is not null
    and btrim(messaging_instance) <> ''
    and messaging_instance <> 'agentcore';
