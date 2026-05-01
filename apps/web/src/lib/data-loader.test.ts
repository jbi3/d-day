import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { DataLoadError, loadData, unitPositionAt, type UnitTrack } from './data-loader';

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = join(here, '..', '..', '..', '..', 'data');

/**
 * Tests run in jsdom which has no `/data/...` server, so we wire a fake
 * fetch that resolves URLs against the workspace `data/` directory the
 * same way the dev server middleware does.
 */
function makeFakeFetch(): typeof fetch {
	return (async (input: RequestInfo | URL): Promise<Response> => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const path = url.replace(/^https?:\/\/[^/]+/, '');
		if (path === '/data/manifest.json') {
			const { readdirSync, existsSync } = await import('node:fs');
			const list = (sub: string) =>
				existsSync(join(dataRoot, sub))
					? readdirSync(join(dataRoot, sub))
							.filter((f) => f.endsWith('.json'))
							.sort()
							.map((f) => `${sub}/${f}`)
					: [];
			return new Response(
				JSON.stringify({
					units: list('units'),
					vessels: list('vessels'),
					events: list('events'),
					sources: 'sources/registry.json',
					frontline: 'frontline.json'
				})
			);
		}
		const rel = path.replace(/^\/data\//, '');
		const file = join(dataRoot, rel);
		try {
			return new Response(readFileSync(file, 'utf-8'));
		} catch {
			return new Response('Not found', { status: 404 });
		}
	}) as typeof fetch;
}

describe('loadData', () => {
	it('loads workspace fixtures, validates schemas, asserts source registry coverage', async () => {
		const data = await loadData(makeFakeFetch());

		expect(data.units.length).toBeGreaterThan(0);
		expect(data.events.length).toBeGreaterThan(0);
		expect(data.sources.length).toBeGreaterThan(0);
		expect(data.frontlineSegments.length).toBeGreaterThan(0);

		const known = new Set(data.sources.map((s) => s.id));
		for (const t of data.units) {
			for (const id of t.unit.sources) expect(known.has(id)).toBe(true);
			for (const w of t.movement.waypoints) {
				for (const id of w.sources) expect(known.has(id)).toBe(true);
			}
		}
		for (const e of data.events) {
			for (const id of e.sources) expect(known.has(id)).toBe(true);
		}
	});

	it('exposes id-keyed lookup maps that round-trip', async () => {
		const data = await loadData(makeFakeFetch());
		for (const t of data.units) {
			expect(data.unitById.get(t.unit.id)).toBe(t);
		}
		for (const e of data.events) {
			expect(data.eventById.get(e.id)).toBe(e);
		}
	});

	it('every event involvedUnit references a known unit (no phantom IDs)', async () => {
		const data = await loadData(makeFakeFetch());
		for (const e of data.events) {
			for (const id of e.involvedUnits ?? []) {
				expect(data.unitById.has(id), `event "${e.id}" involves unknown unit "${id}"`).toBe(true);
			}
		}
	});

	it('DataLoadError is exported and identifiable', () => {
		const err = new DataLoadError('test', 'msg');
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe('DataLoadError');
		expect(err.context).toBe('test');
		expect(err.message).toBe('[data-loader] test: msg');
	});

	it('throws DataLoadError on HTTP failure', async () => {
		const failingFetch = (async () =>
			new Response('boom', { status: 500, statusText: 'Server Error' })) as typeof fetch;
		await expect(loadData(failingFetch)).rejects.toBeInstanceOf(DataLoadError);
	});
});

describe('unitPositionAt', () => {
	const track: UnitTrack = {
		unit: {
			id: 'test',
			side: 'allied',
			country: 'US',
			echelon: 'division',
			branch: 'infantry',
			name: 'Test',
			sources: ['x']
		},
		movement: {
			unitId: 'test',
			waypoints: [
				{ time: '1944-06-06T00:00:00Z', position: [0, 0], sources: ['x'] },
				{ time: '1944-06-06T02:00:00Z', position: [10, 20], sources: ['x'] }
			]
		}
	};

	it('returns first waypoint before window start', () => {
		const p = unitPositionAt(track, '1944-06-05T22:00:00Z');
		expect(p).toEqual([0, 0]);
	});

	it('returns last waypoint after window end', () => {
		const p = unitPositionAt(track, '1944-06-06T18:00:00Z');
		expect(p).toEqual([10, 20]);
	});

	it('linearly interpolates between bracketing waypoints', () => {
		const p = unitPositionAt(track, '1944-06-06T01:00:00Z');
		expect(p![0]).toBeCloseTo(5);
		expect(p![1]).toBeCloseTo(10);
	});

	it('returns null for unparseable iso', () => {
		expect(unitPositionAt(track, 'not-a-date')).toBeNull();
	});

	it('returns null on empty waypoints', () => {
		const empty: UnitTrack = { unit: track.unit, movement: { unitId: 'test', waypoints: [] } };
		expect(unitPositionAt(empty, '1944-06-06T00:00:00Z')).toBeNull();
	});
});
