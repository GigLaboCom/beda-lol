# ADR 0003 — Users, accounts and the user behind every request

Date: 2026-09-28 · Status: accepted

## Context

Stage 2 adds sign-in (Supabase Auth, amendment П-1) and per-user data: the tracker, then yachts, wrecks, crews. The human asked for the model used in voxwrite-web's API: every handler can get the user from the token, and data is scoped to a tenant, so one person can later act in several accounts (crews, S30b) without a schema change.

## Decision

- **Tables** (schema `app`, RLS on, no policies):
  - `app.users`: one row per `auth.users` row, with the same id (the JWT `sub`), plus `display_name`, site `role` (`user` / `moderator` / `admin`), `trusted` and `status` (`active` / `blocked`). It replaces the planned `app.profiles` (amendment П-1) and holds the same columns.
  - `app.accounts`: the tenant. For now `kind = 'personal'`, one per user.
  - `app.account_members`: a user in an account, with a role (`owner` / `member`) and a `priority` (the lowest one is the default account).
- **Provisioning:** a trigger on `auth.users` insert calls `app.provision_user`, which creates the user row, the personal account and the owner membership. The function is idempotent, and the migration also runs it for users that already exist. Browser roles cannot execute it.
- **In the API:** the `CurrentUser` extractor (`apps/api/src/auth/user.rs`) runs these steps:
  1. verifies the bearer token locally against the project JWKS (ES256/RS256; `iss`, `aud = authenticated`, `exp`, UUID `sub`; anonymous sessions are refused);
  2. loads the user and their accounts (cached for 60 s);
  3. picks the account named by the `x-beda-account` header when the user belongs to it, otherwise the default one.

  `Option<CurrentUser>` serves routes that guests may use too. The role is read from `app.users`, never from the token.
- **Tenancy rule:** a table that holds user data carries `account_id` (references `app.accounts`). Handlers read and write it only with `user.account.id` from `CurrentUser`, never with an id taken from the request body.

- **On the site:** `@supabase/ssr` keeps the session in cookies. The middleware verifies it with `getClaims()` and sets `locals.auth` on on-demand pages. Server code calls the API with `apiFromServer(locals, …)`, islands with `apiFetch(cfg, …)`: both send the access token as a bearer header, and the browser uses supabase-js only to sign in.
- **Sign-in methods and linking (S17):** GitHub and the magic link, as Supabase implements them. Supabase links identities automatically by email ([Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)). When a GitHub sign-in brings the same email as an existing user, the GitHub identity joins that `auth.users` row. It keeps the same `app.users` row and personal account, because the provisioning trigger fires only on insert. Unconfirmed identities of that user are dropped, which prevents pre-account takeover. A GitHub account with a different email becomes a separate user. Manual linking (`linkIdentity`) stays off (`enable_manual_linking = false`) until the cabinet (S19) needs it. `beda-api admin promote` finds users by their GitHub identity, linked or not.
- **E-mail sign-in (S18):** one mail carries both the magic link and the same one-time code (`supabase/templates/sign_in.html`, used for both the "magic link" and the "confirm signup" template). The link works in the browser that asked for it (PKCE); the code works anywhere, e.g. when the mail is opened on a phone. Turnstile is checked by Supabase Auth itself (its CAPTCHA setting) on the request that sends the mail; entering the code needs no token. The Rust API never sees Turnstile.
- **Sign-in pages, header, cabinet (S19):** `/voiti` and `/kabinet` (and `/en/…`) render on demand, noindex. The sign-in island (`SignIn.tsx`) is the same on `/voiti` and on the `/dev/auth` bench. The header shows «Войти» or «Кабинет» from a server island (`HeaderAccount.astro`, `private, no-store`), so the pages around it stay prerendered. Sign-out, sign-out on all devices and account deletion are plain form POSTs to `/auth/signout` and `/auth/delete`, guarded by Astro's origin check. The mail's language follows `lang` in the user metadata, which the form sets when an address signs up.
- **Sign-out on all devices:** Supabase `signOut({ scope: 'global' })` revokes every refresh token of the user. Access tokens are stateless JWTs, so another device stays signed in until its token expires and the refresh fails: at most the JWT expiry (1 h by default). The API does not check `session_id` against `auth.sessions`; a sensitive operation that needs that can add it.
- **Account deletion (S19):** `DELETE /api/me` in the Rust API, with the Supabase secret key in the API's server `.env` only (amendment П-1, rules 5–6). The steps:
  1. `anonymise_user` detaches the user from every table that records a user id (today `app.events.user_id`), in one transaction;
  2. the Auth Admin API deletes the `auth.users` row, which ends the sessions and identities and cascades to `app.users`, the personal account and its account-scoped data;
  3. the user cache entry is dropped, so a still-valid token gets 401 at once.

  If step 2 fails, the answer is 500 and a retry completes the deletion. It is immediate, not deferred: the spec allows up to 30 days.

## Consequences

- Every protected route is one extractor argument away: `async fn handler(user: CurrentUser, …)`.
- Accounts other than personal ones (crews) are a new `kind` and more `account_members` rows; the handlers stay the same.
- A role or membership change takes up to 60 s to reach the API, unless the code that changes it calls `UserCache::invalidate`.
- Deleting an `auth.users` row cascades to the user, their personal account and their memberships. UGC anonymisation runs before that (amendment П-1, rule 6): every new table with user-authored rows adds its statement to `store::users::anonymise_user`.
