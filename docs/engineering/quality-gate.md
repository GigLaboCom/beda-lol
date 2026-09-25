# Quality gate

How code is accepted in this repo. The Rust half follows the same rules as
`mnemoria-server` (GigLaboCom/heretic-mnemoria: `CLAUDE.md` → «Quality gate
before every push», `docs/engineering/quality-gate.md`); the TypeScript half is
Biome + Nx.

## Before every push

```sh
task gate    # Rust: nightly fmt --check → touch crate roots → clippy -D warnings → cargo test --workspace
task check   # everything CI runs: Biome, shellcheck, typecheck, tests, builds, cargo-deny, sqlx --check, offline release build
```

`task hooks` installs a pre-push hook (`.githooks/pre-push`) that runs the fast
part — `cargo +nightly fmt --all -- --check` and `biome check` — the equivalent
of mnemoria's `.rusty-hook.toml` pre-push fmt check.

| Check | Command | Config |
| --- | --- | --- |
| Rust format | `cargo +nightly fmt --all -- --check` (`task fmt` writes) | `rustfmt.toml`: `reorder_imports`, `imports_granularity = "Module"`, `group_imports = "StdExternalCrate"` — nightly-only options, hence `+nightly` |
| Rust lints | `cargo clippy --workspace --all-targets -- -D warnings` | `[workspace.lints]` in `Cargo.toml` (clippy `pedantic` + the mnemoria-server lint list, `unsafe_code = "forbid"`), `clippy.toml` (`large-error-threshold = 256`, unwrap/expect allowed in tests only) |
| Rust tests | `cargo test --workspace` | DB tests need `BEDA_TEST_DATABASE_URL` (local Supabase); each runs in a rolled-back transaction |
| Rust supply chain | `cargo deny check` | `deny.toml` |
| sqlx offline data | `cargo sqlx prepare --workspace --check` | `.sqlx/` is committed |
| TS/JSON/CSS | `pnpm exec biome check .` (`biome ci` on CI) | `biome.json` |
| TS types, tests, builds | `pnpm nx run-many -t typecheck test build` | `nx.json`, package scripts |
| Shell | `shellcheck deploy/scripts/*.sh` | — |

## Rules

- **`--all-targets`**: clippy compiles every test target too, so it doubles as the
  compilation check for tests.
- **The warm-cache trap.** A clean clippy run means nothing until the changed crate
  roots are `touch`ed and it is re-run — cargo reports clean for lints it never
  re-evaluated. `task gate` does the touch.
- **Never ignore a compilation error**, in anyone's code. Runtime test failures may
  be set aside only when confirmed per target to depend on infrastructure (e.g. no
  local Supabase → DB tests skip themselves), each with its reason written down.
- **Every bug fixed gets a regression test**, named after the defect (not `test_7`),
  RED first, then GREEN, placed where the bug lives.
- **No `unwrap()`/`expect()`** outside tests and startup, **no `unsafe`**
  (`#![forbid(unsafe_code)]`, workspace lint).
- **Imports** grouped std / external / crate, one `use` per module path — enforced
  by rustfmt, don't hand-sort.
- New crates carry `[lints] workspace = true`.
- Write down what you ran and the result in the PR description (and in
  `docs/steps/PROGRESS.md` for step work).

## Differences from mnemoria-server

- Edition 2024 and a pinned toolchain (`rust-toolchain.toml`); mnemoria-server uses
  edition 2021 on recent stable. Nightly is used only for rustfmt in both.
- Clippy `pedantic` is on here as a group (mnemoria lists individual lints); the
  mnemoria list is included explicitly so both stay in step.
- CI is GitHub Actions (`.github/workflows/ci.yml`), not Woodpecker, and runs the
  full gate on every PR — there is no single slow agent to spare, so the
  `[skip-test]` / `[no-gate]` markers are not used here.
- The pre-push hook is a plain `core.hooksPath` script instead of `rusty-hook`
  (no build-time dev-dependency that rewrites `.git/hooks`).
