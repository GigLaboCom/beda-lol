-- Users and accounts (tenants). Supabase Auth owns identities (`auth.users`);
-- the app keeps its own row per person and per account:
--
--   app.users            one row per `auth.users` row (same id = JWT `sub`)
--   app.accounts         a tenant: everything a user owns later (tracker,
--                        yachts, wrecks) carries `account_id`, never `user_id`
--   app.account_members  who belongs to which account, with a role
--
-- Every new auth user gets a personal account where they are the owner, so a
-- token always resolves to a user and at least one account. Crews (S30b) add
-- another `kind` and more members. RLS is on with no policies, like every
-- table in `app`: only the API role (`bypassrls`) reads and writes.

create table app.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 64),
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  trusted boolean not null default false,
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.accounts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('personal')),
  name text not null default '' check (char_length(name) <= 64),
  owner_id uuid not null references app.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index accounts_one_personal_per_owner on app.accounts (owner_id)
  where kind = 'personal';

create table app.account_members (
  account_id uuid not null references app.accounts (id) on delete cascade,
  user_id uuid not null references app.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  -- Lower comes first: the account a request uses when it names none.
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index account_members_user_priority_idx on app.account_members (user_id, priority);

create trigger users_set_updated_at before update on app.users
  for each row execute function app.set_updated_at();
create trigger accounts_set_updated_at before update on app.accounts
  for each row execute function app.set_updated_at();

alter table app.users enable row level security;
alter table app.accounts enable row level security;
alter table app.account_members enable row level security;

-- Creates the user row, the personal account and the owner membership.
-- Idempotent, so the trigger and the backfill below share it.
create function app.provision_user(p_id uuid, p_meta jsonb) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(btrim(coalesce(
    p_meta ->> 'user_name',
    p_meta ->> 'preferred_username',
    p_meta ->> 'name',
    p_meta ->> 'full_name',
    ''
  )), 64);
  v_account uuid;
begin
  insert into app.users (id, display_name) values (p_id, v_name)
  on conflict (id) do nothing;

  select a.id into v_account from app.accounts a
  where a.owner_id = p_id and a.kind = 'personal';
  if v_account is null then
    insert into app.accounts (kind, name, owner_id) values ('personal', v_name, p_id)
    returning id into v_account;
  end if;

  insert into app.account_members (account_id, user_id, role, priority)
  values (v_account, p_id, 'owner', 0)
  on conflict (account_id, user_id) do nothing;
end;
$$;
revoke execute on function app.provision_user(uuid, jsonb) from public, anon, authenticated;

create function app.on_auth_user_created() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.provision_user(new.id, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  return new;
end;
$$;
revoke execute on function app.on_auth_user_created() from public, anon, authenticated;

create trigger app_on_auth_user_created after insert on auth.users
  for each row execute function app.on_auth_user_created();

-- Users that signed up before this migration.
do $$
begin
  perform app.provision_user(u.id, coalesce(u.raw_user_meta_data, '{}'::jsonb)) from auth.users u;
end
$$;
