-- Schema `app` holds every application table. It is NOT exposed through the
-- Supabase Data API (see supabase/config.toml → [api].schemas): the browser key
-- is public, so all data goes through the Rust API. RLS is enabled on every
-- table with no policies (deny by default) as a second line of defence.

create schema if not exists app;

revoke all on schema app from public;
revoke all on schema app from anon, authenticated;
alter default privileges in schema app revoke all on tables from public, anon, authenticated;
alter default privileges in schema app revoke all on sequences from public, anon, authenticated;
alter default privileges in schema app revoke all on functions from public, anon, authenticated;

-- Anonymous quiz statistics: one row per completed inspection.
create table app.quiz_attempts (
  id bigserial primary key,
  scores smallint[] not null check (array_length(scores, 1) = 6),
  class text,
  shared boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

-- Product events. Never stores typed user input, only allow-listed names and flags.
create table app.events (
  id bigserial primary key,
  name text not null,
  user_id uuid,
  anon_id text,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_name_created_at_idx on app.events (name, created_at);

-- Outbox for side effects (cache purge, IndexNow, notifications).
create table app.jobs (
  id bigserial primary key,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  run_at timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  done_at timestamptz
);
create index jobs_pending_run_at_idx on app.jobs (run_at) where done_at is null;

-- Shared trigger function for tables with an `updated_at` column (used from stage 2 on).
create function app.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function app.set_updated_at() from public, anon, authenticated;

alter table app.quiz_attempts enable row level security;
alter table app.events enable row level security;
alter table app.jobs enable row level security;

-- Role the Rust API connects as. Created without a password: it is set per
-- environment by hand (dev: `task db:dev-role`; prod: S06 runbook).
-- BYPASSRLS because the API is the only reader/writer and does its own
-- authorisation; see docs/adr/0002-api-db-role.md.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'beda_api') then
    create role beda_api login bypassrls;
  end if;
  -- Postgres 16+ does not let the creator `set role` to a new role by default;
  -- the migration owner (Supabase `postgres`) gets it so tests and admins can
  -- act as the API role inside a transaction.
  execute format('grant beda_api to %I', current_user);
end
$$;

grant usage on schema app to beda_api;
grant select, insert, update, delete on all tables in schema app to beda_api;
grant usage, select on all sequences in schema app to beda_api;
grant execute on function app.set_updated_at() to beda_api;
alter default privileges in schema app grant select, insert, update, delete on tables to beda_api;
alter default privileges in schema app grant usage, select on sequences to beda_api;
