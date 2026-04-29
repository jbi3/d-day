import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { Branch, Side } from '@d-day/schema';

import { unitPositionAt, type UnitTrack } from '$lib/data-loader';

interface BuildUnitLayersOptions {
	tracks: UnitTrack[];
	isoTime: string;
}

interface UnitMarker {
	id: string;
	side: Side;
	branch: Branch;
	position: [number, number];
	label: string;
}

export function buildUnitLayers({ tracks, isoTime }: BuildUnitLayersOptions): Layer[] {
	const points: UnitMarker[] = [];
	for (const track of tracks) {
		const position = unitPositionAt(track, isoTime);
		if (!position) continue;
		points.push({
			id: track.unit.id,
			side: track.unit.side,
			branch: track.unit.branch,
			position,
			label: track.unit.shortName ?? track.unit.name
		});
	}

	return [
		new ScatterplotLayer<UnitMarker>({
			id: 'units-marker',
			data: points,
			getPosition: (d) => d.position,
			getRadius: 1500,
			radiusUnits: 'meters',
			radiusMinPixels: 4,
			radiusMaxPixels: 28,
			getFillColor: (d) => unitColor(d.side, d.branch),
			stroked: true,
			getLineColor: [240, 240, 240, 240],
			lineWidthUnits: 'pixels',
			getLineWidth: 2,
			pickable: true
		}),
		new TextLayer<UnitMarker>({
			id: 'units-label',
			data: points,
			getPosition: (d) => d.position,
			getText: (d) => d.label,
			getSize: 12,
			getColor: [240, 240, 240, 230],
			getPixelOffset: [0, -22],
			fontFamily: 'system-ui, sans-serif',
			fontWeight: 600,
			outlineColor: [0, 0, 0, 200],
			outlineWidth: 2,
			fontSettings: { sdf: true }
		})
	];
}

/**
 * NATO-flavored hue families: Allied = blue family, Axis = red family.
 * Branch shifts hue/value within the family. Stays a soft palette to
 * sit on a painted basemap later (post-MVP). RGBA, alpha 220.
 */
function unitColor(side: Side, branch: Branch): [number, number, number, number] {
	const allied: Partial<Record<Branch, [number, number, number, number]>> = {
		infantry: [60, 130, 210, 220],
		airborne: [110, 175, 235, 220],
		armor: [40, 90, 150, 220],
		engineer: [80, 120, 170, 220],
		artillery: [50, 100, 180, 220],
		naval: [25, 70, 130, 220],
		air: [140, 195, 240, 220]
	};
	const axis: Partial<Record<Branch, [number, number, number, number]>> = {
		infantry: [200, 70, 70, 220],
		airborne: [220, 115, 95, 220],
		armor: [150, 40, 40, 220],
		engineer: [185, 85, 85, 220],
		artillery: [180, 60, 60, 220],
		naval: [120, 30, 30, 220],
		air: [225, 130, 110, 220]
	};
	const palette = side === 'allied' ? allied : axis;
	return palette[branch] ?? [140, 140, 140, 220];
}
