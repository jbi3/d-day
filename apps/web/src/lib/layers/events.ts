import { ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { MapEvent } from '@d-day/schema';

interface BuildEventLayerOptions {
	events: MapEvent[];
	currentEpoch: number;
	/** events within ±windowMs of currentEpoch are shown as "active". */
	windowMs?: number;
}

interface EventMarker {
	id: string;
	position: [number, number];
	disputed: boolean;
	active: boolean;
	title: string;
}

/**
 * Renders event positions as small markers on the map. Events within
 * ±windowMs of the current sim time are highlighted as "active";
 * those outside are dimmed but still visible so you can see what's
 * coming. Disputed events get a slightly different color.
 */
export function buildEventLayers({
	events,
	currentEpoch,
	windowMs = 30 * 60 * 1000
}: BuildEventLayerOptions): Layer[] {
	const markers: EventMarker[] = events.map((e) => {
		const epoch = Date.parse(e.time);
		const active = Math.abs(epoch - currentEpoch) <= windowMs;
		return {
			id: e.id,
			position: e.position,
			disputed: (e.disputedBy?.length ?? 0) > 0,
			active,
			title: e.title
		};
	});

	return [
		new ScatterplotLayer<EventMarker>({
			id: 'events',
			data: markers,
			getPosition: (d) => d.position,
			getRadius: (d) => (d.active ? 600 : 250),
			radiusUnits: 'meters',
			radiusMinPixels: 3,
			radiusMaxPixels: 14,
			getFillColor: (d) =>
				d.disputed
					? d.active
						? [240, 130, 70, 230]
						: [200, 100, 50, 130]
					: d.active
						? [240, 200, 30, 230]
						: [180, 150, 30, 130],
			stroked: true,
			getLineColor: [20, 20, 20, 220],
			lineWidthUnits: 'pixels',
			getLineWidth: 1,
			pickable: true
		})
	];
}
