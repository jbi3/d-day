import { unitPositionAt, type UnitTrack } from '$lib/data-loader';
import type { Branch, Side } from '@d-day/schema';
import type { Layer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';

import { unitIcon, type AxisAffiliation, type UnitIconSpec } from './unit-icons';

interface BuildUnitLayersOptions {
	tracks: UnitTrack[];
	isoTime: string;
	zoom: number;
}

interface UnitMarker {
	id: string;
	side: Side;
	branch: Branch;
	country: string;
	position: [number, number];
	icon: UnitIconSpec;
	strength: number;
	/** Used by the +page.svelte hover tooltip; not rendered as a permanent label. */
	label: string;
}

// Importance-based zoom thresholds, mirroring `toponyms.ts`. Bayeux
// (the MVP-relevant Norman town tier) appears at zoom 8; unit icons
// come a half-tier later so the place reads first, the symbol second.
// No more text label below — division number lives inside the icon
// now (see unit-icons.ts), and the full unit detail opens via the
// click fiche.
const MIN_ZOOM_ICON = 8.5;

// Strength weighting: icons sized in meters, then clamped in
// pixels. Reference 14 000 ≈ a US infantry division ⇒ baseline
// 6 000 m. sqrt scaling differentiates 82nd Abn (~10 400) from
// 91./709. (~17 000) without over-amplifying.
const ICON_BASE_METERS = 6000;
const STRENGTH_REF = 14000;
const STRENGTH_FALLBACK = 14000;

// Pull the leading division number out of `shortName`. Handles the
// MVP's six formations:
//   "1st ID"            → "1"
//   "29th ID"           → "29"
//   "82nd Abn"          → "82"
//   "101st Abn"         → "101"
//   "352. ID"           → "352"
//   "91./709. (Cotentin)" → "91/709"
// Falls back to the raw shortName if no digits are found.
function extractDivisionNumber(shortName: string): string {
	const matches = shortName.match(/\d+/g);
	if (!matches || matches.length === 0) return shortName;
	return matches.join('/');
}

export function buildUnitLayers({ tracks, isoTime, zoom }: BuildUnitLayersOptions): Layer[] {
	const points: UnitMarker[] = [];
	for (const track of tracks) {
		const position = unitPositionAt(track, isoTime);
		if (!position) continue;
		const displayNumber = extractDivisionNumber(track.unit.shortName ?? track.unit.name);
		const axisAffiliation: AxisAffiliation = track.unit.axisAffiliation ?? 'wehrmacht';
		points.push({
			id: track.unit.id,
			side: track.unit.side,
			branch: track.unit.branch,
			country: track.unit.country,
			position,
			icon: unitIcon(
				track.unit.side,
				track.unit.branch,
				track.unit.country,
				displayNumber,
				axisAffiliation
			),
			strength: track.unit.strength ?? STRENGTH_FALLBACK,
			label: track.unit.shortName ?? track.unit.name
		});
	}

	const showIcon = zoom >= MIN_ZOOM_ICON;

	return [
		new IconLayer<UnitMarker>({
			id: 'units-marker',
			data: points,
			visible: showIcon,
			getPosition: (d) => d.position,
			getIcon: (d) => d.icon,
			getSize: (d) => ICON_BASE_METERS * Math.sqrt(d.strength / STRENGTH_REF),
			sizeUnits: 'meters',
			sizeMinPixels: 28,
			sizeMaxPixels: 72,
			pickable: showIcon
		})
	];
}
