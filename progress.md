# Progress

Running log of project and scope state. See `brief.md` for the
authoritative scope. Top section is the current snapshot, rewritten in
place. Bottom section is an append-only dated log.

## Current state

**Phase:** Session 1 complete — brief, README, and Claude bootstrap on
`main`. Pre-Session 2.

**Done**
- `brief.md` — scope, success criteria, MVP slice, roadmap, sourcing
  posture, conventions.
- `README.md` — project pointer.
- `CLAUDE.md` — working instructions for Claude on this repo.
- `progress.md` — this file, with Stop-hook reminder wired in.

**Next (Session 2 per brief)**
- Define data schemas: unit, movement, event, source.
- Stand up minimal MapLibre + deck.gl page animating one unit on a
  placeholder basemap (tech-stack validation).

**Open questions / unresolved**
- Tech stack in `brief.md` is proposed, not validated. Renderer, tile
  format, app shell, hosting all pending sign-off.
- Painted basemap viability at all zoom levels — flagged as risk in
  brief.
- Uncertainty visual treatment for contested German positions — design
  not yet started.

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
