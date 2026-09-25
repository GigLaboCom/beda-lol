# ADR 0001 — Stack

Date: 2026-09-25 · Status: accepted

## Decision

- **Web:** Astro with `@astrojs/node` (standalone) and Preact islands. Prerendered by default, SSR only for UGC, personal and service routes.
- **API:** Rust, one binary `beda-api` (axum, tokio, sqlx) — amendment П-2.
- **Data and auth:** Supabase — Postgres and Auth (GitHub, magic link). App tables live in schema `app`, closed to the Data API; the API connects directly and verifies Supabase JWTs locally — amendment П-1.
- **Monorepo:** pnpm workspaces + **Nx** for the TypeScript projects (instead of Turborepo from the spec), a Cargo workspace for Rust, Task as the common entry point.
- **Hosting:** one VPS with Docker Compose behind Caddy serves both web and api from one domain (`beda.lol`); deploys from GitHub Actions.

## Why

Content site with a few islands of interactivity; one domain means no CORS and one certificate. Rust is the author's language; Supabase removes self-built auth and database operations. Nx gives cached, graph-aware task runs for the frontend packages and can see the Rust project too.

## Open question

Data region. Supabase has no region in Russia; collecting e-mails from a Russian audience conflicts with the data-localisation requirement (П-1, rule 8). Fallback: self-hosted Supabase on our VPS.

## Links

- Spec: `docs/07-spec-beda-giglabo.md`
- Amendments: `docs/08-amendments.md`
