# MVP → Production : plan d'évolution

> **Statut :** plan stratégique de référence. À relire au début de chaque
> jalon (M1 / M2 / M3) avant d'engager du code. Décisions
> non-tranchées listées au §10 — sign-off utilisateur requis avant
> implémentation des points concernés (`CLAUDE.md` §"Tech stack",
> §"Governance").
>
> **Auteurs :** synthèse des trois rôles seniors (architecte, dev, UX)
> demandés par l'utilisateur dans le prompt d'origine, basée sur trois
> audits Explore datés du 2026-05-01.
>
> **Source de vérité scope :** `brief.md`. Ce plan ne réécrit pas le
> brief, il en propose une exécution.

---

## 1. Contexte

Le MVP a été accepté par l'utilisateur le 2026-05-01 (cf. `progress.md`).
Le concept est validé : carte interactive D-Day en SvelteKit + MapLibre +
deck.gl, niveau division, fenêtre D-1 22:00 → D 18:00, secteur Omaha +
airborne US uniquement. La carte rend, scrub, sélectionne, surface les
sources et les disputes ; la suite vitest passe à 44/44.

**Pourquoi ce plan existe :** le passage de "MVP démontrable en local" à
"version de production publiable" introduit trois familles de problèmes
nouveaux qu'on n'a pas eu à traiter dans la slice :
- **Diffusion** : déploiement, hosting, performance bundle, SEO/OG, robustesse runtime.
- **Couverture historique** : le périmètre Omaha-only ne suffit pas pour défendre la promesse "whole-operation, rigorously sourced" du brief.
- **Surface UX production-grade** : a11y, i18n, error boundaries, onboarding, deep-link partage — tout ce qui a été déprioritisé pendant la slice.

**Décisions structurantes prises avec l'utilisateur (2026-05-01) :**
- Plan **séquencé en trois jalons** (M1 → M2 → M3) avec point de décision entre chacun. Pas d'engagement prématuré sur M3.
- **Hosting deferred — local-only pour l'instant.** M1 prépare l'app à être shippable (adapter statique, robustesse, a11y, FR, error boundary) sans choisir de cible ni déployer publiquement. Décision hosting (CF Pages / Vercel / Netlify / GitHub Pages) rouverte quand l'utilisateur décidera de publier. Détails §10.1.
- **Desktop-only assumé** : détecter mobile et afficher un écran "use desktop". Pas de responsive/tactile bâclé.

**Ce qui reste deferred (par décision explicite, pas par oubli) :**
- LOD multi-granularité (regiment/battalion par zoom). Brief le flag comme ~½ de l'effort total. Reste hors scope de M1/M2/M3 sauf demande explicite.
- Painted basemap au sens du brief (look "peint à la main"). Le rendu Natural Earth + deck.gl est suffisant pour M1/M2 ; on peut revisiter en parallèle de M3 ou plus tard.

---

## 2. Synthèse de l'audit (état actuel au 2026-05-01)

Trois audits Explore ont été menés en parallèle (technique, données,
UX). Les rapports complets sont dans la conversation d'origine. Synthèse
factuelle ici, sans recommandation — celles-ci viennent en §3 et après.

### 2.1 Architecture technique

- **Stack** : SvelteKit 2.57 + Svelte 5 (runes) + TypeScript strict + Vite. Workspace pnpm (`apps/web`, `packages/data/schema`).
- **Rendu** : deck.gl 9.3 fait **tout** le rendu (basemap inclus, tiré de Natural Earth via `world-atlas` + `topojson-client`). MapLibre n'est gardé que pour la caméra + fond mer.
- **Pipeline data** : Vite globs avec `eager: true` → données JSON inlinées au build (~30 KB bruts, <5 KB gzippé). Validation ajv au runtime à l'init de l'app. Schémas TS et JSON maintenus en doublon.
- **Veil d'occupation** : `polygon-clipping` (union/diff/intersection) + Chaikin smoothing, **reconstruit à chaque frame** quand on lit la timeline.
- **Time store** : Svelte 5 rune avec RAF loop propriétaire. Tick par frame, pas de batching.
- **Bundle** : ~5.8 MB bruts dans `.svelte-kit/output/client/` (deck.gl est le gros poste).
- **Adapter SvelteKit** : `adapter-auto` — non spécifié pour la prod.
- **CI/CD, lint, format, tests UI** : **absents**. Tests vitest présents uniquement sur `packages/data/schema`.
- **Code orphelin** : `apps/web/src/lib/layers/rivers.ts` défini mais non importé.

### 2.2 Données et couverture historique

- **Unités** : 6 divisions (US 1st & 29th ID, US 82nd & 101st Abn, DE 352., DE 91./709. combinées). v1 cible 13 divisions → **MVP couvre 46 % de v1**.
- **Manques v1** : US 4th ID, UK 50th + 3rd British + 6th Airborne, CA 3rd Canadian, DE 716. + 21. Panzer.
- **Événements** : 30 événements sur la fenêtre, bien sourcés mais distribution biaisée (Omaha 36 %, Juno 0 %).
- **Bug data** : 3 événements (`pegasus-bridge-taken`, `horsa-bridge-taken`, `lovat-pegasus-linkup`) référencent `uk-6th-airborne` dans `involvedUnits` mais l'unité n'existe pas dans `data/units/`. À corriger en M1 ou en début de M2.
- **Frontline** : 3 segments (Cotentin, Omaha, Utah), 11 keyframes total. Pas de segments UK/CA.
- **Sources** : 7 dans le registry, dont **2 jamais citées** (`bigot-maps`, `memorial-caen`). À utiliser activement quand on étendra le périmètre.
- **Disputes** : 17 documentées (14 waypoint + 3 event). Bonne hygiène.
- **Schémas** : champs absents qui seront utiles en v1 — `unit.parent` pour la hiérarchie, `unit.commander`, `unit.casualties`, `event.category` pour filtrage UI, `frontline.confidence`.

### 2.3 UX

- **Solide** : timeline (auto-hide, vitesse, raccourcis), fiche détail (sources, disputes, cross-links), légende collapsable, hash deep-linking robuste.
- **Bloquants prod** :
  1. Auto-hide timeline basé sur `mousemove` → invisible sur tactile (résolu par décision desktop-only).
  2. Mélange français/anglais sans i18n. La légende est en français, le reste en anglais.
  3. Contraste insuffisant (texte secondaire à `opacity:0.45`), pas de `prefers-reduced-motion`, pas de focus visible cohérent, range scrubber sans `aria-label`. WCAG 2.1 AA non atteint.
  4. Aucun error boundary, aucun loading state. Si `loadData()` throw, écran blanc.
  5. Aucune meta OG/Twitter, `<title>` minimal ("D-Day map — MVP"), pas de description. Partage de lien = aperçu vide.

---

## 3. Architecture cible (recommandations seniors)

Décisions techniques recommandées pour la prod. Tout ce qui touche
renderer / tile format / app shell / hosting nécessite sign-off
utilisateur (`CLAUDE.md`). Les recommandations ci-dessous sont des
propositions argumentées, pas des engagements.

### 3.1 Renderer : **garder deck.gl + MapLibre**

deck.gl porte la logique d'animation, NATO icons, frontline animée — c'est
là qu'est l'investissement actuel. MapLibre reste utile dès que tu veux
ajouter un vrai fond de carte stylisé (painted basemap futur). Le coût
bundle est réel (~⅓ des 5.8 MB) mais largement amorti. **Pas de
réécriture renderer recommandée.** À valider : si la perte de bundle
devient un blocker (mesure Lighthouse en M1), explorer `@deck.gl/core`
seul + couches custom plutôt que `@deck.gl/layers` complet, ou tree-shake
agressif.

### 3.2 Tile format : **deferred**

On n'a pas de tiles aujourd'hui (basemap est dessiné en deck.gl à partir
de Natural Earth bundlé). Le brief mentionne `.pmtiles` Protomaps comme
cible long terme. **Recommandation : différer la décision tiles à M2 ou
M3.** Tant que la couverture géographique reste Normandie, le bundle
Natural Earth tient. Si on ajoute jamais un painted basemap (post-M3),
PMTiles sur object storage devient pertinent — mais pas avant.

### 3.3 App shell : **garder SvelteKit**

Svelte 5 runes + TS strict + Vite forment un shell sain. Aucune raison
de migrer. Recommandation : **passer en mode SSG** (`adapter-static` +
`prerender = true`) pour M1 — l'app est CSR-only aujourd'hui mais elle
peut prerender, ce qui débloque SEO/OG et réduit le TTFB.

### 3.4 Hosting : **comparaison à trancher en début de M1**

Quatre cibles réalistes. Tradeoffs résumés :

| Cible | Pour | Contre |
|---|---|---|
| **Cloudflare Pages** | Bandwidth illimitée, edge global, gratuit, SvelteKit `adapter-cloudflare` mature, mentionné dans `brief.md` comme cible préférée | Limites fonctions worker (10 ms CPU plan gratuit) — non bloquant pour app statique |
| **Vercel** | Excellente DX, preview deploys natifs, `adapter-vercel` officiel | Bandwidth comptée au-delà de 100 GB/mois (plan hobby) — risque si l'app vire viral |
| **Netlify** | Similaire Vercel, plus généreux historiquement | Bandwidth comptée aussi (100 GB/mois plan free) |
| **GitHub Pages** | Gratuit, intégré à `gh`, suffit pour SSG pur | Pas de fonctions edge si jamais on en veut, build via Actions seulement |

**Recommandation senior** : **Cloudflare Pages**. C'est la combinaison
qui (a) honore l'intention du brief, (b) ne te facture pas si l'app
attrape de la traction, (c) supporte un futur passage à un edge worker
(API d'analytics, LLM proxy) sans changer de fournisseur. Décision à
confirmer en début de M1.

### 3.5 Pipeline data : **fetch runtime avec cache, pas inline**

Aujourd'hui les JSON sont inlinés via `import.meta.glob({ eager: true })`.
Ça marche à 30 KB. À 200+ KB (M2 = 13+ unités, plus d'événements,
frontline 5 plages), ça pénalise le bundle initial alors que toutes les
données ne sont pas nécessaires au paint.

**Recommandation** : passer en `fetch()` + cache HTTP (CF Pages le fait
gratuitement) au début de M2. Garder les schémas ajv en runtime — la
validation au build est un piège quand les données viennent d'éditeurs
non-tech (et c'est exactement la direction que prend le projet).

### 3.6 Schémas : **générer JSON Schema depuis les types TS**

Le doublon manuel `types.ts` ↔ `*.schema.json` est une dette qui
augmente avec chaque champ ajouté. Recommandation : `typescript-json-schema`
ou `ts-json-schema-generator` au build, single source of truth = TS. À
faire dans M1 avant que les schémas grossissent.

### 3.7 Veil d'occupation : **mémoiser, pas web-worker**

Reconstruction `polygon-clipping` à chaque frame est suspecte mais pas
mesurée. Première étape M1 : **profiler avant d'optimiser**. Si la perf
est bonne (peu probable d'être un blocker à 6 unités sur des i7), ne
rien faire. Si problème : memoization par tranche de temps (5 min
simulés = 1 calcul, interpolation linéaire entre) avant d'envisager web
worker (web worker ajoute de la complexité de sérialisation deck.gl).

### 3.8 Error boundary + loading state

SvelteKit propose `+error.svelte` et `+loading.svelte` natifs. **À
ajouter en M1.** Coût : ~30 lignes de code, débloque toute la robustesse
production.

### 3.9 i18n : **français-first, single locale en M1**

L'utilisateur est francophone, le brief est en français, la légende est
déjà en français, le projet a une visée patrimoniale française. **Choix
recommandé : passer toute la chrome en français, pas de système i18n
multi-langue en M1.** Bibliothèque i18n (paraglide-js, svelte-i18n) à
introduire seulement si M2 ou M3 décide de cibler un public anglophone.

### 3.10 Tests

- `packages/data/schema` : déjà couvert. Garder.
- `apps/web` : ajouter **vitest + @testing-library/svelte** pour le time-store, le hash sync, le data-loader. Pas de Playwright en M1 (over-engineering).
- Playwright si M2/M3 introduisent des parcours utilisateurs critiques (filtre événements, comparaison de scénarios).

### 3.11 Lint + format + CI

- **Prettier** + **eslint-plugin-svelte** + **eslint-plugin-perfectionist** (tri des imports). Précommit via `simple-git-hooks` (lightweight, pas husky).
- **GitHub Actions** : un seul workflow `ci.yml` qui fait `pnpm install` + `pnpm check` + `pnpm test` + `pnpm build` sur PR vers `main`. Déclencher CF Pages preview en parallèle.

---

## 4. Jalon M1 — Prod-grade MVP

**Objectif :** rendre l'app **shippable publiquement** sur le périmètre
Omaha + airborne US actuel. Pas d'élargissement historique. Le user
arrive sur l'URL, comprend, scrolle dans le temps, partage le lien.

**Effort estimé :** 2–4 semaines équivalent travail focalisé. Pas
d'estimate calendaire — dépend de la cadence du user.

### 4.1 Lots

1. **Hosting + déploiement**
   - Décision hosting (CF Pages recommandé).
   - Adapter SvelteKit explicite (`@sveltejs/adapter-cloudflare` ou `adapter-static`).
   - Mode SSG (`prerender = true`).
   - Workflow GitHub Actions `ci.yml`.
   - URL de prod stable. Premier déploiement public.

2. **Robustesse runtime**
   - `+error.svelte` global avec message FR + lien retour.
   - `+layout.svelte` avec loading skeleton (carte grise + "Chargement…") tant que `loadData()` n'a pas résolu.
   - Try/catch dans `data-loader.ts` qui throw une erreur typée → l'error boundary l'affiche.
   - Données toujours inlinées en M1 (le passage fetch-runtime arrive en M2 quand la taille le justifie).

3. **i18n minimal (FR-first)**
   - Tous les strings UI en français. Liste à passer au peigne fin : timeline (Pause, Play, Reset, Speed, Jump to D-1 22:00), fiche détail (Side → Côté, Country → Pays, Echelon → Échelon, Branch → Arme, Waypoints → Étapes, Sources, Involved units → Unités impliquées, Disputed waypoints → Étapes contestées), légende swatches.
   - `lang="fr"` dans `app.html`.
   - Format dates et heures en français (déjà fait pour les ticks ; vérifier la fiche détail).

4. **a11y WCAG 2.1 AA**
   - Augmenter contraste : monter `opacity:0.45` à `opacity:0.7` sur ticks et labels secondaires, ou changer la palette (passer le fond panel à `rgba(20,20,20,0.85)` plein, perdre un peu de blur si nécessaire).
   - `prefers-reduced-motion` : désactiver auto-hide timeline + fly-to caméra + transitions fade events si user le demande.
   - `prefers-color-scheme` : skip pour M1 (l'app est dark-only par design — c'est un choix esthétique cohérent avec la veille militaire).
   - Focus ring visible sur tous les contrôles interactifs (`outline: 2px solid #5ec3ff; outline-offset: 2px;`).
   - `aria-label` sur le range scrubber.
   - Focus trap dans le panel détail (lib `focus-trap` ou implémentation maison ~20 lignes).
   - Escape ferme aussi la légende.

5. **Mobile : blocage propre**
   - Détecter `pointer: coarse` ou viewport width < 1024 px.
   - Afficher un écran plein écran : "Cette expérience nécessite un grand écran et une souris. Reviens depuis un ordinateur." + petit visuel.
   - **Ne pas tenter de déboguer le tactile.** Décision desktop-only assumée et communiquée.

6. **SEO + partage social**
   - `<title>` riche : "D-Day — 6 juin 1944 — carte interactive heure par heure".
   - `<meta name="description">` (~160 caractères, en français).
   - OG image : générer une capture statique de la carte à H-Hour Omaha (07:30, zoom 9, secteur Omaha). 1200×630, `static/og.png`. Manuel suffit en M1, pas besoin d'OG dynamique par lien.
   - Twitter card `summary_large_image`.
   - `<meta property="og:locale" content="fr_FR">`.
   - Ré-introduire un bouton "Copier le lien" discret (le hash deep-linking marche déjà, juste lui donner une affordance visible). Position : sous la timeline, ou en coin.

7. **Bundle perf**
   - Mesurer le bundle actuel (`pnpm build` + Lighthouse local).
   - Si > 1 MB JS sur la page initiale après gzip, tree-shake deck.gl (`@deck.gl/layers` → imports nominatifs uniquement, supprimer ce qui n'est pas utilisé).
   - Si toujours lourd, lazy-load les couches "non-MVP" (rivières si réintroduites, beach subsectors zoom 10) — hors path critique du first paint.
   - Compression Brotli activée côté hosting (CF Pages le fait par défaut).

8. **Hygiène code**
   - Prettier + ESLint + précommit.
   - Génération JSON Schema depuis types TS (script `pnpm gen:schemas` au build).
   - Suppression code mort : `rivers.ts` non importé → soit le wirer soit le supprimer (décider avec utilisateur ; recommandation = wirer en désactivable par flag, c'est <30 lignes).
   - Fix bug data : ajouter `data/units/uk-6th-airborne.json` minimal (3 waypoints : DZ-N drop, Pegasus, Ranville) ou retirer les `involvedUnits` qui pointent dans le vide. Ajouter une unit est plus fidèle au sourcing — recommandation = ajouter.

9. **Tests**
   - vitest sur `apps/web` : time-store (toggle, seek, reset, RAF loop), hash sync (read, write, round-trip), data-loader (validation, cross-references).
   - Cible : 5–10 tests, ~2h de boulot.

### 4.2 Critères de sortie M1

- [ ] URL publique accessible.
- [ ] Lighthouse mobile : Perf ≥ 70, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90.
- [ ] Test manuel desktop : Chrome, Firefox, Safari récents — pas de regression visuelle.
- [ ] Test manuel mobile : écran de blocage propre s'affiche.
- [ ] Lien partagé (Discord, Twitter) → preview OG s'affiche.
- [ ] Erreur simulée (data corrompue) → error boundary affiche un message FR.
- [ ] `pnpm check`, `pnpm test`, `pnpm build` clean en CI.
- [ ] Approbation utilisateur explicite avant de passer à M2.

---

## 5. Jalon M2 — v1 Normandie complète

**Objectif :** étendre le périmètre historique à la **v1 du brief** —
les 5 plages avec vraies tracks unit pour UK/CA, OOB allemand complet,
toujours niveau division. Pas de naval, pas d'air, pas de D+1→D+6.

**Effort estimé :** 6–10 semaines, principalement de la recherche
historique + saisie data. Le code change peu.

### 5.1 Lots

1. **Recherche historique structurée**
   - Utiliser `bigot-maps` et `memorial-caen` (sources dans le registry, jamais citées en MVP) pour les positions UK/CA. C'est leur raison d'être dans le registry.
   - Pour chaque division ajoutée : 5–6 waypoints D-1 22:00 → D 18:00, conformément à la granularité MVP.
   - Disputes : maintenir l'hygiène 17/30 du MVP (≥ 1 dispute documentée par 2 unités, sources convergentes obligatoires).

2. **Données : 7 nouvelles unités**
   - Ordre recommandé (par effort croissant, comme dans l'audit) :
     1. `us-4th-id.json` (Utah) — sources existantes harrison-1951.
     2. `de-716th-id.json` (défense côtière Omaha/Utah) — Zetterling.
     3. `uk-6th-airborne.json` (déjà ajoutée en M1 si recommandation suivie — sinon ici).
     4. `de-21st-panzer.json` — trajectoire Caen-Lion, 2 sources.
     5. `uk-50th-id.json` (Gold) + `uk-3rd-id.json` (Sword) — IWM + Harrison.
     6. `ca-3rd-id.json` (Juno) — sources canadiennes via memorial-caen.

3. **Données : événements**
   - Combler le gap Juno (0 événement actuellement). Cible : 4–6 événements (H-Hour, Bernières, Saint-Aubin, link-up avec Sword).
   - Ajouter les événements Gold post-H-Hour (Asnelles, Arromanches, link-up avec Omaha).
   - Ajouter les événements Sword post-Pegasus (Ouistreham, contre-attaque 21. Panzer vers Lion).
   - Cible globale : passer de 30 à ~55–65 événements, équilibrés par secteur.

4. **Données : frontline**
   - Ajouter 3 segments : Gold beachhead, Juno beachhead, Sword beachhead.
   - Keyframes : 3–4 par segment (H-Hour, midi, fin de journée).
   - Le veil d'occupation reculera maintenant sur les 5 plages en parallèle — visuel beaucoup plus fort.

5. **Schémas : enrichissements**
   - `unit.commander` (nom + grade) — sourcé.
   - `unit.casualties` ou `unit.casualtiesByPhase` (structure à choisir — décision à prendre avec utilisateur sur la granularité).
   - `event.category` enum — pour filtrer dans l'UI ("airborne ops", "H-Hour", "beach ops", "inland", "german reaction"). Permet un filtre UI en M2.
   - `frontline.confidence: "established" | "estimated" | "contested"` — change l'opacité du veil dans le rendu pour signaler l'incertitude.

6. **Pipeline data : fetch runtime**
   - À cette taille (200+ KB de JSON), bundler les données dans le client n'a plus de sens.
   - Passer à `fetch('/data/...')` + cache HTTP. Le contenu de `static/data/` est servi avec `Cache-Control: public, max-age=3600` côté CF.
   - Garder ajv en runtime, valider à la réception.
   - Loading state : afficher "Chargement des données…" au-dessus de la carte tant que les fetches ne sont pas résolus.

7. **UI : filtre par catégorie d'événement**
   - Petit panneau dans la légende (ou en bas-droite) avec checkbox par catégorie (airborne / H-Hour / beach / inland / german reaction).
   - Filtre la couche events. Donne au user le contrôle visuel sur la densité.

8. **UI : sélecteur de secteur**
   - Avec 5 plages actives, l'utilisateur veut probablement "centrer sur Sword". Bouton "Aller à" en haut-droite avec liste : Cotentin, Utah, Omaha, Gold, Juno, Sword. Fly-to caméra au zoom du secteur.

### 5.2 Critères de sortie M2

- [ ] 13+ unités présentes, toutes sourcées et avec waypoints.
- [ ] 55+ événements, distribution équilibrée par secteur (≥ 6 par plage).
- [ ] 6 segments frontline, veil d'occupation cohérent sur les 5 plages.
- [ ] `bigot-maps` et `memorial-caen` cités au moins 5 fois chacun.
- [ ] Filtre événements + sélecteur secteur fonctionnels.
- [ ] Bundle initial pas plus lourd qu'en M1 (les données sont fetched, pas inlinées).
- [ ] Tests vitest étendus : couverture data-loader sur les nouveaux schémas.
- [ ] Approbation utilisateur explicite avant M3.

---

## 6. Jalon M3 — Naval, air, extension D+1 → D+6

**Objectif :** atteindre la v2 du brief (naval + air) et étendre
temporellement à la consolidation de la tête de pont.

**Effort estimé :** important, à re-scoper à l'entrée. Probablement
2-3 mois équivalent. Le brief flag déjà ce niveau comme "Phase 2".

### 6.1 Lots (esquisse, à raffiner avant lancement)

1. **Naval**
   - Schéma naval : `vessel`, `bombardment`, `landing-craft-wave`. Distinct des unités terrestres.
   - Données : ~15–25 capital ships + cruisers + destroyers, positions Y/X par phase de bombardement.
   - Couche dédiée deck.gl : icônes navires, faisceaux de bombardement (ScatterplotLayer + LineLayer).
   - Sources : Naval History and Heritage Command, Roskill *War at Sea*, à ajouter au registry.

2. **Air**
   - Schéma air : `bomber-stream`, `fighter-cap`, `airborne-corridor`.
   - Données : 8th AF + RAF Bomber Command + IX Troop Carrier Command (les couloirs des airbornes).
   - Visualisation : flux animés (`TripsLayer` deck.gl pour les couloirs, AnimatedArcLayer pour les bombardements).
   - Performance : potentiellement le poste le plus lourd en GPU. Profiler tôt.

3. **Extension D+1 → D+6**
   - 4 jours additionnels de waypoints sur **toutes** les unités. ~30 keyframes nouveaux par unité × 13 = ~400 waypoints.
   - Nouvelles unités : Panzer-Lehr, 12. SS-Panzer "Hitlerjugend" (réserves panzer qui arrivent à J+1, J+2).
   - Événements : ~30 nouveaux (Carentan link-up, Caen siege, percée), majoritairement issus de Harrison + Beevor.

4. **UX : timeline étendue**
   - La timeline actuelle couvre 20 h. Sur 7 jours (D-1 22:00 → D+6 24:00 = 170 h), il faut une UX différente : zoom temporel (vue jour vs vue détail-heure), pins événements regroupés au survol.
   - Ne pas sous-estimer ce lot — c'est un design à part entière.

5. **Painted basemap (peut-être)**
   - À ce stade, si l'app a une audience, ça peut valoir l'effort d'un vrai basemap stylisé via Mapbox Studio + PMTiles.
   - Décision à reprendre à l'entrée M3.

### 6.2 Critères de sortie M3

À définir à l'entrée du jalon. Ne pas pré-engager les critères
maintenant — le scope évoluera selon ce qu'on aura appris en M1/M2.

---

## 7. Ce qu'on NE fait PAS dans ce plan

Liste explicite pour clarifier le scope et éviter les dérives :

- **LOD multi-granularité** (regiment/battalion qui apparaissent au zoom). `brief.md` flag comme ~½ de l'effort total. Reste deferred sauf demande explicite. Si le user veut explorer du regiment-level, le plan doit être amendé en conséquence.
- **Mobile responsive et tactile**. Décision actée : desktop-only, blocage propre sur mobile.
- **Multi-langue**. FR-first uniquement. Ajout de l'anglais possible si une demande publique émerge — c'est un add-on, pas un blocker.
- **Système de comptes / favoris / annotations user**. Hors scope. L'app est read-only.
- **Backend, base de données, API**. L'app est statique, les données sont des JSON sourcés. Toute fonctionnalité qui requiert un backend (commentaires, contributions) nécessite un nouveau plan.
- **Mode "comparaison" entre scénarios** (ex : visualiser un scénario alternatif "si la tempête avait persisté"). Hors scope, pure spéculation.

---

## 8. Risques et points de vigilance

- **Recherche historique = goulot de M2.** Si l'utilisateur ne tranche pas vite sur les disputes UK/CA (ex : timing exact de la prise de Bernières), M2 stagne. **Mitigation** : autoriser un commit avec `disputedBy` populé même quand la dispute n'est pas close — c'est exactement le rôle du champ.
- **Bundle size en M2/M3.** Si naval/air ajoutent 500 KB+ de JSON, il faudra paginer/streamer les données par sélection temporelle ou par couche. **Mitigation** : commencer le fetch-runtime en M2 prépare déjà ce passage.
- **Performance veil d'occupation à 6 segments.** Le polygon-clipping s'aggrave en O(n²) sur multipolygones. **Mitigation** : profiler dès le premier segment ajouté en M2, mémoiser si nécessaire (cf. §3.7).
- **Hosting CF Pages limites.** 25 MB max par fichier déployé. Ne devrait pas être un blocker (notre plus gros asset = OG image ~50 KB). À surveiller si painted basemap arrive.
- **Dépendance Natural Earth.** Le land mask et les côtes viennent de `world-atlas`. Si la lib est dépréciée, on a une dette. **Mitigation** : copie locale du dataset Natural Earth dans `data/geography/` à terme.
- **`prefers-reduced-motion` mal implémenté = pire que rien.** Ne pas désactiver à moitié les animations — soit on respecte (toutes les transitions instantanées), soit non. Tester en CI difficile, tester manuellement obligatoire.

---

## 9. Vérification — comment valider chaque jalon

### Pour M1
- Lighthouse score (Perf, A11y, BP, SEO) sur l'URL de prod ≥ seuils §4.2.
- Test manuel WCAG : naviguer toute l'app au clavier, vérifier focus visible partout, screen reader VoiceOver/NVDA passe les contrôles principaux.
- Test partage social : poster l'URL sur Twitter, Discord — preview correcte.
- Test erreur : corrompre `data/events/d-day.json` localement, vérifier que l'app affiche l'error boundary FR au lieu d'écran blanc.
- `pnpm check && pnpm test && pnpm build` clean en CI sur PR.

### Pour M2
- Inventaire des unités, événements, sources : matcher les seuils §5.2.
- Test interactif : sélecteur secteur ferme à chaque plage, filtre événements actif, fiche détail montre les nouvelles unités UK/CA/DE.
- Cohérence sourcing : `bigot-maps` et `memorial-caen` cités au moins 5× chacun (vérifiable par grep dans `data/`).
- Veil d'occupation visuellement cohérent sur 5 plages (test humain, le user a l'œil).

### Pour M3
- Critères à définir à l'entrée du jalon.

---

## 10. Décisions à prendre par l'utilisateur (sign-off)

Ces décisions verrouillent des choix structurants. Per `CLAUDE.md`,
elles ne sont pas prises silencieusement.

**Avant de démarrer M1 :**
1. ~~**Hosting**~~ — **[acté 2026-05-01] Local-only pour l'instant.** M1 est construit comme s'il allait shipper (adapter statique, robustesse, a11y, FR, error boundary, meta OG dans le HTML), mais pas de cible hosting choisie ni de déploiement public. La comparaison Cloudflare Pages / Vercel / Netlify / GitHub Pages est rouverte quand l'utilisateur décidera de publier. Conséquences : pas de workflow CI/CD de deploy en M1, pas de génération d'OG image (peut attendre 10 min le jour J), critère de sortie M1 "URL publique accessible" remplacé par "build statique servable en local clean".
2. ~~**Mode SSG vs SSR**~~ — **[acté 2026-05-01] SSG**, `@sveltejs/adapter-static` + `prerender = true` partout. Cohérent avec décision 1 (build statique local-only, prêt à pousser sur n'importe quel host statique le jour J). L'app est read-only, aucune route ne nécessite SSR.
3. ~~**Code mort `rivers.ts`**~~ — **[acté 2026-05-01] Supprimé.** Fichier orphelin depuis ~5 mois (deferred pending visual fit), aucun appelant, code ressuscitable via `git show` si re-tentative ultérieure. Suppression effectuée le 2026-05-01, `pnpm check` clean. La recommandation §4.1 lot 8 ("wirer avec flag") est invalidée par les faits — le code n'a pas été repris en 5 mois, le re-design éventuel viendra avec un autre style de rendu.
4. ~~**Bug `uk-6th-airborne`**~~ — **[acté 2026-05-01] Unité ajoutée.** `data/units/uk-6th-airborne.json` créé, division-level, 6 waypoints D-1 22:00 → D 18:00 (pré-drop / Pegasus 00:16 / DZ-N 01:00 / Ranville+Merville 04:30 / Lovat link-up 13:30 / Orne bridgehead 18:00). Sources : `harrison-1951` + `iwm-archives` (cette dernière était dans le registry mais jamais citée — désormais activée, cf. audit §2.2). Disputes documentées sur la dispersion DZ-N (parallèle au pattern 82nd Abn). 48/48 tests passent (4 nouveaux tests pour la nouvelle unité), `pnpm check` clean. Conséquence : élargissement de scope MVP au flanc Est (UK 6th Abn) — assumé. Avance de M2 §5.1.2 (l'unité y était listée comme "déjà ajoutée en M1 si recommandation suivie").
5. ~~**i18n FR-first vs FR+EN**~~ — **[acté 2026-05-01] FR-only en M1.** Pas de lib i18n. Tous les strings UI passent en français (timeline, fiche détail, legend déjà fait, états vides). Si M2/M3 visent un public EN, on enveloppera les strings dans un dictionnaire à ce moment-là (~1 j de travail). Cohérent avec brief, conversation, et registre patrimonial français du projet.

**Avant de démarrer M2 :**
6. **Granularité du champ casualties** : par phase, par heure, par regiment, ou simplement total par unité ? Impacte le schéma.
7. **Filtre événements UI** : panneau dans la légende, ou nouvelle UI dédiée ?
8. **Ordre d'ajout des unités** : suivre l'ordre §5.1.2 (effort croissant) ou prioriser par narrative ?

**Avant de démarrer M3 :**
9. À définir à l'entrée — le scope sera révisé.

---

## 11. Fichiers et chemins critiques de référence

Pour exécution future, voici les fichiers à toucher en premier dans
chaque jalon :

### M1
- `apps/web/svelte.config.js` — adapter + prerender
- `apps/web/src/app.html` — meta tags OG, lang, title
- `apps/web/src/routes/+layout.svelte` — loading state
- `apps/web/src/routes/+error.svelte` — **à créer**
- `apps/web/src/lib/components/timeline.svelte` — strings FR
- `apps/web/src/lib/components/details.svelte` — strings FR
- `apps/web/src/lib/components/legend.svelte` — strings FR (déjà partiellement)
- `apps/web/src/lib/data-loader.ts` — try/catch typé
- `apps/web/src/routes/+page.svelte` — focus trap, mobile detect
- `.github/workflows/ci.yml` — **à créer**
- `apps/web/.eslintrc.cjs`, `.prettierrc` — **à créer**

### M2
- `data/units/*.json` — 7 nouveaux fichiers
- `data/events/d-day.json` — étendre
- `data/frontline.json` — 3 nouveaux segments
- `packages/data/schema/unit.schema.json` — ajout commander, casualties
- `packages/data/schema/event.schema.json` — ajout category
- `packages/data/schema/frontline.schema.json` — ajout confidence
- `apps/web/src/lib/data-loader.ts` — passage fetch runtime
- `apps/web/static/data/` — **à créer**, mirror de `data/` côté static

### M3
- À cartographier à l'entrée.

---

## 12. Mise à jour de ce plan

Ce fichier est une **référence vivante**. À mettre à jour quand :
- Une décision §10 est prise par l'utilisateur (cocher, écrire le choix).
- Un jalon est terminé (marquer "[clos] M1 le 2026-XX-XX, voir progress.md").
- Un risque §8 se matérialise ou est résolu.
- Une recommandation §3 est invalidée par les faits du terrain.

Ne pas écraser silencieusement. Préférer un commit explicite avec
message du genre "Plan: M1 décision hosting (CF Pages), risque bundle
clos par mesure".

`progress.md` reste le journal chronologique. Ce plan est l'horizon
stratégique.
