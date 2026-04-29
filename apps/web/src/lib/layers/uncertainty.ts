import { ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { MapEvent } from '@d-day/schema';

import { unitPositionAt, type UnitTrack } from '$lib/data-loader';

interface BuildUncertaintyLayersOptions {
	tracks: UnitTrack[];
	events: MapEvent[];
	isoTime: string;
	currentEpoch: number;
	/** events within ±activeWindowMs are considered "currently happening". */
	activeWindowMs?: number;
}

interface UncertaintyMarker {
	id: string;
	position: [number, number];
	kind: 'unit-bracket' | 'event';
	claimCount: number;
}

/**
 * Visualises the disputedBy entries from the data: any unit whose
 * current interpolated position is bracketed by waypoints with
 * disputedBy claims, and any active event with disputedBy claims,
 * gets a soft ring drawn around it. Per CLAUDE.md sourcing posture,
 * contested facts must be visible — this is the layer the schema's
 * disputedBy field was designed to feed.
 */
export function buildUncertaintyLayers({
	tracks,
	events,
	isoTime,
	currentEpoch,
	activeWindowMs = 30 * 60 * 1000
}: BuildUncertaintyLayersOptions): Layer[] {
	const markers: UncertaintyMarker[] = [];
	const t = Date.parse(isoTime);

	for (const track of tracks) {
		const wps = track.movement.waypoints;
		if (wps.length === 0) continue;

		// Find the bracketing pair (or clamp).
		let claimCount = 0;
		let bracketed = false;
		for (let i = 0; i < wps.length - 1; i++) {
			const a = Date.parse(wps[i].time);
			const b = Date.parse(wps[i + 1].time);
			if (t >= a && t <= b) {
				claimCount += wps[i].disputedBy?.length ?? 0;
				claimCount += wps[i + 1].disputedBy?.length ?? 0;
				bracketed = true;
				break;
			}
		}
		// Outside the track range: count first/last waypoint disputes.
		if (!bracketed) {
			if (t < Date.parse(wps[0].time)) {
				claimCount = wps[0].disputedBy?.length ?? 0;
			} else {
				claimCount = wps[wps.length - 1].disputedBy?.length ?? 0;
			}
		}
		if (claimCount === 0) continue;

		const position = unitPositionAt(track, isoTime);
		if (!position) continue;
		markers.push({
			id: `${track.unit.id}-uncertainty`,
			position,
			kind: 'unit-bracket',
			claimCount
		});
	}

	for (const e of events) {
		const claimCount = e.disputedBy?.length ?? 0;
		if (claimCount === 0) continue;
		const epoch = Date.parse(e.time);
		if (Math.abs(epoch - currentEpoch) > activeWindowMs) continue;
		markers.push({
			id: `event-${e.id}-uncertainty`,
			position: e.position,
			kind: 'event',
			claimCount
		});
	}

	if (markers.length === 0) return [];

	return [
		new ScatterplotLayer<UncertaintyMarker>({
			id: 'uncertainty',
			data: markers,
			getPosition: (d) => d.position,
			getRadius: (d) => 2200 + d.claimCount * 400,
			radiusUnits: 'meters',
			radiusMinPixels: 18,
			radiusMaxPixels: 60,
			getFillColor: [240, 130, 70, 50],
			stroked: true,
			getLineColor: [240, 130, 70, 200],
			lineWidthUnits: 'pixels',
			getLineWidth: 1.5,
			pickable: false
		})
	];
}
