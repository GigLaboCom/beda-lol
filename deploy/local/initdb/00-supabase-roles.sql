-- The part of the Supabase base schema our migrations rely on: the API roles
-- (anon, authenticated, service_role) and an `auth` schema. Local stack only;
-- the Supabase CLI (`supabase start`) remains the reference for CI and tests.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
