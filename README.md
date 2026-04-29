# d-day

Interactive, visual, sourced map of D-Day (June 6, 1944).

See [`brief.md`](./brief.md) for project scope, success criteria, MVP,
and roadmap. See [`mvp-execution-plan.md`](./mvp-execution-plan.md)
for the phase-by-phase plan to deliver the MVP, and
[`progress.md`](./progress.md) for the current state.

## Quick start

```sh
pnpm install
pnpm dev          # starts apps/web at http://localhost:5173
pnpm build        # production build
pnpm test         # workspace tests (schema + registry + data validation)
```

Requires Node ≥ 22 and pnpm ≥ 10. The web app is the SvelteKit
project under `apps/web/`. Data lives at the repo root under
`data/{units,events,sources}/` and is loaded into the app at build
time via Vite globs.

## Repo layout

```
apps/web/                       SvelteKit + Svelte 5 app
  src/lib/time-store.svelte.ts  Simulation clock with play/pause/seek
  src/lib/data-loader.ts        Reads + ajv-validates data, exposes lookups
  src/lib/layers/               deck.gl layer factories
    units.ts                    Unit markers + labels (NATO-flavored hue)
    frontline.ts                Soft per-side polylines
    events.ts                   Event pin markers
    uncertainty.ts              Halo around contested positions/events
  src/lib/components/
    timeline.svelte             Scrub bar + clickable event pins
    details.svelte              Right-side panel with sources + disputes

packages/data/schema/           @d-day/schema — types + JSON Schemas + ajv

data/units/                     Per-formation Unit + Movement files
data/events/d-day.json          MVP-window event list
data/sources/registry.json      Append-only source registry
```

## Sourcing posture

Every unit position, movement waypoint, and event has at least one
citation drawn from `data/sources/registry.json`. Where sources
disagree, the conflict is recorded in a `disputedBy: Dispute[]` field
where each `Dispute` is `{source, claim}`; the uncertainty layer
visualises any currently disputed position with a soft warm ring on
the map, and the details panel lists every claim verbatim.

The schema's `unit-data.test.ts`, `events-data.test.ts`, and
`registry.test.ts` enforce: every cited source ID exists in the
registry; movement.unitId matches its parent unit; IDs are unique.

See [`CLAUDE.md`](./CLAUDE.md) for the working agreement on sourcing,
scope discipline, and tech-stack governance.
