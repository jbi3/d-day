import { interpolateWaypointsAt, type VesselWithTrack } from '$lib/data-loader';
import type { Vessel } from '@d-day/schema';
import type { Layer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';

import { vesselIconUri } from './vessel-icons';

interface BuildNavalOptions {
	vessels: VesselWithTrack[];
	isoTime: string;
	zoom: number;
}

interface VesselMarker {
	id: string;
	position: [number, number];
	icon: string;
	kind: Vessel['kind'];
	country: string;
	displacement: number;
	label: string;
}

const SIZE_BASE = 6000; // metres — base for a 14k-ton cruiser
const SIZE_REF_DISPLACEMENT = 14000;
const SIZE_MIN_PX = 22;
const SIZE_MAX_PX = 56;

export function buildNavalLayers({ vessels, isoTime, zoom: _zoom }: BuildNavalOptions): Layer[] {
	const markers: VesselMarker[] = [];
	for (const { vessel, track } of vessels) {
		const pos = interpolateWaypointsAt(track.waypoints, isoTime);
		if (!pos) continue;
		const displacement = vessel.displacement ?? 6000;
		markers.push({
			id: vessel.id,
			position: pos,
			icon: vesselIconUri(vessel.kind, vessel.country),
			kind: vessel.kind,
			country: vessel.country,
			displacement,
			label: vessel.name
		});
	}

	if (markers.length === 0) return [];

	return [
		new IconLayer<VesselMarker>({
			id: 'vessels',
			data: markers,
			pickable: true,
			getPosition: (d) => d.position,
			getIcon: (d) => ({
				url: d.icon,
				width: 64,
				height: 32,
				anchorX: 32,
				anchorY: 16
			}),
			sizeUnits: 'meters',
			getSize: (d) => SIZE_BASE * Math.sqrt(d.displacement / SIZE_REF_DISPLACEMENT),
			sizeMinPixels: SIZE_MIN_PX,
			sizeMaxPixels: SIZE_MAX_PX,
			updateTriggers: {
				getPosition: isoTime
			}
		})
	];
}
