# D-Day Interactive Map — Project Brief

> Session 1 artifact. Captures shared understanding before any code is written.

## One-line

A visual, scrub-through-time map of the Allied land & airborne operations in
Normandy on June 5–6, 1944, prioritising aesthetic, interactivity, and
historically sourced accuracy.

## Why this exists

Existing D-Day resources tend to be one of:

- text-heavy academic walls,
- single-sector or single-story focused (one beach, one regiment),
- visually dated (static arrows on a flat map),
- non-interactive.

This project aims for the opposite: **mostly visual, fully interactive,
whole-operation, and rigorously sourced.**

## Success criteria

1. **Rich visual map** — aesthetic basemap, smooth animation, accurate
   depiction of unit positions and movement.
2. **Easy interaction & good performance** — fast load, smooth pan/zoom,
   responsive timeline scrub.
3. **Historical accuracy** — every unit position, movement, and event ties
   back to at least one cited source. Contested facts are flagged, not hidden.

## Scope

### Time window

- **Core (MVP and v1):** June 5 1944, 18:00 → June 6 1944, 24:00.
- **Phase 2 stretch:** extend to June 12 (end of beachhead consolidation).

### Geography

- Normandy: Cotentin peninsula → mouth of the Orne.
- Full operation in v1; MVP is a slice (see below).

### Forces

- **Phase 1 (priority):** land units + airborne.
  - US: 1st & 29th ID (Omaha), 4th ID (Utah), 82nd & 101st Airborne.
  - UK/CA: 50th (Gold), 3rd Canadian (Juno), 3rd British (Sword), 6th Airborne.
  - German: 352nd, 716th, 91st, 21st Panzer, etc.
- **Phase 2 (later layers):** naval bombardment fleet, landing craft waves,
  air corridors and bombing runs.

### MVP slice

> Smaller than Phase 1. Goal: prove the time + visual model on a coherent
> US sector before scaling to the full operation.

- **Geography:** Omaha beach + US airborne drop zones (Cotentin).
- **Forces:** US 1st & 29th ID, US 82nd & 101st Airborne, opposing German
  units in sector (352nd, elements of 91st & 709th).
- **Time:** June 5 22:00 → June 6 18:00 (drop → beach secured).
- **Granularity:** division-level only, no zoom-LOD yet.
- **Layers:** land + airborne. No naval, no air.

## Granularity by zoom (LOD)

The dataset and renderer carry **mixed granularity**, surfaced by zoom level:

| Zoom | Scale | Symbols |
|---|---|---|
| Far | Whole Normandy | Division blobs, single frontline, broad arrows |
| Mid | One sector (e.g. Omaha + Pointe du Hoc) | Regiment / brigade, sub-arrows, beach exits |
| Close | One beach or town (e.g. Sainte-Mère-Église) | Battalion / company, drop zones, key buildings |

**This is the main complexity driver of the project.** Deferred past MVP.

## Visual direction

- **Basemap:** custom stylized / painted look — muted period palette,
  hand-feel coastline, 1944 place names. Authored in QGIS or Mapbox Studio,
  served as vector tiles (Protomaps `.pmtiles`).
- **Symbology:** simplified NATO-style (rectangles for infantry, ovals for
  armor, X for airborne) softened to fit the painted basemap. Allied/Axis
  split by hue family, not flat red/blue.
- **Frontline:** soft, animated line that morphs over time (not a hard
  polygon edge).
- **Movement:** tweened paths with fading trails. No teleporting markers.
- **Time UI:** prominent bottom timeline with play/pause, scrub, and
  clickable event pins (e.g. "06:30 — first wave hits Omaha",
  "01:30 — Pegasus Bridge taken").
- **Text:** minimal by default, surfaced on hover/click. Visual stays the
  hero.

## Tech stack (proposed, to validate next session)

- **Renderer:** MapLibre GL JS (vector basemap) + deck.gl (animated unit
  layers and time-aware overlays).
- **Tiles:** Protomaps (`.pmtiles`) on object storage — no tile server.
- **App shell:** Svelte or React + TypeScript. Lean toward Svelte for size
  and animation ergonomics.
- **State / time:** small custom store keyed on simulation time.
- **Hosting:** Cloudflare Pages (preferred — unmetered bandwidth) or
  Netlify. Static deploy on git push.
- **Data format:** GeoJSON / FlatGeobuf for static features; a custom
  time-keyed JSON for unit tracks.

## Sourcing posture

> User retains governance. May refute, amend, or replace any proposal.
> Approach is **scientific: multiple converging sources, every fact cited.**

Every unit position, movement, or event in the dataset carries a `sources[]`
field with at least one citation. Conflicting sources are recorded and the
disagreement surfaced in the UI (uncertainty visual treatment).

Initial source shortlist:

- US Army *Green Books* — Harrison, *Cross-Channel Attack* (1951).
- Niklas Zetterling, *Normandy 1944* — German order of battle.
- Bigot maps & overlays (declassified Allied tactical maps).
- Imperial War Museum (UK) archives.
- Mémorial de Caen / D-Day Center.
- US National Archives morning reports & after-action reports.
- Antony Beevor, *D-Day* — narrative cross-check, not primary.

## Roadmap (rough)

1. **Session 2 — data schema + tech validation.** Define unit, movement,
   event, and source schemas. Stand up a minimal MapLibre + deck.gl page
   that animates one unit on a placeholder basemap.
2. **MVP — Omaha + US airborne, division level.** Real basemap, real
   timeline, ~10–20 units, ~30–50 events, full sourcing.
3. **v1 — full Normandy, division level.** All beaches, all airborne,
   German OOB.
4. **v1.1 — zoom LOD.** Regiment / battalion granularity surfaces at
   higher zoom in selected sectors.
5. **v2 — naval & air layers.**
6. **v2+ — extend timeline to June 12.**

## Risks (on the record)

- **Mixed-granularity data is the long pole.** Likely half the project's
  total effort. Deferred past MVP for a reason.
- **Painted basemaps look great in mockups, often rough at all zoom levels
  on a real map.** May need to compromise toward stylized-flat.
- **Battalion-level German positions are genuinely contested in the
  literature.** Needs an explicit "uncertainty" treatment, not silent
  picking of one source.
- **Tile / asset weight.** Vector tiles + animated overlays can balloon.
  Bandwidth-aware hosting (Cloudflare Pages) is a hedge, not a fix.

## Conventions

- **File names: kebab-case.** Lowercase, words separated by hyphens.
  Example: `unit-tracks.json`, `omaha-beach.svg`, `time-scrubber.ts`.
- **Exceptions:** tool/ecosystem-recognized files keep their conventional
  casing — `README.md`, `LICENSE`, `CLAUDE.md`, `package.json`,
  `.gitignore`, etc.
- **Branches:** as currently set — `claude/<topic>-<id>`.