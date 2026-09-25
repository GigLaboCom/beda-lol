# Steps

Each step is one Claude Code session that leaves the repo green (`task check` passes) and, from S06 on, production working. Steps are small on purpose: a wrong step is cheaper to redo than to repair.

## Order

| Step | Title | Stage | Depends on |
| --- | --- | --- | --- |
| S00 | Repository bootstrap | 0 Foundation | — |
| S01 | Rust API skeleton | 0 | S00 |
| S02 | Supabase: local stack, migrations, sqlx | 0 | S01 |
| S03 | Astro web skeleton and tokens | 0 | S00 |
| S04 | CI and repository hygiene | 0 | S01, S02, S03 |
| S05 | Container images and prod compose | 0 | S04 |
| S06 | Server, deploy workflow, backups | 0 | S05 |
| S07 | `packages/core`: quiz and name game logic | 1 Static + quiz | S03 |
| S08 | `packages/transom`: board component | 1 | S03 |
| S09 | Home page | 1 | S07, S08 |
| S10 | Ship inspection quiz and result page | 1 | S09, S02 |
| S11 | Name game page | 1 | S09 |
| S12 | Six pillar articles | 1 | S09 |
| S13 | Share images (729 prebuilt) | 1 | S10 |
| S14 | SEO baseline and launch of stage 1 | 1 | S10–S13, S06 |
| S15+ | Stages 2–6 | see `ROADMAP.md` | — |

S01–S03 can run in parallel sessions if you want; S07 and S08 too.

## Step file template

```
# SNN — Title

Stage · Depends on · Rough size

## Goal
One or two sentences: the observable result.

## Read first
Spec sections and archive files, with paths.

## Tasks
Numbered, concrete: files, contents, behaviour.

## Out of scope
What not to touch in this step.

## Verify
Commands that must pass and manual checks.

## Done when
Checklist.

## [HUMAN]
Only if the step needs actions outside the repo.
```

## Handover entry (append to PROGRESS.md)

```
### SNN — Title — YYYY-MM-DD
- Done: …
- Deviations from step/spec: … (or "none")
- New deps: … (or "none")
- Follow-ups: …
- [HUMAN] open: … (or "none")
```
