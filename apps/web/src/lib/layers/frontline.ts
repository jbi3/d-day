import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';

import { unitPositionAt, type UnitTrack } from '$lib/data-loader';

interface BuildFrontlineLayersOptions {
	tracks: UnitTrack[];
	isoTime: string;
}

interface FrontlinePath {
	side: 'allied' | 'axis';
	path: [number, number][];
}

/**
 * Soft animated "frontline" layer. For each side, takes the current
 * interpolated positions of all units on that side, sorts them
 * west-to-east by longitude, and renders the resulting polyline as
 * a translucent soft path. Not a proper military frontline — an MVP
 * visual proxy that morphs as units move.
 */
export function buildFrontlineLayers({
	tracks,
	isoTime
}: BuildFrontlineLayersOptions): Layer[] {
	const allied: [number, number][] = [];
	const axis: [number, number][] = [];

	for (const track of tracks) {
		const position = unitPositionAt(track, isoTime);
		if (!position) continue;
		(track.unit.side === 'allied' ? allied : axis).push(position);
	}

	const sortByLon = (a: [number, number], b: [number, number]) => a[0] - b[0];
	allied.sort(sortByLon);
	axis.sort(sortByLon);

	const paths: FrontlinePath[] = [];
	if (allied.length >= 2) paths.push({ side: 'allied', path: allied });
	if (axis.length >= 2) paths.push({ side: 'axis', path: axis });

	return [
		new PathLayer<FrontlinePath>({
			id: 'frontline',
			data: paths,
			getPath: (d) => d.path,
			getColor: (d) =>
				d.side === 'allied' ? [80, 150, 230, 130] : [220, 80, 80, 130],
			getWidth: 6,
			widthUnits: 'pixels',
			widthMinPixels: 3,
			capRounded: true,
			jointRounded: true,
			pickable: false
		})
	];
}
