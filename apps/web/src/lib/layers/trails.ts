import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { Side } from '@d-day/schema';

import { unitPositionAt, type UnitTrack } from '$lib/data-loader';

interface BuildTrailLayersOptions {
	tracks: UnitTrack[];
	isoTime: string;
}

interface TrailSegment {
	side: Side;
	path: [[number, number], [number, number]];
	alpha: number;
}

const HALF_LIFE_MS = 2 * 3600 * 1000;
const MAX_ALPHA = 160;
const MIN_VISIBLE_ALPHA = 6;

/**
 * Per-segment fading trail. Each segment between consecutive passed
 * waypoints (and from the last waypoint to the current head) gets an
 * alpha that decays exponentially from when the unit reached the
 * segment's far endpoint. Older segments fade out, recent direction
 * stays visible.
 */
export function buildTrailLayers({
	tracks,
	isoTime
}: BuildTrailLayersOptions): Layer[] {
	const segments: TrailSegment[] = [];
	const t = Date.parse(isoTime);

	for (const track of tracks) {
		const wps = track.movement.waypoints;
		if (wps.length === 0) continue;

		const reached: Array<{ pos: [number, number]; passedAt: number }> = [];
		for (const w of wps) {
			const wt = Date.parse(w.time);
			if (wt <= t) reached.push({ pos: w.position, passedAt: wt });
			else break;
		}
		const head = unitPositionAt(track, isoTime);
		if (!head) continue;
		const last = reached[reached.length - 1];
		if (!last || last.pos[0] !== head[0] || last.pos[1] !== head[1]) {
			reached.push({ pos: head, passedAt: t });
		}
		if (reached.length < 2) continue;

		for (let i = 1; i < reached.length; i++) {
			const ageMs = Math.max(0, t - reached[i].passedAt);
			const alpha = MAX_ALPHA * Math.pow(0.5, ageMs / HALF_LIFE_MS);
			if (alpha < MIN_VISIBLE_ALPHA) continue;
			segments.push({
				side: track.unit.side,
				path: [reached[i - 1].pos, reached[i].pos],
				alpha
			});
		}
	}

	if (segments.length === 0) return [];

	return [
		new PathLayer<TrailSegment>({
			id: 'unit-trails',
			data: segments,
			getPath: (d) => d.path,
			getColor: (d) =>
				d.side === 'allied'
					? [80, 150, 230, d.alpha]
					: [220, 80, 80, d.alpha],
			getWidth: 3,
			widthUnits: 'pixels',
			widthMinPixels: 2,
			capRounded: true,
			jointRounded: true,
			pickable: false,
			updateTriggers: { getColor: isoTime }
		})
	];
}
