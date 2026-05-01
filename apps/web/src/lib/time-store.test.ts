import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { flushSync } from 'svelte';

import { TimeStore } from './time-store.svelte';

describe('TimeStore', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('initializes simHours to start', () => {
		const t = new TimeStore(2, 20);
		expect(t.simHours).toBe(2);
		expect(t.playing).toBe(false);
	});

	it('seek clamps to [start, end]', () => {
		const t = new TimeStore(0, 20);
		t.seek(10);
		expect(t.simHours).toBe(10);
		t.seek(-5);
		expect(t.simHours).toBe(0);
		t.seek(99);
		expect(t.simHours).toBe(20);
	});

	it('reset jumps to start and pauses', () => {
		const t = new TimeStore(0, 20);
		t.seek(15);
		t.reset();
		expect(t.simHours).toBe(0);
		expect(t.playing).toBe(false);
	});

	it('toggle flips playing state', () => {
		const t = new TimeStore(0, 20);
		expect(t.playing).toBe(false);
		t.toggle();
		expect(t.playing).toBe(true);
		t.toggle();
		expect(t.playing).toBe(false);
	});

	it('t is normalized 0..1 over [start, end]', () => {
		const t = new TimeStore(2, 22);
		expect(t.t).toBe(0);
		t.seek(12);
		expect(t.t).toBe(0.5);
		t.seek(22);
		expect(t.t).toBe(1);
	});

	it('t returns 0 when start === end (degenerate span)', () => {
		const t = new TimeStore(5, 5);
		expect(t.t).toBe(0);
	});

	it('play advances simHours via RAF and auto-pauses at end', () => {
		// jsdom rAF runs immediately; we drive timing via a manual stub.
		let now = 1000;
		const rafCbs: FrameRequestCallback[] = [];
		const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
			rafCbs.push(cb);
			return rafCbs.length;
		});
		const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
		const perfSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);

		const t = new TimeStore(0, 1, 1); // 1 sim-hour per real second
		t.play();
		expect(t.playing).toBe(true);
		expect(rafCbs.length).toBe(1);

		// 0.5 s elapsed → simHours += 0.5 * playRate = 0.5
		now = 1500;
		const cb1 = rafCbs.shift()!;
		cb1(now);
		flushSync();
		expect(t.simHours).toBeCloseTo(0.5);
		expect(t.playing).toBe(true);

		// 0.6 s more → would be 1.1 but clamped to end=1 ; auto-pause
		now = 2100;
		const cb2 = rafCbs.shift()!;
		cb2(now);
		flushSync();
		expect(t.simHours).toBe(1);
		expect(t.playing).toBe(false);

		rafSpy.mockRestore();
		cancelSpy.mockRestore();
		perfSpy.mockRestore();
	});
});
