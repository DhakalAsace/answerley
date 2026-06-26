-- Small Business Answering foundation schema.
-- The canonical AnsweringSetup document is the source of truth; relational
-- tables capture versions, evidence, runtime compiles, calls, requests,
-- messages, and future provider integrations around it.

set statement_timeout = '10min';
set lock_timeout = '10s';

create extension if not exists pgcrypto;

do $$ begin
  create type public.sba_session_state as enum ('created', 'importing', 'test_ready', 'tested', 'saved', 'claimed', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_change_source as enum ('manual_ui', 'setup_assistant', 'website_builder', 'system', 'integration');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_change_status as enum ('proposed', 'applied', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_call_mode as enum ('test', 'live');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_call_status as enum ('connecting', 'active', 'completed', 'failed', 'abandoned', 'blocked_spam');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_transcript_speaker as enum ('caller', 'setup', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_outcome_type as enum ('details', 'request', 'message', 'followup', 'alert', 'transfer', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_request_type as enum ('appointment', 'message', 'callback', 'urgent', 'service', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_request_status as enum ('new', 'contacted', 'booked', 'completed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_message_status as enum ('captured', 'prepared', 'simulated', 'queued', 'sent', 'delivered', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_phone_number_status as enum ('not_connected', 'pending', 'active', 'paused', 'failed', 'released');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_subscription_status as enum ('none', 'trialing', 'active', 'past_due', 'paused', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sba_integration_status as enum ('not_connected', 'pending', 'connected', 'paused', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.sba_businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  submitted_website text,
  public_phone text,
  public_email text,
  timezone text not null default 'America/Chicago',
  status text not null default 'draft' check (status in ('draft', 'testing', 'live', 'paused')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sba_answering_setups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.sba_businesses(id) on delete cascade,
  schema_version text not null default '2.0.0-small-business-answering',
  draft_revision integer not null default 1 check (draft_revision > 0),
  live_revision integer not null default 0 check (live_revision >= 0),
  status_mode text not null default 'draft' check (status_mode in ('draft', 'testing', 'live', 'paused')),
  is_live boolean not null default false,
  is_paused boolean not null default false,
  needs_review boolean not null default true,
  last_published_at timestamptz,
  last_tested_at timestamptz,
  draft_document jsonb not null check (jsonb_typeof(draft_document) = 'object'),
  draft_field_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_field_metadata) = 'object'),
  live_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sba_setups_schema_matches_document check (draft_document->>'schemaVersion' = schema_version),
  constraint sba_setups_brand_matches_document check (draft_document->>'brand' = 'Small Business Answering')
);

create table if not exists public.sba_answering_setup_versions (
  id uuid primary key default gen_random_uuid(),
  setup_id uuid not null references public.sba_answering_setups(id) on delete cascade,
  revision integer not null check (revision > 0),
  version_kind text not null default 'draft_snapshot' check (version_kind in ('draft_snapshot', 'published', 'test_snapshot')),
  schema_version text not null,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  field_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(field_metadata) = 'object'),
  source public.sba_change_source not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  change_summary text,
  created_at timestamptz not null default now(),
  unique (setup_id, revision),
  constraint sba_setup_versions_schema_matches_document check (document->>'schemaVersion' = schema_version),
  constraint sba_setup_versions_brand_matches_document check (document->>'brand' = 'Small Business Answering')
);

alter table public.sba_answering_setups
  add constraint sba_answering_setups_live_version_fk
  foreign key (live_version_id)
  references public.sba_answering_setup_versions(id)
  on delete set null;

create table if not exists public.sba_guest_sessions (
  id uuid primary key default gen_random_uuid(),
  public_token_hash text not null unique,
  state public.sba_session_state not null default 'created',
  submitted_business text,
  submitted_website text,
  business_id uuid references public.sba_businesses(id) on delete set null,
  setup_id uuid references public.sba_answering_setups(id) on delete set null,
  setup_revision integer not null default 1 check (setup_revision > 0),
  setup_document jsonb check (setup_document is null or jsonb_typeof(setup_document) = 'object'),
  source_documents jsonb not null default '[]'::jsonb check (jsonb_typeof(source_documents) = 'array'),
  test_activity jsonb not null default '{}'::jsonb check (jsonb_typeof(test_activity) = 'object'),
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sba_guest_sessions_schema_matches_document check (
    setup_document is null or setup_document->>'schemaVersion' = '2.0.0-small-business-answering'
  ),
  constraint sba_guest_sessions_brand_matches_document check (
    setup_document is null or setup_document->>'brand' = 'Small Business Answering'
  )
);

create table if not exists public.sba_source_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.sba_businesses(id) on delete cascade,
  setup_id uuid references public.sba_answering_setups(id) on delete set null,
  canonical_source_id text,
  provider text not null default 'website_scrape',
  url text not null,
  page_title text,
  content_hash text,
  extracted_text text not null,
  fetch_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(fetch_metadata) = 'object'),
  fetched_at timestamptz not null default now(),
  unique (business_id, url, content_hash)
);

create table if not exists public.sba_answering_setup_changes (
  id uuid primary key default gen_random_uuid(),
  setup_id uuid not null references public.sba_answering_setups(id) on delete cascade,
  base_revision integer not null check (base_revision > 0),
  next_revision integer check (next_revision is null or next_revision > base_revision),
  source public.sba_change_source not null,
  user_instruction text,
  summary text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  requires_confirmation boolean not null default false,
  patch jsonb not null check (jsonb_typeof(patch) = 'array'),
  affected_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(affected_paths) = 'array'),
  conflicts jsonb not null default '[]'::jsonb check (jsonb_typeof(conflicts) = 'array'),
  status public.sba_change_status not null default 'proposed',
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create table if not exists public.sba_runtime_compilations (
  id uuid primary key default gen_random_uuid(),
  setup_id uuid not null references public.sba_answering_setups(id) on delete cascade,
  setup_revision integer not null check (setup_revision > 0),
  mode public.sba_call_mode not null,
  compiler_id text not null,
  compiler_model text not null,
  source_hash text not null,
  compiled_runtime jsonb not null check (jsonb_typeof(compiled_runtime) = 'object'),
  coverage_report jsonb not null default '{}'::jsonb check (jsonb_typeof(coverage_report) = 'object'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  unique (setup_id, setup_revision, mode, compiler_id)
);

create table if not exists public.sba_calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.sba_businesses(id) on delete cascade,
  setup_id uuid not null references public.sba_answering_setups(id) on delete restrict,
  setup_version_id uuid references public.sba_answering_setup_versions(id) on delete set null,
  setup_revision integer not null check (setup_revision > 0),
  mode public.sba_call_mode not null default 'test',
  status public.sba_call_status not null default 'completed',
  provider text,
  provider_call_id text,
  caller_name text,
  caller_phone text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  summary text,
  urgency text not null default 'normal' check (urgency in ('normal', 'important', 'urgent')),
  outcome text,
  owner_notified boolean not null default false,
  audio_chunk_count integer not null default 0 check (audio_chunk_count >= 0),
  audio_url text,
  recording_status text not null default 'none' check (recording_status in ('none', 'available', 'processing', 'failed')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sba_call_transcript_turns (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.sba_calls(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  speaker public.sba_transcript_speaker not null,
  text text not null,
  source text not null default 'simulated' check (source in ('simulated', 'gemini_live', 'manual', 'system')),
  started_at_ms integer check (started_at_ms is null or started_at_ms >= 0),
  ended_at_ms integer check (ended_at_ms is null or ended_at_ms >= 0),
  interrupted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (call_id, sequence)
);

create table if not exists public.sba_call_outcomes (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.sba_calls(id) on delete cascade,
  outcome_type public.sba_outcome_type not null,
  title text not null,
  detail text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.sba_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.sba_businesses(id) on delete cascade,
  setup_id uuid not null references public.sba_answering_setups(id) on delete restrict,
  call_id uuid references public.sba_calls(id) on delete set null,
  request_type public.sba_request_type not null,
  status public.sba_request_status not null default 'new',
  service_id text,
  caller_name text,
  caller_phone text,
  caller_email text,
  collected_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(collected_fields) = 'object'),
  preferred_time text,
  summary text,
  urgency text not null default 'normal' check (urgency in ('normal', 'important', 'urgent')),
  test_mode boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sba_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.sba_businesses(id) on delete cascade,
  setup_id uuid not null references public.sba_answering_setups(id) on delete restrict,
  call_id uuid references public.sba_calls(id) on delete set null,
  request_id uuid references public.sba_requests(id) on delete set null,
  category text not null check (category in ('owner_alert', 'caller_confirmation', 'internal', 'caller_message')),
  channel text not null check (channel in ('sms', 'email', 'in_app')),
  mode public.sba_call_mode not null default 'test',
  status public.sba_message_status not null default 'prepared',
  recipient_label text,
  recipient_address text,
  body text not null,
  provider text,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.sba_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.sba_businesses(id) on delete cascade,
  provider text,
  provider_number_id text,
  e164 text,
  display_number text,
  number_type text not null default 'answering_number' check (number_type in ('answering_number', 'forwarded_business_number')),
  status public.sba_phone_number_status not null default 'not_connected',
  forwarding_mode text not null default 'none' check (forwarding_mode in ('none', 'overflow', 'after_hours', 'all_calls')),
  forwarding_status text not null default 'not_configured' check (forwarding_status in ('not_configured', 'instructions_shown', 'verifying', 'active', 'failed')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sba_usage_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.sba_businesses(id) on delete cascade,
  call_id uuid references public.sba_calls(id) on delete set null,
  event_type text not null,
  quantity numeric not null check (quantity >= 0),
  billable boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

create table if not exists public.sba_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.sba_businesses(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_key text not null default 'free',
  status public.sba_subscription_status not null default 'none',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sba_integration_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.sba_businesses(id) on delete cascade,
  connection_type text not null check (connection_type in ('calendar', 'sms', 'email', 'phone', 'crm', 'other')),
  provider text,
  display_name text not null,
  status public.sba_integration_status not null default 'not_connected',
  external_account_id text,
  secret_reference text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sba_audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.sba_businesses(id) on delete cascade,
  setup_id uuid references public.sba_answering_setups(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'system' check (actor_type in ('guest', 'user', 'assistant', 'system', 'integration')),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists sba_businesses_owner_idx on public.sba_businesses(owner_user_id);
create index if not exists sba_guest_sessions_token_idx on public.sba_guest_sessions(public_token_hash);
create index if not exists sba_guest_sessions_expiry_idx on public.sba_guest_sessions(expires_at) where claimed_at is null;
create index if not exists sba_setups_business_idx on public.sba_answering_setups(business_id);
create index if not exists sba_setup_versions_setup_revision_idx on public.sba_answering_setup_versions(setup_id, revision desc);
create index if not exists sba_setup_changes_setup_created_idx on public.sba_answering_setup_changes(setup_id, created_at desc);
create index if not exists sba_source_documents_business_idx on public.sba_source_documents(business_id, fetched_at desc);
create index if not exists sba_runtime_compilations_setup_revision_idx on public.sba_runtime_compilations(setup_id, setup_revision desc);
create index if not exists sba_calls_business_started_idx on public.sba_calls(business_id, started_at desc);
create index if not exists sba_calls_setup_revision_idx on public.sba_calls(setup_id, setup_revision desc);
create index if not exists sba_transcript_call_sequence_idx on public.sba_call_transcript_turns(call_id, sequence);
create index if not exists sba_outcomes_call_idx on public.sba_call_outcomes(call_id);
create index if not exists sba_requests_business_created_idx on public.sba_requests(business_id, created_at desc);
create index if not exists sba_messages_business_created_idx on public.sba_messages(business_id, created_at desc);
create index if not exists sba_usage_business_occurred_idx on public.sba_usage_events(business_id, occurred_at desc);
create index if not exists sba_audit_business_created_idx on public.sba_audit_events(business_id, created_at desc);

create or replace function public.sba_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sba_businesses_updated_at on public.sba_businesses;
create trigger sba_businesses_updated_at before update on public.sba_businesses for each row execute function public.sba_set_updated_at();

drop trigger if exists sba_answering_setups_updated_at on public.sba_answering_setups;
create trigger sba_answering_setups_updated_at before update on public.sba_answering_setups for each row execute function public.sba_set_updated_at();

drop trigger if exists sba_guest_sessions_updated_at on public.sba_guest_sessions;
create trigger sba_guest_sessions_updated_at before update on public.sba_guest_sessions for each row execute function public.sba_set_updated_at();

drop trigger if exists sba_calls_updated_at on public.sba_calls;
create trigger sba_calls_updated_at before update on public.sba_calls for each row execute function public.sba_set_updated_at();

drop trigger if exists sba_requests_updated_at on public.sba_requests;
create trigger sba_requests_updated_at before update on public.sba_requests for each row execute function public.sba_set_updated_at();

drop trigger if exists sba_phone_numbers_updated_at on public.sba_phone_numbers;
create trigger sba_phone_numbers_updated_at before update on public.sba_phone_numbers for each row execute function public.sba_set_updated_at();

drop trigger if exists sba_subscriptions_updated_at on public.sba_subscriptions;
create trigger sba_subscriptions_updated_at before update on public.sba_subscriptions for each row execute function public.sba_set_updated_at();

drop trigger if exists sba_integration_connections_updated_at on public.sba_integration_connections;
create trigger sba_integration_connections_updated_at before update on public.sba_integration_connections for each row execute function public.sba_set_updated_at();

create or replace function public.sba_prevent_setup_version_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Small Business Answering setup versions are immutable snapshots';
end;
$$;

drop trigger if exists sba_answering_setup_versions_no_update on public.sba_answering_setup_versions;
create trigger sba_answering_setup_versions_no_update
before update on public.sba_answering_setup_versions
for each row execute function public.sba_prevent_setup_version_mutation();

alter table public.sba_businesses enable row level security;
alter table public.sba_answering_setups enable row level security;
alter table public.sba_answering_setup_versions enable row level security;
alter table public.sba_guest_sessions enable row level security;
alter table public.sba_source_documents enable row level security;
alter table public.sba_answering_setup_changes enable row level security;
alter table public.sba_runtime_compilations enable row level security;
alter table public.sba_calls enable row level security;
alter table public.sba_call_transcript_turns enable row level security;
alter table public.sba_call_outcomes enable row level security;
alter table public.sba_requests enable row level security;
alter table public.sba_messages enable row level security;
alter table public.sba_phone_numbers enable row level security;
alter table public.sba_usage_events enable row level security;
alter table public.sba_subscriptions enable row level security;
alter table public.sba_integration_connections enable row level security;
alter table public.sba_audit_events enable row level security;

revoke all on table public.sba_businesses from anon, authenticated;
revoke all on table public.sba_answering_setups from anon, authenticated;
revoke all on table public.sba_answering_setup_versions from anon, authenticated;
revoke all on table public.sba_guest_sessions from anon, authenticated;
revoke all on table public.sba_source_documents from anon, authenticated;
revoke all on table public.sba_answering_setup_changes from anon, authenticated;
revoke all on table public.sba_runtime_compilations from anon, authenticated;
revoke all on table public.sba_calls from anon, authenticated;
revoke all on table public.sba_call_transcript_turns from anon, authenticated;
revoke all on table public.sba_call_outcomes from anon, authenticated;
revoke all on table public.sba_requests from anon, authenticated;
revoke all on table public.sba_messages from anon, authenticated;
revoke all on table public.sba_phone_numbers from anon, authenticated;
revoke all on table public.sba_usage_events from anon, authenticated;
revoke all on table public.sba_subscriptions from anon, authenticated;
revoke all on table public.sba_integration_connections from anon, authenticated;
revoke all on table public.sba_audit_events from anon, authenticated;

grant all on table public.sba_businesses to service_role;
grant all on table public.sba_answering_setups to service_role;
grant all on table public.sba_answering_setup_versions to service_role;
grant all on table public.sba_guest_sessions to service_role;
grant all on table public.sba_source_documents to service_role;
grant all on table public.sba_answering_setup_changes to service_role;
grant all on table public.sba_runtime_compilations to service_role;
grant all on table public.sba_calls to service_role;
grant all on table public.sba_call_transcript_turns to service_role;
grant all on table public.sba_call_outcomes to service_role;
grant all on table public.sba_requests to service_role;
grant all on table public.sba_messages to service_role;
grant all on table public.sba_phone_numbers to service_role;
grant all on table public.sba_usage_events to service_role;
grant all on table public.sba_subscriptions to service_role;
grant all on table public.sba_integration_connections to service_role;
grant all on table public.sba_audit_events to service_role;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

notify pgrst, 'reload schema';
