import { TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';

import type { Position } from '@d-day/schema';

type Kind = 'city' | 'water';
type Tier = 'small' | 'medium' | 'large';

interface Toponym {
	name: string;
	position: Position;
	kind: Kind;
	minZoom: number;
	tier?: Tier; // applies to `kind === 'city'`; default 'small'
}

// Curated list of toponyms. Coordinates from Natural Earth 1:10M
// populated places (cities) and from operational map labels (water
// bodies). Source: Natural Earth 1.4.0
// https://www.naturalearthdata.com/downloads/10m-cultural-vectors/
//
// minZoom drives importance-based display: bigger / more anchoring
// places appear at lower zoom levels, smaller places only when the
// user has zoomed in enough that they fit without clutter.
//
// `tier` drives dot size + label size — orthogonal to minZoom because
// importance ≠ visibility threshold. LARGE = Caen, Cherbourg.
// MEDIUM = Bayeux, Coutances, Saint-Lô, Carentan. SMALL = everything
// else (per user direction: "le reste est considéré comme petit").
const TOPONYMS: Toponym[] = [
	// Always visible — anchors the map regardless of zoom
	{ name: 'La Manche', position: [-1.6, 50.1], kind: 'water', minZoom: 0 },
	// Capitals
	{ name: 'Paris', position: [2.3522, 48.8566], kind: 'city', minZoom: 5, tier: 'large' },
	{ name: 'Londres', position: [-0.1278, 51.5074], kind: 'city', minZoom: 5, tier: 'large' },
	// Regional anchors (out-of-Normandy context)
	{ name: 'Rouen', position: [1.0993, 49.4432], kind: 'city', minZoom: 6, tier: 'large' },
	{ name: 'Rennes', position: [-1.6778, 48.1173], kind: 'city', minZoom: 6, tier: 'large' },
	{ name: 'Brest', position: [-4.4861, 48.3904], kind: 'city', minZoom: 6, tier: 'large' },
	{ name: 'Le Mans', position: [0.1996, 48.0061], kind: 'city', minZoom: 6, tier: 'large' },
	// Major Norman cities — LARGE
	{ name: 'Cherbourg', position: [-1.6259, 49.6307], kind: 'city', minZoom: 7, tier: 'large' },
	{ name: 'Caen', position: [-0.3707, 49.1829], kind: 'city', minZoom: 7, tier: 'large' },
	{ name: 'Le Havre', position: [0.1079, 49.4944], kind: 'city', minZoom: 7, tier: 'large' },
	// Mid-tier Norman towns — MEDIUM for the four MVP-relevant ones
	{ name: 'Bayeux', position: [-0.7026, 49.2764], kind: 'city', minZoom: 8, tier: 'medium' },
	{ name: 'Saint-Lô', position: [-1.0905, 49.1158], kind: 'city', minZoom: 8, tier: 'medium' },
	{ name: 'Coutances', position: [-1.4438, 49.0461], kind: 'city', minZoom: 8, tier: 'medium' },
	{ name: 'Carentan', position: [-1.2486, 49.3033], kind: 'city', minZoom: 8, tier: 'medium' },
	{ name: 'Lisieux', position: [0.2275, 49.1444], kind: 'city', minZoom: 8 },
	{ name: 'Vire', position: [-0.8881, 48.8419], kind: 'city', minZoom: 8 },
	{ name: 'Falaise', position: [-0.1989, 48.8919], kind: 'city', minZoom: 8 },
	{ name: 'Avranches', position: [-1.3608, 48.6839], kind: 'city', minZoom: 8 },
	// Small but historically critical (MVP focus)
	{ name: 'Sainte-Mère-Église', position: [-1.3167, 49.4083], kind: 'city', minZoom: 9 },
	{ name: 'Isigny-sur-Mer', position: [-1.1014, 49.3194], kind: 'city', minZoom: 9 },
	{ name: 'Colleville-sur-Mer', position: [-0.8458, 49.3625], kind: 'city', minZoom: 9 },
	{ name: 'La Pointe du Hoc', position: [-0.989, 49.388], kind: 'city', minZoom: 9 },
	{ name: 'Quinéville', position: [-1.2917, 49.5333], kind: 'city', minZoom: 9 },
	{ name: 'Saint-Pierre-Église', position: [-1.4083, 49.6667], kind: 'city', minZoom: 9 },
	{ name: 'Douvres-la-Délivrande', position: [-0.3833, 49.2917], kind: 'city', minZoom: 9 },
	{ name: 'Cabourg', position: [-0.13, 49.292], kind: 'city', minZoom: 9 }
];

// Auto-extracted character set so accented chars (Lô, Mère, Église…)
// rasterise correctly. deck.gl's 'auto' mode is unreliable across
// Canvas/font configs; passing an explicit set is bulletproof.
const CHARACTER_SET = Array.from(new Set(TOPONYMS.flatMap((t) => Array.from(t.name))));

const CITY_COLOR: [number, number, number] = [40, 35, 30];
const WATER_COLOR: [number, number, number] = [70, 95, 120];

const DOT_FILL: [number, number, number, number] = [255, 255, 255, 250];
const DOT_STROKE: [number, number, number, number] = [20, 20, 20, 250];

function tierOf(t: Toponym): Tier {
	return t.tier ?? 'small';
}

function dotRadius(tier: Tier): number {
	if (tier === 'large') return 7;
	if (tier === 'medium') return 5;
	return 3;
}

function dotLineWidth(tier: Tier): number {
	if (tier === 'large') return 2;
	if (tier === 'medium') return 1.5;
	return 1;
}

function labelSize(tier: Tier): number {
	if (tier === 'large') return 18;
	if (tier === 'medium') return 16;
	return 14;
}

function labelWeight(tier: Tier): number {
	return tier === 'small' ? 500 : 600;
}

function labelOffsetY(tier: Tier): number {
	if (tier === 'large') return 14;
	if (tier === 'medium') return 12;
	return 10;
}

interface BuildToponymOptions {
	zoom: number;
}

/**
 * Map labels rendered via deck.gl TextLayer + ScatterplotLayer.
 * Display is filtered by an importance threshold (`minZoom`) so the
 * label density stays readable across zoom levels. A tier system
 * (small / medium / large) drives dot size and label size so the eye
 * grades cities by importance independently of when they appear.
 */
export function buildToponymLayers({ zoom }: BuildToponymOptions): Layer[] {
	const visible = TOPONYMS.filter((t) => t.minZoom <= zoom);
	const cities = visible.filter((t) => t.kind === 'city');
	const water = visible.filter((t) => t.kind === 'water');

	return [
		new ScatterplotLayer<Toponym>({
			id: 'toponyms-city-dots',
			data: cities,
			getPosition: (d) => d.position,
			getRadius: (d) => dotRadius(tierOf(d)),
			radiusUnits: 'pixels',
			getFillColor: DOT_FILL,
			stroked: true,
			getLineColor: DOT_STROKE,
			getLineWidth: (d) => dotLineWidth(tierOf(d)),
			lineWidthUnits: 'pixels',
			pickable: false
		}),
		// One TextLayer per tier — deck.gl's TextLayer only takes a static
		// fontWeight, so to vary it by tier we split the dataset into
		// per-tier layers. Size + offset stay accessor-driven; the
		// per-layer fontWeight is fixed.
		...(['small', 'medium', 'large'] as const).map(
			(tier) =>
				new TextLayer<Toponym>({
					id: `toponyms-cities-${tier}`,
					data: cities.filter((c) => tierOf(c) === tier),
					characterSet: CHARACTER_SET,
					getPosition: (d) => d.position,
					getText: (d) => d.name,
					getColor: [...CITY_COLOR, 240],
					getSize: labelSize(tier),
					sizeUnits: 'pixels',
					fontFamily: 'system-ui, sans-serif',
					fontWeight: labelWeight(tier),
					fontSettings: { sdf: false },
					getTextAnchor: 'middle',
					getAlignmentBaseline: 'top',
					getPixelOffset: [0, labelOffsetY(tier)],
					pickable: false
				})
		),
		new TextLayer<Toponym>({
			id: 'toponyms-water',
			data: water,
			characterSet: CHARACTER_SET,
			getPosition: (d) => d.position,
			getText: (d) => d.name,
			getColor: [...WATER_COLOR, 230],
			getSize: 15,
			sizeUnits: 'pixels',
			fontFamily: 'system-ui, sans-serif',
			fontWeight: 400,
			fontSettings: { sdf: false },
			getTextAnchor: 'middle',
			getAlignmentBaseline: 'center',
			pickable: false
		})
	];
}
