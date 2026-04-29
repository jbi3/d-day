import { PolygonLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { FrontlineSegment, Position } from '@d-day/schema';

interface BuildFrontlineLayersOptions {
	segments: FrontlineSegment[];
	currentEpoch: number;
	/** Fade-in window when a segment first appears. */
	fadeInMs?: number;
}

interface FrontlinePolygon {
	id: string;
	contour: Position[];
	alpha: number; // 0..1
}

const SMOOTH_ITERATIONS = 3;
const FILL_ALPHA = 36;
const STROKE_ALPHA = 150;
const ALLIED_BLUE: [number, number, number] = [80, 150, 230];

/**
 * The frontline as Allied-controlled territory: France is treated as
 * occupied by default, and each segment is a closed polygon marking
 * a zone the Allies have liberated/established a foothold in.
 *
 * Vertices are interpolated linearly between adjacent keyframes, then
 * smoothed with Chaikin's algorithm so the boundary reads as an
 * organic moving front rather than a fixed angular line.
 *
 * Geometries are approximate per CLAUDE.md sourcing posture (cited:
 * harrison-1951, us-na-aar). Segments fade in over fadeInMs around
 * their first keyframe.
 */
export function buildFrontlineLayers({
	segments,
	currentEpoch,
	fadeInMs = 30 * 60 * 1000
}: BuildFrontlineLayersOptions): Layer[] {
	const polys: FrontlinePolygon[] = [];

	for (const seg of segments) {
		const kfs = seg.keyframes;
		if (kfs.length === 0) continue;
		const firstEpoch = Date.parse(kfs[0].time);
		if (currentEpoch < firstEpoch) continue;

		const fadeIn = Math.min(1, (currentEpoch - firstEpoch) / fadeInMs);

		const interpolated = interpolatePath(kfs, currentEpoch);
		const smoothed = chaikin(interpolated, SMOOTH_ITERATIONS);

		polys.push({ id: seg.id, contour: smoothed, alpha: fadeIn });
	}

	if (polys.length === 0) return [];

	return [
		new PolygonLayer<FrontlinePolygon>({
			id: 'frontline-territory',
			data: polys,
			getPolygon: (d) => d.contour,
			getFillColor: (d) => [...ALLIED_BLUE, Math.round(FILL_ALPHA * d.alpha)],
			getLineColor: (d) => [...ALLIED_BLUE, Math.round(STROKE_ALPHA * d.alpha)],
			lineWidthUnits: 'pixels',
			getLineWidth: 2,
			lineWidthMinPixels: 1,
			stroked: true,
			filled: true,
			pickable: false,
			updateTriggers: {
				getFillColor: currentEpoch,
				getLineColor: currentEpoch
			}
		})
	];
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
