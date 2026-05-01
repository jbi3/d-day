import { describe, expect, it } from 'vitest';

import { DataLoadError, loadData, unitPositionAt, type UnitTrack } from './data-loader';

describe('loadData', () => {
	it('loads bundled fixtures, validates schemas, asserts source registry coverage', () => {
		const data = loadData();

		// Sanity: at least one of each entity type loaded.
		expect(data.units.length).toBeGreaterThan(0);
		expect(data.events.length).toBeGreaterThan(0);
		expect(data.sources.length).toBeGreaterThan(0);
		expect(data.frontlineSegments.length).toBeGreaterThan(0);

		// Cross-references: every unit, event and waypoint source ID is in
		// the registry. (loadData throws if not — this is a smoke test.)
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

	it('exposes id-keyed lookup maps that round-trip', () => {
		const data = loadData();
		for (const t of data.units) {
			expect(data.unitById.get(t.unit.id)).toBe(t);
		}
		for (const e of data.events) {
			expect(data.eventById.get(e.id)).toBe(e);
		}
	});

	it('every event involvedUnit references a known unit (no phantom IDs)', () => {
		const data = loadData();
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
