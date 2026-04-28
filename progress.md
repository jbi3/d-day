# Progress

Running log of project and scope state. See `brief.md` for the
authoritative scope. Top section is the current snapshot, rewritten in
place. Bottom section is an append-only dated log.

## Current state

**Phase:** Pre-Session 2 — execution plan adopted, awaiting tech-stack
sign-off (0.0).

**Done**
- `brief.md` — scope, success criteria, MVP slice, roadmap, sourcing
  posture, conventions.
- `README.md` — project pointer.
- `CLAUDE.md` — working instructions for Claude on this repo.
- `progress.md` — this file, with Stop-hook reminder wired in.
- `mvp-execution-plan.md` — refined MVP execution plan: vertical slice
  before fan-out; tech-stack as gate; painted basemap deferred out of
  MVP.

**Next**
- 0.0 tech-stack sign-off (user gate).
- Then 0.1 SvelteKit + MapLibre + deck.gl scaffold and 0.2 data
  schemas (parallel after 0.0).

**Open questions / unresolved**
- Tech stack in `brief.md` is proposed, not validated. Renderer, tile
  format, app shell, hosting all pending sign-off in 0.0.
- Uncertainty visual treatment for contested German positions —
  schema models `disputedBy` in 0.2, but visual design (B.7) not
  started.

**Known blockers**
- None.

---

## Log

### 2026-04-29 — Session 1 closeout, repo bootstrapped
- `brief.md` and `README.md` pushed to `main` (commit `e4d06e9`).
- Added `CLAUDE.md` codifying sourcing posture, governance, scope
  discipline, tech-stack-not-validated rule, and progress-tracking
  convention.
- Initialized `progress.md` (this file).
- Configured project-scoped `Stop` hook to prompt progress-update
  consideration at end of turn (soft reminder, not hard block).

### 2026-04-29 — Bootstrap committed and pushed
- Commit `f320ecd` pushed to `origin/main`: `CLAUDE.md`, `progress.md`,
  `.claude/settings.json`, `.gitignore` (excludes
  `.claude/settings.local.json`).
- Env note: bare `git push` failed with `Permission denied (publickey)`;
  `GIT_SSH_COMMAND="ssh" git push` worked. Root cause not yet
  identified — `~/.ssh/config` and Git Bash's `/usr/bin/ssh` both
  resolve `github-perso` correctly. Revisit if it recurs.

### 2026-04-29 — MVP execution plan adopted
- `mvp-execution-plan.md` added at repo root (branch
  `claude/mvp-execution-plan-001`).
- Chose vertical-slice ordering (US 1st ID end-to-end before
  dataset/renderer fan-out) over the draft's broad parallelism, to
  surface schema gaps under a real renderer before six dataset
  authors hit them.
- Promoted the source registry seed to Phase 0.3 (was buried in
  Stream A) so every dataset task starts with valid SourceIDs.
- Tech stack (renderer / tiles / app shell / hosting) reframed as a
  Phase 0.0 user-sign-off gate, not a locked decision.
- `disputedBy` (or equivalent) treated as a first-class schema field
  in 0.2, with a fixture exercising it, so contested facts can't be
  silently picked downstream.
- Painted basemap moved out of MVP and into the post-MVP roadmap;
  MVP ships on a placeholder MapLibre style. Brief flagged painted
  basemaps as a risk; not the place to absorb that risk during
  integration.
- Hard perf numbers (TTI / fps) demoted to qualitative for MVP;
  promote to gated targets in v1 once a real basemap is in.
