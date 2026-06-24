-- Answerley foundation schema
-- Canonical Answering Plan lives in JSONB; operational activity uses relational tables.

create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.change_source as enum ('manual_ui', 'plan_assistant', 'website_builder', 'system', 'integration');
create type public.change_status as enum ('proposed', 'applied', 'rejected');
create type public.call_mode as enum ('test', 'live');
create type public.call_status as enum ('connecting', 'active', 'completed', 'failed', 'abandoned', 'blocked_spam');
create type public.message_status as enum ('captured', 'prepared', 'simulated', 'queued', 'sent', 'delivered', 'failed');
create type public.phone_number_status as enum ('pending', 'active', 'paused', 'failed', 'released');
create type public.subscription_status as enum ('none', 'trialing', 'active', 'past_due', 'paused', 'canceled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  submitted_website text,
  import_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pre-signup product state. This table is server-only and has no public RLS policy.
-- A signed opaque token is stored as a hash; the guest plan is claimed into an
-- authenticated workspace after signup.
create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  claim_token_hash text not null unique,
  submitted_business text,
  state text not null default 'created' check (state in ('created', 'importing', 'test_ready', 'tested', 'claimed', 'expired')),
  schema_version text not null default '1.0.0',
  plan_document jsonb check (plan_document is null or jsonb_typeof(plan_document) = 'object'),
  field_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(field_metadata) = 'object'),
  plan_revision integer not null default 1 check (plan_revision > 0),
  source_documents jsonb not null default '[]'::jsonb check (jsonb_typeof(source_documents) = 'array'),
  test_activity jsonb not null default '{}'::jsonb check (jsonb_typeof(test_activity) = 'object'),
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_sessions_schema_matches_document check (plan_document is null or plan_document->>'schemaVersion' = schema_version)
);

create table public.answering_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  schema_version text not null default '1.0.0',
  draft_document jsonb not null check (jsonb_typeof(draft_document) = 'object'),
  draft_field_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_field_metadata) = 'object'),
  draft_revision integer not null default 1 check (draft_revision > 0),
  published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint answering_plans_schema_matches_document check (draft_document->>'schemaVersion' = schema_version)
);

create table public.answering_plan_versions (
  id uuid primary key default gen_random_uuid(),
  answering_plan_id uuid not null references public.answering_plans(id) on delete cascade,
  revision integer not null check (revision > 0),
  schema_version text not null,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  field_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(field_metadata) = 'object'),
  created_by_type public.change_source not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  change_summary text,
  created_at timestamptz not null default now(),
  unique (answering_plan_id, revision),
  constraint answering_plan_versions_schema_matches_document check (document->>'schemaVersion' = schema_version)
);

alter table public.answering_plans
  add constraint answering_plans_published_version_fk
  foreign key (published_version_id)
  references public.answering_plan_versions(id)
  on delete set null;

create table public.answering_plan_changes (
  id uuid primary key default gen_random_uuid(),
  answering_plan_id uuid not null references public.answering_plans(id) on delete cascade,
  base_revision integer not null,
  next_revision integer,
  source public.change_source not null,
  user_instruction text,
  summary text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  requires_confirmation boolean not null default false,
  patch jsonb not null check (jsonb_typeof(patch) = 'array'),
  affected_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(affected_paths) = 'array'),
  conflicts jsonb not null default '[]'::jsonb check (jsonb_typeof(conflicts) = 'array'),
  status public.change_status not null default 'proposed',
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create table public.runtime_compilations (
  id uuid primary key default gen_random_uuid(),
  answering_plan_id uuid not null references public.answering_plans(id) on delete cascade,
  plan_revision integer not null,
  mode public.call_mode not null,
  compiler_id text not null,
  compiler_model text not null,
  source_hash text not null,
  compiled_runtime jsonb not null check (jsonb_typeof(compiled_runtime) = 'object'),
  coverage_report jsonb not null default '{}'::jsonb check (jsonb_typeof(coverage_report) = 'object'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  unique (answering_plan_id, plan_revision, mode, compiler_id)
);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null,
  url text not null,
  page_title text,
  content_hash text,
  extracted_text text not null,
  fetch_metadata jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  unique (business_id, url, content_hash)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_version_id uuid not null references public.answering_plan_versions(id) on delete restrict,
  plan_revision integer not null,
  mode public.call_mode not null,
  status public.call_status not null,
  provider text,
  provider_call_id text,
  caller_name text,
  caller_phone text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  sentiment text,
  urgency text not null default 'normal' check (urgency in ('normal', 'important', 'urgent')),
  summary text,
  outcome text,
  resolved boolean,
  owner_notified boolean not null default false,
  matched_scenario_ids jsonb not null default '[]'::jsonb,
  matched_routing_rule_ids jsonb not null default '[]'::jsonb,
  audio_url text,
  recording_status text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.call_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  event_type text not null,
  label text not null,
  plan_object_type text,
  plan_object_id text,
  operational_object_type text,
  operational_object_id uuid,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (call_id, sequence)
);

create table public.call_transcript_turns (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  speaker text not null check (speaker in ('caller', 'answerley', 'system')),
  text text not null,
  started_at_ms integer,
  ended_at_ms integer,
  interrupted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (call_id, sequence)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  plan_version_id uuid not null references public.answering_plan_versions(id) on delete restrict,
  request_type_id text not null,
  offering_id text,
  status text not null default 'requested',
  caller_name text,
  caller_phone text,
  caller_email text,
  collected_fields jsonb not null default '{}'::jsonb,
  preferred_date_time text,
  summary text,
  assigned_contact_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  request_id uuid references public.requests(id) on delete set null,
  plan_version_id uuid references public.answering_plan_versions(id) on delete restrict,
  follow_up_rule_id text,
  direction text not null check (direction in ('outbound', 'inbound', 'internal')),
  category text not null check (category in ('caller_message', 'caller_follow_up', 'owner_alert', 'system')),
  channel text not null check (channel in ('sms', 'email', 'in_app')),
  mode public.call_mode not null,
  status public.message_status not null,
  recipient_label text,
  recipient_address text,
  body text not null,
  provider text,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.plan_improvement_suggestions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  plan_version_id uuid references public.answering_plan_versions(id) on delete restrict,
  suggestion_type text not null check (suggestion_type in ('unknown_question', 'missing_information', 'behavior_change', 'source_conflict', 'custom')),
  title text not null,
  detail text,
  source_question text,
  proposed_patch jsonb check (proposed_patch is null or jsonb_typeof(proposed_patch) = 'array'),
  status text not null default 'open' check (status in ('open', 'applied', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'user' check (actor_type in ('user', 'assistant', 'system', 'integration')),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null,
  provider_number_id text,
  e164 text not null,
  display_number text not null,
  number_type text not null check (number_type in ('answerley_number', 'forwarded_business_number')),
  status public.phone_number_status not null default 'pending',
  forwarding_mode text not null default 'none' check (forwarding_mode in ('none', 'overflow', 'after_hours', 'all_calls')),
  forwarding_status text not null default 'not_configured' check (forwarding_status in ('not_configured', 'instructions_shown', 'verifying', 'active', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  event_type text not null,
  quantity numeric not null check (quantity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_key text not null default 'free',
  status public.subscription_status not null default 'none',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  connection_type text not null,
  provider text not null,
  display_name text not null,
  status text not null default 'pending',
  external_account_id text,
  secret_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_organization_idx on public.businesses(organization_id);
create index plan_versions_plan_revision_idx on public.answering_plan_versions(answering_plan_id, revision desc);
create index plan_changes_plan_created_idx on public.answering_plan_changes(answering_plan_id, created_at desc);
create index runtime_compilations_revision_idx on public.runtime_compilations(answering_plan_id, plan_revision desc);
create index calls_business_started_idx on public.calls(business_id, started_at desc);
create index call_events_call_sequence_idx on public.call_events(call_id, sequence);
create index transcripts_call_sequence_idx on public.call_transcript_turns(call_id, sequence);
create index requests_business_created_idx on public.requests(business_id, created_at desc);
create index messages_business_created_idx on public.messages(business_id, created_at desc);
create index improvement_suggestions_business_created_idx on public.plan_improvement_suggestions(business_id, created_at desc);
create index audit_events_org_created_idx on public.audit_events(organization_id, created_at desc);
create index guest_sessions_expiry_idx on public.guest_sessions(expires_at) where claimed_at is null;
create index usage_org_occurred_idx on public.usage_events(organization_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
create trigger guest_sessions_updated_at before update on public.guest_sessions for each row execute function public.set_updated_at();
create trigger answering_plans_updated_at before update on public.answering_plans for each row execute function public.set_updated_at();
create trigger calls_updated_at before update on public.calls for each row execute function public.set_updated_at();
create trigger requests_updated_at before update on public.requests for each row execute function public.set_updated_at();
create trigger phone_numbers_updated_at before update on public.phone_numbers for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger integration_connections_updated_at before update on public.integration_connections for each row execute function public.set_updated_at();

create or replace function public.prevent_plan_version_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Answering Plan versions are immutable snapshots';
end;
$$;

create trigger answering_plan_versions_no_update
before update on public.answering_plan_versions
for each row execute function public.prevent_plan_version_mutation();

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_editor(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_org_owner(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

create or replace function public.can_access_business(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business and public.is_org_member(b.organization_id)
  );
$$;

create or replace function public.can_edit_business(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business and public.is_org_editor(b.organization_id)
  );
$$;

create or replace function public.can_access_plan(target_plan uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.answering_plans p
    where p.id = target_plan and public.can_access_business(p.business_id)
  );
$$;

create or replace function public.can_edit_plan(target_plan uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.answering_plans p
    where p.id = target_plan and public.can_edit_business(p.business_id)
  );
$$;

-- Creates the authenticated workspace and initial immutable plan snapshot in
-- one transaction. The app validates the canonical Answering Plan before this
-- RPC is called.
create or replace function public.create_answerley_workspace(
  workspace_name text,
  business_website text,
  plan_schema_version text,
  initial_document jsonb,
  initial_field_metadata jsonb default '{}'::jsonb
)
returns table (
  organization_id uuid,
  business_id uuid,
  answering_plan_id uuid,
  plan_version_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  new_business_id uuid;
  new_plan_id uuid;
  new_version_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(trim(workspace_name), '') = '' then
    raise exception 'Workspace name is required';
  end if;
  if jsonb_typeof(initial_document) <> 'object' then
    raise exception 'Initial Answering Plan must be a JSON object';
  end if;
  if jsonb_typeof(initial_field_metadata) <> 'object' then
    raise exception 'Field metadata must be a JSON object';
  end if;
  if initial_document->>'schemaVersion' is distinct from plan_schema_version then
    raise exception 'Answering Plan schema version does not match document';
  end if;

  insert into public.organizations(name)
  values (workspace_name)
  returning id into new_org_id;

  insert into public.organization_members(organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  insert into public.businesses(organization_id, submitted_website, import_status)
  values (new_org_id, business_website, 'completed')
  returning id into new_business_id;

  insert into public.answering_plans(
    business_id, schema_version, draft_document, draft_field_metadata, draft_revision
  ) values (
    new_business_id, plan_schema_version, initial_document, initial_field_metadata, 1
  ) returning id into new_plan_id;

  insert into public.answering_plan_versions(
    answering_plan_id, revision, schema_version, document, field_metadata,
    created_by_type, created_by_user_id, change_summary
  ) values (
    new_plan_id, 1, plan_schema_version, initial_document, initial_field_metadata,
    'website_builder', auth.uid(), 'Initial Answering Plan'
  ) returning id into new_version_id;

  insert into public.subscriptions(organization_id, plan_key, status)
  values (new_org_id, 'free', 'none');

  return query select new_org_id, new_business_id, new_plan_id, new_version_id;
end;
$$;

-- Commits one validated plan change with optimistic revision checking, creates
-- an immutable snapshot, records the patch, and optionally publishes it.
create or replace function public.commit_answering_plan_revision(
  target_plan_id uuid,
  expected_revision integer,
  next_document jsonb,
  next_field_metadata jsonb,
  change_origin public.change_source,
  change_summary text,
  change_patch jsonb,
  change_risk_level text,
  change_user_instruction text default null,
  change_affected_paths jsonb default '[]'::jsonb,
  change_conflicts jsonb default '[]'::jsonb,
  publish_revision boolean default false
)
returns table (new_revision integer, plan_version_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_revision integer;
  current_schema_version text;
  target_business_id uuid;
  target_org_id uuid;
  next_revision integer;
  new_version_id uuid;
begin
  if not public.can_edit_plan(target_plan_id) then
    raise exception 'Not authorized to edit this Answering Plan';
  end if;
  if jsonb_typeof(next_document) <> 'object' or jsonb_typeof(next_field_metadata) <> 'object' then
    raise exception 'Plan document and metadata must be JSON objects';
  end if;
  if jsonb_typeof(change_patch) <> 'array'
    or jsonb_typeof(change_affected_paths) <> 'array'
    or jsonb_typeof(change_conflicts) <> 'array' then
    raise exception 'Patch, affected paths, and conflicts must be JSON arrays';
  end if;
  if change_risk_level not in ('low', 'medium', 'high') then
    raise exception 'Invalid change risk level';
  end if;

  select p.draft_revision, p.schema_version, p.business_id, b.organization_id
    into current_revision, current_schema_version, target_business_id, target_org_id
  from public.answering_plans p
  join public.businesses b on b.id = p.business_id
  where p.id = target_plan_id
  for update;

  if current_revision is null then
    raise exception 'Answering Plan not found';
  end if;
  if current_revision <> expected_revision then
    raise exception 'Plan revision conflict: expected %, current %', expected_revision, current_revision;
  end if;
  if next_document->>'schemaVersion' is distinct from current_schema_version then
    raise exception 'Answering Plan schema version does not match document';
  end if;

  next_revision := current_revision + 1;

  insert into public.answering_plan_versions(
    answering_plan_id, revision, schema_version, document, field_metadata,
    created_by_type, created_by_user_id, change_summary
  ) values (
    target_plan_id, next_revision, current_schema_version, next_document,
    next_field_metadata, change_origin, auth.uid(), change_summary
  ) returning id into new_version_id;

  update public.answering_plans
  set draft_document = next_document,
      draft_field_metadata = next_field_metadata,
      draft_revision = next_revision,
      published_version_id = case when publish_revision then new_version_id else published_version_id end
  where id = target_plan_id;

  insert into public.answering_plan_changes(
    answering_plan_id, base_revision, next_revision, source, user_instruction,
    summary, risk_level, requires_confirmation, patch, affected_paths,
    conflicts, status, created_by_user_id, applied_at
  ) values (
    target_plan_id, expected_revision, next_revision, change_origin,
    change_user_instruction, change_summary, change_risk_level,
    change_risk_level <> 'low', change_patch, change_affected_paths,
    change_conflicts, 'applied', auth.uid(), now()
  );

  insert into public.audit_events(
    organization_id, business_id, actor_user_id, actor_type, action,
    entity_type, entity_id, metadata
  ) values (
    target_org_id, target_business_id, auth.uid(),
    case when change_origin = 'plan_assistant' then 'assistant' else 'user' end,
    'answering_plan.revision_committed', 'answering_plan', target_plan_id::text,
    jsonb_build_object('revision', next_revision, 'summary', change_summary, 'published', publish_revision)
  );

  return query select next_revision, new_version_id;
end;
$$;

create or replace function public.publish_answering_plan(
  target_plan_id uuid,
  expected_revision integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_id uuid;
  target_business_id uuid;
  target_org_id uuid;
begin
  if not public.can_edit_plan(target_plan_id) then
    raise exception 'Not authorized to publish this Answering Plan';
  end if;

  select v.id, p.business_id, b.organization_id
    into version_id, target_business_id, target_org_id
  from public.answering_plans p
  join public.businesses b on b.id = p.business_id
  left join public.answering_plan_versions v
    on v.answering_plan_id = p.id and v.revision = p.draft_revision
  where p.id = target_plan_id and p.draft_revision = expected_revision
  for update of p;

  if target_business_id is null then
    raise exception 'Answering Plan not found or revision changed';
  end if;
  if version_id is null then
    raise exception 'No immutable snapshot exists for the current revision';
  end if;

  update public.answering_plans
  set published_version_id = version_id
  where id = target_plan_id;

  insert into public.audit_events(
    organization_id, business_id, actor_user_id, actor_type, action,
    entity_type, entity_id, metadata
  ) values (
    target_org_id, target_business_id, auth.uid(), 'user',
    'answering_plan.published', 'answering_plan', target_plan_id::text,
    jsonb_build_object('revision', expected_revision, 'versionId', version_id)
  );

  return version_id;
end;
$$;

revoke all on function public.create_answerley_workspace(text, text, text, jsonb, jsonb) from public, anon;
revoke all on function public.commit_answering_plan_revision(uuid, integer, jsonb, jsonb, public.change_source, text, jsonb, text, text, jsonb, jsonb, boolean) from public, anon;
revoke all on function public.publish_answering_plan(uuid, integer) from public, anon;
grant execute on function public.create_answerley_workspace(text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.commit_answering_plan_revision(uuid, integer, jsonb, jsonb, public.change_source, text, jsonb, text, text, jsonb, jsonb, boolean) to authenticated;
grant execute on function public.publish_answering_plan(uuid, integer) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.businesses enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.answering_plans enable row level security;
alter table public.answering_plan_versions enable row level security;
alter table public.answering_plan_changes enable row level security;
alter table public.runtime_compilations enable row level security;
alter table public.source_documents enable row level security;
alter table public.calls enable row level security;
alter table public.call_events enable row level security;
alter table public.call_transcript_turns enable row level security;
alter table public.requests enable row level security;
alter table public.messages enable row level security;
alter table public.plan_improvement_suggestions enable row level security;
alter table public.audit_events enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.usage_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.integration_connections enable row level security;

-- Guest sessions intentionally have no client policy. Server-side routes use
-- the service role and an opaque claim token. Authenticated workspaces use the
-- membership policies below.
create policy organizations_member_select on public.organizations for select using (public.is_org_member(id));
create policy organizations_admin_update on public.organizations for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));
create policy organizations_owner_delete on public.organizations for delete using (public.is_org_owner(id));

create policy organization_members_member_select on public.organization_members for select using (public.is_org_member(organization_id));
create policy organization_members_admin_write on public.organization_members for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy businesses_member_select on public.businesses for select using (public.is_org_member(organization_id));
create policy businesses_editor_write on public.businesses for all using (public.is_org_editor(organization_id)) with check (public.is_org_editor(organization_id));

create policy answering_plans_member_select on public.answering_plans for select using (public.can_access_business(business_id));
create policy answering_plans_editor_write on public.answering_plans for all using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));

create policy answering_plan_versions_member_select on public.answering_plan_versions for select using (public.can_access_plan(answering_plan_id));
create policy answering_plan_versions_editor_insert on public.answering_plan_versions for insert with check (public.can_edit_plan(answering_plan_id));

create policy answering_plan_changes_member_select on public.answering_plan_changes for select using (public.can_access_plan(answering_plan_id));
create policy answering_plan_changes_editor_write on public.answering_plan_changes for all using (public.can_edit_plan(answering_plan_id)) with check (public.can_edit_plan(answering_plan_id));

create policy runtime_compilations_member_select on public.runtime_compilations for select using (public.can_access_plan(answering_plan_id));
create policy runtime_compilations_editor_write on public.runtime_compilations for all using (public.can_edit_plan(answering_plan_id)) with check (public.can_edit_plan(answering_plan_id));

create policy source_documents_member_select on public.source_documents for select using (public.can_access_business(business_id));
create policy source_documents_editor_write on public.source_documents for all using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));

create policy calls_member_select on public.calls for select using (public.can_access_business(business_id));
create policy calls_editor_write on public.calls for all using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));
create policy call_events_member_select on public.call_events for select using (exists (select 1 from public.calls c where c.id = call_id and public.can_access_business(c.business_id)));
create policy call_events_editor_write on public.call_events for all using (exists (select 1 from public.calls c where c.id = call_id and public.can_edit_business(c.business_id))) with check (exists (select 1 from public.calls c where c.id = call_id and public.can_edit_business(c.business_id)));
create policy call_transcript_member_select on public.call_transcript_turns for select using (exists (select 1 from public.calls c where c.id = call_id and public.can_access_business(c.business_id)));
create policy call_transcript_editor_write on public.call_transcript_turns for all using (exists (select 1 from public.calls c where c.id = call_id and public.can_edit_business(c.business_id))) with check (exists (select 1 from public.calls c where c.id = call_id and public.can_edit_business(c.business_id)));

create policy requests_member_select on public.requests for select using (public.can_access_business(business_id));
create policy requests_editor_write on public.requests for all using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));
create policy messages_member_select on public.messages for select using (public.can_access_business(business_id));
create policy messages_editor_write on public.messages for all using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));
create policy improvement_suggestions_member_select on public.plan_improvement_suggestions for select using (public.can_access_business(business_id));
create policy improvement_suggestions_editor_write on public.plan_improvement_suggestions for all using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));
create policy audit_events_member_select on public.audit_events for select using (public.is_org_member(organization_id));
create policy audit_events_editor_insert on public.audit_events for insert with check (public.is_org_editor(organization_id));
create policy phone_numbers_member_select on public.phone_numbers for select using (public.can_access_business(business_id));
create policy phone_numbers_editor_write on public.phone_numbers for all using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));
create policy usage_events_member_select on public.usage_events for select using (public.is_org_member(organization_id));
create policy subscriptions_member_select on public.subscriptions for select using (public.is_org_member(organization_id));
create policy integration_connections_member_select on public.integration_connections for select using (public.can_access_business(business_id));
create policy integration_connections_editor_write on public.integration_connections for all using (public.can_edit_business(business_id)) with check (public.can_edit_business(business_id));
