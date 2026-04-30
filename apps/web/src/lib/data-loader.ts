import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
	unitSchema,
	movementSchema,
	eventSchema,
	sourceSchema,
	frontlineSchema,
	type Unit,
	type Movement,
	type MapEvent,
	type Source,
	type FrontlineFile,
	type FrontlineSegment
} from '@d-day/schema';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateUnit = ajv.compile(unitSchema) as ValidateFunction<Unit>;
const validateMovement = ajv.compile(movementSchema) as ValidateFunction<Movement>;
const validateEvent = ajv.compile(eventSchema) as ValidateFunction<MapEvent>;
const validateSource = ajv.compile(sourceSchema) as ValidateFunction<Source>;
const validateFrontline = ajv.compile(frontlineSchema) as ValidateFunction<FrontlineFile>;

interface UnitFile {
	unit: Unit;
	movement: Movement;
}

interface RegistryFile {
	version: number;
	sources: Source[];
}

const unitGlob = import.meta.glob<UnitFile>('../../../../data/units/*.json', {
	eager: true,
	import: 'default'
});

const eventsGlob = import.meta.glob<{ events?: MapEvent[] } | MapEvent[]>(
	'../../../../data/events/*.json',
	{ eager: true, import: 'default' }
);

const registryGlob = import.meta.glob<RegistryFile>('../../../../data/sources/registry.json', {
	eager: true,
	import: 'default'
});

const frontlineGlob = import.meta.glob<FrontlineFile>('../../../../data/frontline.json', {
	eager: true,
	import: 'default'
});

function expect<T>(value: ValidateFunction<T>, data: unknown, ctx: string): T {
	if (!value(data)) {
		throw new Error(
			`[data-loader] ${ctx} failed schema validation: ${JSON.stringify(value.errors)}`
		);
	}
	return data as T;
}

export interface UnitTrack {
	unit: Unit;
	movement: Movement;
}

export interface LoadedData {
	units: UnitTrack[];
	events: MapEvent[];
	sources: Source[];
	frontlineSegments: FrontlineSegment[];
	sourceById: Map<string, Source>;
	unitById: Map<string, UnitTrack>;
	eventById: Map<string, MapEvent>;
}

export function loadData(): LoadedData {
	const units: UnitTrack[] = [];
	for (const [path, file] of Object.entries(unitGlob)) {
		expect(validateUnit, file.unit, `${path}#/unit`);
		expect(validateMovement, file.movement, `${path}#/movement`);
		if (file.movement.unitId !== file.unit.id) {
			throw new Error(
				`[data-loader] ${path}: movement.unitId (${file.movement.unitId}) ≠ unit.id (${file.unit.id})`
			);
		}
		units.push({ unit: file.unit, movement: file.movement });
	}

	const events: MapEvent[] = [];
	for (const [path, raw] of Object.entries(eventsGlob)) {
		const arr = Array.isArray(raw) ? raw : (raw.events ?? []);
		for (let i = 0; i < arr.length; i++) {
			expect(validateEvent, arr[i], `${path}#/events/${i}`);
			events.push(arr[i]);
		}
	}

	const sources: Source[] = [];
	for (const [path, file] of Object.entries(registryGlob)) {
		for (let i = 0; i < file.sources.length; i++) {
			expect(validateSource, file.sources[i], `${path}#/sources/${i}`);
			sources.push(file.sources[i]);
		}
	}
	const sourceById = new Map(sources.map((s) => [s.id, s]));

	const knownIds = new Set(sourceById.keys());
	for (const { unit, movement } of units) {
		for (const id of unit.sources) assertKnown(id, knownIds, `unit ${unit.id}`);
		for (const w of movement.waypoints) {
			for (const id of w.sources) assertKnown(id, knownIds, `${unit.id} waypoint ${w.time}`);
			for (const d of w.disputedBy ?? [])
				assertKnown(d.source, knownIds, `${unit.id} waypoint ${w.time} disputedBy`);
		}
	}
	for (const e of events) {
		for (const id of e.sources) assertKnown(id, knownIds, `event ${e.id}`);
		for (const d of e.disputedBy ?? [])
			assertKnown(d.source, knownIds, `event ${e.id} disputedBy`);
	}

	const frontlineSegments: FrontlineSegment[] = [];
	for (const [path, file] of Object.entries(frontlineGlob)) {
		expect(validateFrontline, file, path);
		for (const seg of file.segments) {
			const v0 = seg.keyframes[0]?.path.length ?? 0;
			for (let i = 1; i < seg.keyframes.length; i++) {
				if (seg.keyframes[i].path.length !== v0) {
					throw new Error(
						`[data-loader] frontline segment ${seg.id}: keyframe ${i} has ${seg.keyframes[i].path.length} vertices, expected ${v0} (vertex count must match across keyframes for interpolation)`
					);
				}
			}
			for (const id of seg.sources) assertKnown(id, knownIds, `frontline segment ${seg.id}`);
			frontlineSegments.push(seg);
		}
	}

	const unitById = new Map(units.map((u) => [u.unit.id, u]));
	const eventById = new Map(events.map((e) => [e.id, e]));

	return { units, events, sources, frontlineSegments, sourceById, unitById, eventById };
}

function assertKnown(id: string, known: Set<string>, ctx: string): void {
	if (!known.has(id)) {
		throw new Error(`[data-loader] ${ctx}: cited source "${id}" not in registry`);
	}
}

export function unitPositionAt(track: UnitTrack, isoTime: string): [number, number] | null {
	const { waypoints } = track.movement;
	if (waypoints.length === 0) return null;
	const t = Date.parse(isoTime);
	if (Number.isNaN(t)) return null;

	const first = Date.parse(waypoints[0].time);
	if (t <= first) return waypoints[0].position;

	const last = Date.parse(waypoints[waypoints.length - 1].time);
	if (t >= last) return waypoints[waypoints.length - 1].position;

	for (let i = 0; i < waypoints.length - 1; i++) {
		const a = Date.parse(waypoints[i].time);
		const b = Date.parse(waypoints[i + 1].time);
		if (t >= a && t <= b) {
			const f = (t - a) / (b - a);
			const [ax, ay] = waypoints[i].position;
			const [bx, by] = waypoints[i + 1].position;
			return [ax + (bx - ax) * f, ay + (by - ay) * f];
		}
	}
	return null;
}
