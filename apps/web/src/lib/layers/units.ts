import { IconLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { Branch, Side } from '@d-day/schema';

import { unitPositionAt, type UnitTrack } from '$lib/data-loader';
import { unitIcon, type UnitIconSpec } from './unit-icons';

interface BuildUnitLayersOptions {
	tracks: UnitTrack[];
	isoTime: string;
}

interface UnitMarker {
	id: string;
	side: Side;
	branch: Branch;
	country: string;
	position: [number, number];
	label: string;
	icon: UnitIconSpec;
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
			country: track.unit.country,
			position,
			label: track.unit.shortName ?? track.unit.name,
			icon: unitIcon(track.unit.side, track.unit.branch, track.unit.country)
		});
	}

	return [
		new IconLayer<UnitMarker>({
			id: 'units-marker',
			data: points,
			getPosition: (d) => d.position,
			getIcon: (d) => d.icon,
			getSize: 56,
			sizeUnits: 'pixels',
			pickable: true
		}),
		new TextLayer<UnitMarker>({
			id: 'units-label',
			data: points,
			getPosition: (d) => d.position,
			getText: (d) => d.label,
			getSize: 12,
			getColor: [240, 240, 240, 230],
			getPixelOffset: [0, 36],
			fontFamily: 'system-ui, sans-serif',
			fontWeight: 600,
			outlineColor: [0, 0, 0, 200],
			outlineWidth: 2,
			fontSettings: { sdf: true }
		})
	];
}
