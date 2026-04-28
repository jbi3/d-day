# CLAUDE.md

Working instructions for Claude on the d-day project. `brief.md` is the
source of truth for scope, success criteria, and roadmap — this file does
not duplicate it.

## Sourcing posture (non-negotiable)

Every historical claim — unit position, movement, timing, casualty,
event — must carry at least one citation drawn from the shortlist in
`brief.md` or a source the user has explicitly approved.

- Do **not** invent or infer positions/timings to fill gaps. If sources
  don't say, say so.
- When sources conflict, record **all** of them and flag the disagreement.
  Never silently pick one.
- Beevor and other narrative works are cross-checks, not primary sources.

## Governance

The user retains final say on contested historical facts, scope changes,
and tech commitments. Surface tradeoffs and disagreements explicitly —
do not pick silently between options.

## Scope discipline

Stay inside the **MVP slice** (Omaha + US airborne, division-level,
June 5 22:00 → June 6 18:00) unless the user explicitly broadens scope.

The mixed-granularity / zoom-LOD problem is deferred past MVP **on
purpose** (brief flags it as ~half the project's effort). Do not try to
solve it early.

## Tech stack

The stack listed in `brief.md` is **proposed, not validated**. Any
decision that locks in a renderer, tile format, app shell, or hosting
target needs explicit user sign-off before implementation. Flag it.

## Progress tracking

`progress.md` is the running project log.

- **Top:** current state — phase, what's done, what's next, open
  questions, known blockers. Rewritten in place.
- **Bottom:** append-only chronological log, dated entries.

Update `progress.md` when a turn includes any of:
- a scope decision (broadened, narrowed, deferred)
- a milestone reached or phase transition
- a tech choice resolved or rejected
- a blocker identified or cleared
- a sourcing decision on a contested fact

Routine reads, exploratory Q&A, and trivial edits do **not** need an
entry. A `Stop` hook will prompt to consider an update at end of turn —
acknowledge and skip if nothing material happened.

## Conventions

- **File names:** kebab-case. Exceptions for ecosystem-recognized files
  (`README.md`, `LICENSE`, `CLAUDE.md`, `package.json`, `.gitignore`).
- **Branches:** `claude/<topic>-<id>`.
