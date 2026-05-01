import type { Position } from '@d-day/schema';
import { describe, expect, it } from 'vitest';

import { chaikin, interpolatePath } from './frontline';

const t = (iso: string) => Date.parse(iso);

const kf = (time: string, path: Position[]) => ({ time, path });

describe('interpolatePath', () => {
	const twoFrames = [
		kf('1944-06-06T02:30:00Z', [
			[0, 0],
			[10, 0],
			[10, 10]
		]),
		kf('1944-06-06T06:30:00Z', [
			[0, 0],
			[20, 0],
			[20, 20]
		])
	];

	it('returns first keyframe path when currentEpoch is before window', () => {
		const out = interpolatePath(twoFrames, t('1944-06-06T00:00:00Z'));
		expect(out).toEqual(twoFrames[0].path);
	});

	it('returns first keyframe path when currentEpoch equals first keyframe', () => {
		const out = interpolatePath(twoFrames, t('1944-06-06T02:30:00Z'));
		expect(out).toEqual(twoFrames[0].path);
	});

	it('returns last keyframe path when currentEpoch equals last keyframe', () => {
		const out = interpolatePath(twoFrames, t('1944-06-06T06:30:00Z'));
		expect(out).toEqual(twoFrames[1].path);
	});

	it('returns last keyframe path when currentEpoch is past window (no extrapolation)', () => {
		const out = interpolatePath(twoFrames, t('1944-06-06T18:00:00Z'));
		expect(out).toEqual(twoFrames[1].path);
	});

	it('linearly interpolates each vertex at the midpoint', () => {
		const out = interpolatePath(twoFrames, t('1944-06-06T04:30:00Z'));
		expect(out).toHaveLength(3);
		expect(out[0][0]).toBeCloseTo(0);
		expect(out[0][1]).toBeCloseTo(0);
		expect(out[1][0]).toBeCloseTo(15);
		expect(out[1][1]).toBeCloseTo(0);
		expect(out[2][0]).toBeCloseTo(15);
		expect(out[2][1]).toBeCloseTo(15);
	});

	it('preserves vertex count', () => {
		const out = interpolatePath(twoFrames, t('1944-06-06T03:00:00Z'));
		expect(out).toHaveLength(twoFrames[0].path.length);
	});

	const threeFrames = [
		kf('1944-06-06T02:30:00Z', [
			[0, 0],
			[10, 0]
		]),
		kf('1944-06-06T06:30:00Z', [
			[0, 0],
			[20, 0]
		]),
		kf('1944-06-06T12:00:00Z', [
			[0, 0],
			[40, 0]
		])
	];

	it('selects the correct bracketing pair when there are >2 keyframes', () => {
		const between12 = interpolatePath(threeFrames, t('1944-06-06T04:30:00Z'));
		expect(between12[1][0]).toBeCloseTo(15);

		const between23 = interpolatePath(threeFrames, t('1944-06-06T09:15:00Z'));
		expect(between23[1][0]).toBeCloseTo(30);
	});

	it('returns a fresh array (callers may mutate without aliasing keyframes)', () => {
		const out = interpolatePath(twoFrames, t('1944-06-06T02:30:00Z'));
		expect(out).not.toBe(twoFrames[0].path);
		out[0][0] = 9999;
		expect(twoFrames[0].path[0][0]).toBe(0);

		const past = interpolatePath(twoFrames, t('1944-06-06T18:00:00Z'));
		expect(past).not.toBe(twoFrames[1].path);
		past[0][0] = 9999;
		expect(twoFrames[1].path[0][0]).toBe(0);
	});

	it('handles a single-keyframe segment by returning that path on both sides', () => {
		const single = [kf('1944-06-06T02:30:00Z', [[1, 2]])];
		expect(interpolatePath(single, t('1944-06-06T00:00:00Z'))).toEqual([[1, 2]]);
		expect(interpolatePath(single, t('1944-06-06T18:00:00Z'))).toEqual([[1, 2]]);
	});
});

describe('chaikin', () => {
	const square: Position[] = [
		[0, 0],
		[10, 0],
		[10, 10],
		[0, 10]
	];

	it('is identity at 0 iterations', () => {
		expect(chaikin(square, 0)).toEqual(square);
	});

	it('doubles the vertex count per iteration on a closed polygon', () => {
		expect(chaikin(square, 1)).toHaveLength(8);
		expect(chaikin(square, 2)).toHaveLength(16);
		expect(chaikin(square, 3)).toHaveLength(32);
	});

	it('keeps every smoothed vertex inside the input bounding box (corner-cutting)', () => {
		const smoothed = chaikin(square, 3);
		for (const [x, y] of smoothed) {
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThanOrEqual(10);
			expect(y).toBeGreaterThanOrEqual(0);
			expect(y).toBeLessThanOrEqual(10);
		}
	});

	it('does not mutate the input array', () => {
		const input: Position[] = square.map((p) => [p[0], p[1]]);
		const snapshot = JSON.stringify(input);
		chaikin(input, 3);
		expect(JSON.stringify(input)).toBe(snapshot);
	});

	it('treats the polygon as closed (wraps last → first)', () => {
		const smoothed = chaikin(square, 1);
		const last = smoothed[smoothed.length - 1];
		expect(last[0]).toBeCloseTo(0.25 * 0 + 0.75 * 0);
		expect(last[1]).toBeCloseTo(0.25 * 10 + 0.75 * 0);
	});
});
