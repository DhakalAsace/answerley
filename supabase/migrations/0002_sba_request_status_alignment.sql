do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'sba_request_status_v2'
  ) then
    create type public.sba_request_status_v2 as enum ('new', 'contacted', 'booked', 'completed', 'archived');
  end if;
end $$;

alter table public.sba_requests
  alter column status drop default;

alter table public.sba_requests
  alter column status type public.sba_request_status_v2
  using (
    case status::text
      when 'new' then 'new'
      when 'contacted' then 'contacted'
      when 'booked' then 'booked'
      when 'completed' then 'completed'
      when 'archived' then 'archived'
      when 'sent' then 'contacted'
      when 'captured' then 'new'
      when 'prepared' then 'new'
      when 'queued' then 'new'
      when 'dismissed' then 'archived'
      when 'failed' then 'archived'
      else 'new'
    end
  )::public.sba_request_status_v2;

alter table public.sba_requests
  alter column status set default 'new';

drop type if exists public.sba_request_status;

alter type public.sba_request_status_v2 rename to sba_request_status;
