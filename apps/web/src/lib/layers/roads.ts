import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';

import type { Position } from '@d-day/schema';

interface Road {
	id: string;
	label: string;
	path: Position[];
	sources: string[];
}

// Major historical road axes through the MVP zone. Polylines are
// schematic — straight-line segments with a couple of intermediate
// waypoints per leg to give the eye a hint of curvature without
// pulling in OSM data. Sufficient at the zoom levels where unit
// movement reads as broad arrows on a regional map.
//
// Network covers:
// - RN13 coastal: the principal east-west axis Cotentin → Bessin →
//   Caen → Pays d'Auge.
// - RN13 Cotentin north: the route the US used to push north toward
//   Cherbourg via Sainte-Mère-Église and Valognes.
// - RN158: Caen ↔ Falaise, the southern axis along which German
//   armoured counterattacks staged.
// - D572: Bayeux ↔ Saint-Lô, the Bocage axis key to the US push
//   south of OMAHA.
// - D972: Saint-Lô ↔ Coutances, west-bound link toward the Cotentin
//   peninsula's neck.
const ROADS: Road[] = [
	{
		id: 'n13-coastal',
		label: 'RN13',
		path: [
			[-1.2486, 49.3033], // Carentan
			[-1.183, 49.323], // Saint-Pellerin (intermediate)
			[-1.1014, 49.3194], // Isigny-sur-Mer
			[-1.024, 49.3197], // La Cambe (int.)
			[-0.9081, 49.3061], // Trévières
			[-0.79, 49.275], // Vaucelles (int.)
			[-0.7026, 49.2764], // Bayeux
			[-0.55, 49.255], // Lantheuil (int.)
			[-0.3707, 49.1829], // Caen
			[-0.21, 49.168], // Vimont (int.)
			[0.2275, 49.1444] // Lisieux
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'n13-cotentin-north',
		label: 'RN13',
		path: [
			[-1.2486, 49.3033], // Carentan
			[-1.3167, 49.4083], // Sainte-Mère-Église
			[-1.4694, 49.5083], // Valognes (int.)
			[-1.6259, 49.6307] // Cherbourg
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'n158-caen-falaise',
		label: 'RN158',
		path: [
			[-0.3707, 49.1829], // Caen
			[-0.32, 49.05], // Bretteville (int.)
			[-0.1989, 48.8919] // Falaise
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'd572-bayeux-stlo',
		label: 'D572',
		path: [
			[-0.7026, 49.2764], // Bayeux
			[-0.8344, 49.1864], // Balleroy (int.)
			[-1.0905, 49.1158] // Saint-Lô
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'd972-stlo-coutances',
		label: 'D972',
		path: [
			[-1.0905, 49.1158], // Saint-Lô
			[-1.2178, 49.0944], // Marigny (int.)
			[-1.4438, 49.0461] // Coutances
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	// D900 — Saint-Lô ↔ Carentan (north-south Cotentin neck)
	{
		id: 'd900-stlo-carentan',
		label: 'D900',
		path: [
			[-1.0905, 49.1158], // Saint-Lô
			[-1.13, 49.18], // Pont-Hébert (int.)
			[-1.2486, 49.3033] // Carentan
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	// D6 — Caen ↔ Cabourg (eastern coastal axis, runs along the Côte de
	// Nacre and crosses the Orne mouth defences)
	{
		id: 'd6-caen-cabourg',
		label: 'D513',
		path: [
			[-0.3707, 49.1829], // Caen
			[-0.27, 49.255], // Bénouville (int.)
			[-0.21, 49.275], // Sallenelles (int.)
			[-0.13, 49.292] // Cabourg
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	// D7 — Bayeux ↔ Port-en-Bessin (short coastal connector)
	{
		id: 'd7-bayeux-port-en-bessin',
		label: 'D6',
		path: [
			[-0.7026, 49.2764], // Bayeux
			[-0.745, 49.345] // Port-en-Bessin
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	// D971 — Coutances ↔ Avranches (south Cotentin)
	{
		id: 'd971-coutances-avranches',
		label: 'D971',
		path: [
			[-1.4438, 49.0461], // Coutances
			[-1.395, 48.86], // Granville-La Haye-Pesnel (int.)
			[-1.3608, 48.6839] // Avranches
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	// D924 — Saint-Lô ↔ Vire (south Bocage)
	{
		id: 'd924-stlo-vire',
		label: 'D524',
		path: [
			[-1.0905, 49.1158], // Saint-Lô
			[-1.02, 48.99], // Tessy-sur-Vire (int.)
			[-0.88, 48.84] // Vire
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	// D579 — Lisieux ↔ Pont-l'Évêque (link to Caen-Lisieux axis)
	{
		id: 'd579-falaise-lisieux',
		label: 'D511',
		path: [
			[-0.1989, 48.8919], // Falaise
			[0.05, 48.97], // Saint-Pierre-sur-Dives (int.)
			[0.2275, 49.1444] // Lisieux
		],
		sources: ['harrison-1951', 'bigot-maps']
	}
];

const ROAD_COLOR: [number, number, number, number] = [120, 100, 80, 220];
const MIN_ZOOM_ROADS = 7;

interface BuildRoadLayersOptions {
	zoom: number;
}

export function buildRoadLayers({ zoom }: BuildRoadLayersOptions): Layer[] {
	const visible = zoom >= MIN_ZOOM_ROADS;

	return [
		new PathLayer<Road>({
			id: 'roads-major',
			data: ROADS,
			visible,
			getPath: (d) => d.path,
			getColor: ROAD_COLOR,
			getWidth: 2,
			widthUnits: 'pixels',
			capRounded: true,
			jointRounded: true,
			pickable: false
		})
	];
}
