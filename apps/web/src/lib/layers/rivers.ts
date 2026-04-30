import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';

import type { Position } from '@d-day/schema';

interface River {
	id: string;
	label: string;
	path: Position[];
	sources: string[];
}

// Major Normandy rivers — schematic polylines through the key
// tactical-history nodes (mouth, main passes, sources). Coordinates
// are approximations meant to read as "an east-west arc through here"
// rather than a hydrographically faithful trace; intermediate
// waypoints add a meander pattern so the trace doesn't read as a
// straight road. Mouths are pushed slightly into the sea so the
// river clearly crosses the rendered coastline.
//
// Why these five:
// - Orne: Caen objective, Pegasus Bridge crossing.
// - Vire: Saint-Lô objective, Bocage obstacle.
// - Douve: Carentan flooding, Utah causeway problem.
// - Merderet: 82nd Airborne DZ corridor (La Fière).
// - Dives: 6th Airborne demolition zone (eastern flank).
const RIVERS: River[] = [
	{
		id: 'orne',
		label: 'Orne',
		path: [
			[-0.247, 49.305], // mouth into the Channel (offshore Ouistreham)
			[-0.255, 49.29], // Ouistreham harbour
			[-0.27, 49.255], // Bénouville / Pegasus Bridge
			[-0.295, 49.225], // Hérouville-Saint-Clair
			[-0.355, 49.195], // Caen north arm
			[-0.37, 49.183], // Caen city
			[-0.385, 49.16], // Louvigny meander
			[-0.41, 49.13], // Saint-André-sur-Orne
			[-0.45, 49.05], // Clécy gorges
			[-0.475, 48.99], // Thury-Harcourt
			[-0.42, 48.94], // bend east
			[-0.32, 48.91], // approach to Falaise
			[-0.2, 48.89], // Falaise pass
			[-0.08, 48.81], // bend SE
			[0.0, 48.74] // Argentan
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'vire',
		label: 'Vire',
		path: [
			[-1.105, 49.36], // mouth into Baie des Veys (offshore)
			[-1.105, 49.33], // delta
			[-1.115, 49.27], // Pont-Hébert north
			[-1.13, 49.18], // Pont-Hébert
			[-1.105, 49.13], // bend east
			[-1.0905, 49.1158], // Saint-Lô
			[-1.045, 49.05], // Torigny meander
			[-1.07, 48.96], // Pont-Farcy
			[-0.99, 48.89], // bend east
			[-0.88, 48.84] // Vire town
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'douve',
		label: 'Douve',
		path: [
			[-1.16, 49.385], // mouth into Baie des Veys (offshore)
			[-1.18, 49.36], // delta head
			[-1.22, 49.32], // Brévands marshes
			[-1.2486, 49.3033], // Carentan
			[-1.31, 49.32], // marshes west of Carentan
			[-1.38, 49.34], // bend NW
			[-1.45, 49.36], // Pont-l'Abbé
			[-1.52, 49.38], // Néhou
			[-1.55, 49.39] // source (Saint-Sauveur-le-Vicomte)
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'merderet',
		label: 'Merderet',
		path: [
			[-1.32, 49.36], // confluence with Douve
			[-1.335, 49.385], // Cauquigny / La Fière causeway
			[-1.36, 49.42], // Amfreville marshes
			[-1.4, 49.45] // approximate source (Étienville/Picauville plateau)
		],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'dives',
		label: 'Dives',
		path: [
			[-0.105, 49.305], // mouth (offshore Cabourg / Dives-sur-Mer)
			[-0.11, 49.285], // Dives-sur-Mer
			[-0.13, 49.24], // Bavent marshes
			[-0.18, 49.21], // Troarn
			[-0.16, 49.13], // bend SE
			[-0.1, 49.05], // Saint-Pierre-sur-Dives
			[0.0, 48.97], // Trun area
			[0.07, 48.93] // Vimoutiers
		],
		sources: ['harrison-1951', 'bigot-maps']
	}
];

const RIVER_COLOR: [number, number, number, number] = [70, 120, 170, 230];
const MIN_ZOOM_RIVERS = 7;
const RIVER_WIDTH_PX = 3;

interface BuildRiverLayersOptions {
	zoom: number;
}

export function buildRiverLayers({ zoom }: BuildRiverLayersOptions): Layer[] {
	const visible = zoom >= MIN_ZOOM_RIVERS;

	return [
		new PathLayer<River>({
			id: 'rivers-major',
			data: RIVERS,
			visible,
			getPath: (d) => d.path,
			getColor: RIVER_COLOR,
			getWidth: RIVER_WIDTH_PX,
			widthUnits: 'pixels',
			capRounded: true,
			jointRounded: true,
			pickable: false
		})
	];
}
