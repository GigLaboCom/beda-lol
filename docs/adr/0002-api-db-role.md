# ADR 0002 — Database role for the API

Date: 2026-09-25 · Status: accepted

## Context

App tables live in schema `app`, closed to the Supabase Data API, with RLS enabled and no policies (amendment П-1, rule 1). Only the Rust API reads and writes them; it authorises every request itself (session JWT → `app.profiles` role).

## Decision

The API connects as a dedicated role `beda_api`:

- `LOGIN`, created by the first migration **without a password**; the password is set by hand per environment (`task db:dev-role` locally, the S06 runbook in prod) and lives only in the server `.env`.
- `USAGE` on schema `app`, `SELECT/INSERT/UPDATE/DELETE` on its tables, `USAGE/SELECT` on its sequences, plus default privileges for future tables.
- `BYPASSRLS`: RLS stays on as a second line of defence against the `anon`/`authenticated` roles and any future exposure, but it does not constrain the API — writing policies that duplicate the API's authorisation would be two sources of truth.
- Not `postgres`, not `service_role`: a leaked API connection string cannot touch `auth`, storage or other schemas, and cannot create objects.

## Consequences

- Schema changes run as `postgres` through the Supabase CLI (`supabase db push`), never as `beda_api`.
- New tables in `app` get grants through default privileges; each migration still enables RLS explicitly.
- Tests set `set local role beda_api` to prove the grants are enough.
