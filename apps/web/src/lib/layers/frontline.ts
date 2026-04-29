import { PolygonLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import polygonClipping, { type Polygon as PCPolygon, type Ring as PCRing } from 'polygon-clipping';
import type { FrontlineSegment, Position } from '@d-day/schema';

import { NORMANDY_LAND_RING } from './normandy-land';

interface BuildFrontlineLayersOptions {
	segments: FrontlineSegment[];
	currentEpoch: number;
}

interface FrontlinePolygon {
	id: string;
	contour: Position[][];
}

const SMOOTH_ITERATIONS = 3;
const FILL_ALPHA = 38;
const STROKE_ALPHA = 150;
const ALLIED_BLUE: [number, number, number] = [80, 150, 230];

/**
 * Allied-held territory polygons. Each segment is interpolated +
 * smoothed, then all segments are unioned (touching territories merge
 * into one shape, no crossing outlines), then intersected with a
 * Normandy land mask so polygons never spill onto the sea.
 *
 * Geometries approximate per CLAUDE.md sourcing posture; primary
 * sources cited on the data file are harrison-1951 and us-na-aar.
 */
export function buildFrontlineLayers({
	segments,
	currentEpoch
}: BuildFrontlineLayersOptions): Layer[] {
	const segmentRings: PCRing[] = [];

	for (const seg of segments) {
		const kfs = seg.keyframes;
		if (kfs.length === 0) continue;
		const firstEpoch = Date.parse(kfs[0].time);
		if (currentEpoch < firstEpoch) continue;

		const interpolated = interpolatePath(kfs, currentEpoch);
		const smoothed = chaikin(interpolated, SMOOTH_ITERATIONS);
		segmentRings.push(toRing(smoothed));
	}

	if (segmentRings.length === 0) return [];

	// Union all active territories.
	const wrapped = segmentRings.map<PCPolygon[]>((ring) => [[ring]]);
	const merged = polygonClipping.union(wrapped[0], ...wrapped.slice(1));

	// Clip to land.
	const landMP: PCPolygon[] = [[toRing(NORMANDY_LAND_RING)]];
	const clipped = polygonClipping.intersection(merged, landMP);

	const polys: FrontlinePolygon[] = clipped.map((polygon, i) => ({
		id: `frontline-${i}`,
		contour: polygon.map((ring) => ring.map(([x, y]) => [x, y] as Position))
	}));

	return [
		new PolygonLayer<FrontlinePolygon>({
			id: 'frontline-territory',
			data: polys,
			getPolygon: (d) => d.contour,
			getFillColor: [...ALLIED_BLUE, FILL_ALPHA],
			getLineColor: [...ALLIED_BLUE, STROKE_ALPHA],
			lineWidthUnits: 'pixels',
			getLineWidth: 2,
			lineWidthMinPixels: 1,
			stroked: true,
			filled: true,
			pickable: false
		})
	];
}

function toRing(points: Position[]): PCRing {
	return points.map(([x, y]) => [x, y] as [number, number]);
}

function interpolatePath(
	keyframes: { time: string; path: Position[] }[],
	currentEpoch: number
): Position[] {
	const epochs = keyframes.map((k) => Date.parse(k.time));

	if (currentEpoch <= epochs[0]) return keyframes[0].path.map((p) => [p[0], p[1]]);
	if (currentEpoch >= epochs[epochs.length - 1]) {
		return keyframes[keyframes.length - 1].path.map((p) => [p[0], p[1]]);
	}

	for (let i = 0; i < keyframes.length - 1; i++) {
		const a = epochs[i];
		const b = epochs[i + 1];
		if (currentEpoch >= a && currentEpoch <= b) {
			const f = (currentEpoch - a) / (b - a);
			const pa = keyframes[i].path;
			const pb = keyframes[i + 1].path;
			const out: Position[] = new Array(pa.length);
			for (let j = 0; j < pa.length; j++) {
				out[j] = [
					pa[j][0] + (pb[j][0] - pa[j][0]) * f,
					pa[j][1] + (pb[j][1] - pa[j][1]) * f
				];
			}
			return out;
		}
	}
	return keyframes[keyframes.length - 1].path.map((p) => [p[0], p[1]]);
}

/** Chaikin's corner-cutting algorithm on a closed polygon. */
function chaikin(points: Position[], iterations: number): Position[] {
	let curr = points;
	for (let it = 0; it < iterations; it++) {
		const n = curr.length;
		const next: Position[] = new Array(n * 2);
		for (let i = 0; i < n; i++) {
			const a = curr[i];
			const b = curr[(i + 1) % n];
			next[2 * i] = [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]];
			next[2 * i + 1] = [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]];
		}
		curr = next;
	}
	return curr;
}
