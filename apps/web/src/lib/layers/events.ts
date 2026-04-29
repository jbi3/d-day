import { ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { MapEvent } from '@d-day/schema';

interface BuildEventLayerOptions {
	events: MapEvent[];
	currentEpoch: number;
	/** Active highlight window after the event time. */
	activeMs?: number;
	/** Half-life of the post-active fade. */
	halfLifeMs?: number;
}

interface EventMarker {
	id: string;
	position: [number, number];
	disputed: boolean;
	active: boolean;
	alpha: number;
	radiusM: number;
	title: string;
}

const ACTIVE_RADIUS_M = 600;
const FADED_RADIUS_M = 250;
const ACTIVE_ALPHA = 230;
const MIN_VISIBLE_ALPHA = 12;

/**
 * Progressive disclosure: events are hidden until their time, shown
 * with the "active" highlight for `activeMs` after they fire, then
 * fade out exponentially. Reduces always-on graphical clutter.
 */
export function buildEventLayers({
	events,
	currentEpoch,
	activeMs = 30 * 60 * 1000,
	halfLifeMs = 60 * 60 * 1000
}: BuildEventLayerOptions): Layer[] {
	const markers: EventMarker[] = [];
	for (const e of events) {
		const epoch = Date.parse(e.time);
		const ageMs = currentEpoch - epoch;
		if (ageMs < 0) continue;

		let alpha: number;
		let active: boolean;
		let radiusM: number;
		if (ageMs <= activeMs) {
			alpha = ACTIVE_ALPHA;
			active = true;
			radiusM = ACTIVE_RADIUS_M;
		} else {
			alpha = ACTIVE_ALPHA * Math.pow(0.5, (ageMs - activeMs) / halfLifeMs);
			if (alpha < MIN_VISIBLE_ALPHA) continue;
			active = false;
			radiusM = FADED_RADIUS_M;
		}

		markers.push({
			id: e.id,
			position: e.position,
			disputed: (e.disputedBy?.length ?? 0) > 0,
			active,
			alpha,
			radiusM,
			title: e.title
		});
	}

	if (markers.length === 0) return [];

	return [
		new ScatterplotLayer<EventMarker>({
			id: 'events',
			data: markers,
			getPosition: (d) => d.position,
			getRadius: (d) => d.radiusM,
			radiusUnits: 'meters',
			radiusMinPixels: 3,
			radiusMaxPixels: 14,
			getFillColor: (d) =>
				d.disputed
					? [240, 130, 70, d.alpha]
					: [240, 200, 30, d.alpha],
			stroked: true,
			getLineColor: (d) => [20, 20, 20, Math.min(220, d.alpha)],
			lineWidthUnits: 'pixels',
			getLineWidth: 1,
			pickable: true,
			updateTriggers: {
				getRadius: currentEpoch,
				getFillColor: currentEpoch,
				getLineColor: currentEpoch
			}
		})
	];
}
