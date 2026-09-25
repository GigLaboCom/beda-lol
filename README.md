# beda.lol

**RU** — У тебя есть ПО, но нет Победы — плывёшь на «Беде».

> «Как вы яхту назовёте, так она и поплывёт.» — капитан Врунгель

**EN** — You've got the software (*ПО*, "PO") but no Victory (*Победа*, "Pobeda") —
so you sail on Trouble (*Беда*, "Beda"). In Russian, *ПО* + *Беда* spells *Победа*:
take the victory away from the software and all that's left is trouble.

> "Whatever you name your yacht, that's how it will sail." — Captain Vrungel

---

Source for [beda.lol](https://beda.lol) — the site of the rubric «Яхта Беда» about pet
projects that never get marketed. It turns the pun into interactives: a ship-inspection
quiz, a name game, a nail-by-nail progress tracker, a registry of projects and an
epitaph wall for abandoned ones.

## Monorepo

| Path | What |
| --- | --- |
| `apps/web` | Astro site (Node adapter, Preact islands) |
| `apps/api` | Rust API `beda-api` (axum, sqlx) |
| `packages/*` | shared TypeScript: `@beda/core`, `@beda/transom`, `@beda/tokens` |
| `supabase/` | Supabase CLI config and SQL migrations |
| `deploy/` | Docker Compose, Caddy, deploy and backup scripts |
| `docs/` | spec, amendments, tactics, ADRs, step files |
| `archive/` | read-only prototypes the site is ported from |

TypeScript projects are pnpm workspaces orchestrated by [Nx](https://nx.dev); the Rust
crate lives in a Cargo workspace at the root. [Task](https://taskfile.dev) ties both
halves together.

## Run it

Requirements: Node 22.12+ (CI uses the LTS from `.node-version`), pnpm via
`corepack enable`, Rust via `rustup`, Docker, Task, Supabase CLI.

```sh
pnpm install
task dev        # Supabase + API on :8080 + web on :4321
task check      # everything CI runs
pnpm nx graph   # project graph
```

## Docs

- Spec (Russian): `docs/07-spec-beda-giglabo.md`; amendments that override it: `docs/08-amendments.md`
- Step-by-step plan and progress: `docs/steps/` (`PROGRESS.md` is the log)
- Decisions: `docs/adr/`
- Working agreements for Claude Code: `CLAUDE.md`

## Brand

The code is MIT-licensed (see `LICENSE`). Texts, design and the «Яхта Беда» brand are
not covered by the MIT license.
