import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { FrontlineSegment, Position } from '@d-day/schema';

interface BuildFrontlineLayersOptions {
	segments: FrontlineSegment[];
	currentEpoch: number;
	/** Fade-in window when a segment first becomes active. */
	fadeInMs?: number;
}

interface FrontlinePath {
	id: string;
	path: Position[];
	alpha: number;
}

const DEFAULT_FADE_IN_MS = 30 * 60 * 1000;

/**
 * Renders the timestamped frontline keyframes as soft polylines.
 *
 * For each segment: invisible until its first keyframe, fades in over
 * `fadeInMs`, then linearly interpolates each vertex between adjacent
 * keyframes, and holds the last keyframe's shape after the final one.
 *
 * Geometries are approximate per CLAUDE.md sourcing posture (the data
 * file cites harrison-1951 + us-na-aar). Width is fixed in pixels so
 * the line stays a quiet hint behind the unit icons rather than a
 * dominant graphical element.
 */
export function buildFrontlineLayers({
	segments,
	currentEpoch,
	fadeInMs = DEFAULT_FADE_IN_MS
}: BuildFrontlineLayersOptions): Layer[] {
	const paths: FrontlinePath[] = [];

	for (const seg of segments) {
		const kfs = seg.keyframes;
		if (kfs.length === 0) continue;

		const firstEpoch = Date.parse(kfs[0].time);
		if (currentEpoch < firstEpoch) continue;

		// Fade-in alpha as the segment first appears.
		const sinceFirst = currentEpoch - firstEpoch;
		const fadeIn = Math.min(1, sinceFirst / fadeInMs);
		const baseAlpha = 170;
		const alpha = baseAlpha * fadeIn;

		const path = interpolatePath(kfs, currentEpoch);
		if (seg.closed && path.length >= 2) {
			path.push(path[0]);
		}
		paths.push({ id: seg.id, path, alpha });
	}

	if (paths.length === 0) return [];

	return [
		new PathLayer<FrontlinePath>({
			id: 'frontline',
			data: paths,
			getPath: (d) => d.path,
			getColor: (d) => [200, 60, 50, d.alpha],
			getWidth: 4,
			widthUnits: 'pixels',
			widthMinPixels: 2,
			widthMaxPixels: 6,
			capRounded: true,
			jointRounded: true,
			pickable: false,
			updateTriggers: { getColor: currentEpoch }
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
				out[j] = [pa[j][0] + (pb[j][0] - pa[j][0]) * f, pa[j][1] + (pb[j][1] - pa[j][1]) * f];
			}
			return out;
		}
	}
	return keyframes[keyframes.length - 1].path.map((p) => [p[0], p[1]]);
}
