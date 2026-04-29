import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { Side } from '@d-day/schema';

import { unitPositionAt, type UnitTrack } from '$lib/data-loader';

interface BuildTrailLayersOptions {
	tracks: UnitTrack[];
	isoTime: string;
}

interface TrailEntry {
	id: string;
	side: Side;
	path: [number, number][];
}

/**
 * Per-unit fading trail: for each track, builds the polyline from the
 * first waypoint through every passed waypoint and ending at the
 * current interpolated position. Color follows the side hue family
 * but dimmer than the live marker — suggesting "where the unit has
 * been" without competing with the current position.
 *
 * Fading toward the tail is approximated via deck.gl's getColor and
 * a low alpha; finer-grained per-vertex alpha gradient would need a
 * custom shader and is left for post-MVP.
 */
export function buildTrailLayers({
	tracks,
	isoTime
}: BuildTrailLayersOptions): Layer[] {
	const trails: TrailEntry[] = [];
	const t = Date.parse(isoTime);

	for (const track of tracks) {
		const wps = track.movement.waypoints;
		if (wps.length === 0) continue;

		const path: [number, number][] = [];
		for (const w of wps) {
			if (Date.parse(w.time) <= t) path.push(w.position);
			else break;
		}
		const head = unitPositionAt(track, isoTime);
		if (head) {
			const last = path[path.length - 1];
			if (!last || last[0] !== head[0] || last[1] !== head[1]) path.push(head);
		}
		if (path.length < 2) continue;

		trails.push({
			id: track.unit.id,
			side: track.unit.side,
			path
		});
	}

	if (trails.length === 0) return [];

	return [
		new PathLayer<TrailEntry>({
			id: 'unit-trails',
			data: trails,
			getPath: (d) => d.path,
			getColor: (d) =>
				d.side === 'allied' ? [80, 150, 230, 90] : [220, 80, 80, 90],
			getWidth: 3,
			widthUnits: 'pixels',
			widthMinPixels: 2,
			capRounded: true,
			jointRounded: true,
			pickable: false
		})
	];
}
