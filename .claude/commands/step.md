Execute step $ARGUMENTS of the beda-giglabo plan.

1. Read `CLAUDE.md`, `docs/steps/README.md`, `docs/steps/PROGRESS.md`, and the file `docs/steps/S$ARGUMENTS-*.md`.
2. Confirm every dependency listed in the step is ticked in PROGRESS.md. If one is not, stop and tell me which.
3. Restate in 3–5 lines what you are about to do and which files you will touch. Then proceed without waiting unless the step has [HUMAN] items that block the start.
4. Work through the step's tasks in order, staying inside its scope.
5. Run the step's verification section and `task check` (from S00 on, once it exists). Fix until green.
6. Commit with Conventional Commit messages on branch `step/S$ARGUMENTS`.
7. Append the handover entry to `docs/steps/PROGRESS.md` and tick the step.
8. Finish with: what was done, deviations from the step, [HUMAN] items still open, and the exact next step. Do not start it.
