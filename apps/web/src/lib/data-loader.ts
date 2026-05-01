import {
	unitSchema,
	movementSchema,
	eventSchema,
	sourceSchema,
	frontlineSchema,
	vesselSchema,
	vesselTrackSchema,
	type Unit,
	type Movement,
	type MapEvent,
	type Source,
	type FrontlineFile,
	type FrontlineSegment,
	type Vessel,
	type VesselTrack
} from '@d-day/schema';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateUnit = ajv.compile(unitSchema) as ValidateFunction<Unit>;
const validateMovement = ajv.compile(movementSchema) as ValidateFunction<Movement>;
const validateEvent = ajv.compile(eventSchema) as ValidateFunction<MapEvent>;
const validateSource = ajv.compile(sourceSchema) as ValidateFunction<Source>;
const validateFrontline = ajv.compile(frontlineSchema) as ValidateFunction<FrontlineFile>;
const validateVessel = ajv.compile(vesselSchema) as ValidateFunction<Vessel>;
const validateVesselTrack = ajv.compile(vesselTrackSchema) as ValidateFunction<VesselTrack>;

interface UnitFile {
	unit: Unit;
	movement: Movement;
}

interface VesselFile {
	vessel: Vessel;
	track: VesselTrack;
}

interface RegistryFile {
	version: number;
	sources: Source[];
}

interface Manifest {
	units: string[];
	vessels: string[];
	events: string[];
	sources: string;
	frontline: string;
}

export class DataLoadError extends Error {
	readonly context: string;
	constructor(context: string, message: string) {
		super(`[data-loader] ${context}: ${message}`);
		this.name = 'DataLoadError';
		this.context = context;
	}
}

function expect<T>(value: ValidateFunction<T>, data: unknown, ctx: string): T {
	if (!value(data)) {
		throw new DataLoadError(ctx, `schema validation failed: ${JSON.stringify(value.errors)}`);
	}
	return data as T;
}

export interface UnitTrack {
	unit: Unit;
	movement: Movement;
}

export interface VesselWithTrack {
	vessel: Vessel;
	track: VesselTrack;
}

export interface LoadedData {
	units: UnitTrack[];
	vessels: VesselWithTrack[];
	events: MapEvent[];
	sources: Source[];
	frontlineSegments: FrontlineSegment[];
	sourceById: Map<string, Source>;
	unitById: Map<string, UnitTrack>;
	vesselById: Map<string, VesselWithTrack>;
	eventById: Map<string, MapEvent>;
}

async function fetchJson<T>(path: string, ctx: string, fetcher: typeof fetch): Promise<T> {
	let res: Response;
	try {
		res = await fetcher(path);
	} catch (err) {
		throw new DataLoadError(ctx, `network: ${err instanceof Error ? err.message : String(err)}`);
	}
	if (!res.ok) {
		throw new DataLoadError(ctx, `HTTP ${res.status} ${res.statusText} for ${path}`);
	}
	try {
		return (await res.json()) as T;
	} catch (err) {
		throw new DataLoadError(
			ctx,
			`invalid JSON: ${err instanceof Error ? err.message : String(err)}`
		);
	}
}

/**
 * Load every dataset (units, events, sources, frontline) from the
 * runtime `/data/` endpoint, validate against the ajv-compiled schemas,
 * and assert source-id cross-references.
 *
 * The browser's HTTP cache + the server's `Cache-Control` (set in the
 * `serve-data` Vite plugin and the static host's defaults) handle
 * caching ; this function does no in-process memoisation.
 */
export async function loadData(fetcher: typeof fetch = fetch): Promise<LoadedData> {
	const manifest = await fetchJson<Manifest>('/data/manifest.json', 'manifest', fetcher);

	const [unitFiles, vesselFiles, eventFiles, registry, frontlineFile] = await Promise.all([
		Promise.all(
			manifest.units.map((p) =>
				fetchJson<UnitFile>(`/data/${p}`, p, fetcher).then((file) => ({ path: p, file }))
			)
		),
		Promise.all(
			(manifest.vessels ?? []).map((p) =>
				fetchJson<VesselFile>(`/data/${p}`, p, fetcher).then((file) => ({ path: p, file }))
			)
		),
		Promise.all(
			manifest.events.map((p) =>
				fetchJson<{ events?: MapEvent[] } | MapEvent[]>(`/data/${p}`, p, fetcher).then((raw) => ({
					path: p,
					raw
				}))
			)
		),
		fetchJson<RegistryFile>(`/data/${manifest.sources}`, manifest.sources, fetcher),
		fetchJson<FrontlineFile>(`/data/${manifest.frontline}`, manifest.frontline, fetcher)
	]);

	const units: UnitTrack[] = [];
	for (const { path, file } of unitFiles) {
		expect(validateUnit, file.unit, `${path}#/unit`);
		expect(validateMovement, file.movement, `${path}#/movement`);
		if (file.movement.unitId !== file.unit.id) {
			throw new DataLoadError(
				path,
				`movement.unitId (${file.movement.unitId}) ≠ unit.id (${file.unit.id})`
			);
		}
		units.push({ unit: file.unit, movement: file.movement });
	}

	const vessels: VesselWithTrack[] = [];
	for (const { path, file } of vesselFiles) {
		expect(validateVessel, file.vessel, `${path}#/vessel`);
		expect(validateVesselTrack, file.track, `${path}#/track`);
		if (file.track.vesselId !== file.vessel.id) {
			throw new DataLoadError(
				path,
				`track.vesselId (${file.track.vesselId}) ≠ vessel.id (${file.vessel.id})`
			);
		}
		vessels.push({ vessel: file.vessel, track: file.track });
	}

	const events: MapEvent[] = [];
	for (const { path, raw } of eventFiles) {
		const arr = Array.isArray(raw) ? raw : (raw.events ?? []);
		for (let i = 0; i < arr.length; i++) {
			expect(validateEvent, arr[i], `${path}#/events/${i}`);
			events.push(arr[i]);
		}
	}

	const sources: Source[] = [];
	for (let i = 0; i < registry.sources.length; i++) {
		expect(validateSource, registry.sources[i], `${manifest.sources}#/sources/${i}`);
		sources.push(registry.sources[i]);
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
	for (const { vessel, track } of vessels) {
		for (const id of vessel.sources) assertKnown(id, knownIds, `vessel ${vessel.id}`);
		for (const w of track.waypoints) {
			for (const id of w.sources) assertKnown(id, knownIds, `${vessel.id} waypoint ${w.time}`);
			for (const d of w.disputedBy ?? [])
				assertKnown(d.source, knownIds, `${vessel.id} waypoint ${w.time} disputedBy`);
		}
	}
	for (const e of events) {
		for (const id of e.sources) assertKnown(id, knownIds, `event ${e.id}`);
		for (const d of e.disputedBy ?? []) assertKnown(d.source, knownIds, `event ${e.id} disputedBy`);
	}

	expect(validateFrontline, frontlineFile, manifest.frontline);
	const frontlineSegments: FrontlineSegment[] = [];
	for (const seg of frontlineFile.segments) {
		const v0 = seg.keyframes[0]?.path.length ?? 0;
		for (let i = 1; i < seg.keyframes.length; i++) {
			if (seg.keyframes[i].path.length !== v0) {
				throw new DataLoadError(
					`frontline segment ${seg.id}`,
					`keyframe ${i} has ${seg.keyframes[i].path.length} vertices, expected ${v0} (vertex count must match across keyframes for interpolation)`
				);
			}
		}
		for (const id of seg.sources) assertKnown(id, knownIds, `frontline segment ${seg.id}`);
		frontlineSegments.push(seg);
	}

	const unitById = new Map(units.map((u) => [u.unit.id, u]));
	const vesselById = new Map(vessels.map((v) => [v.vessel.id, v]));
	const eventById = new Map(events.map((e) => [e.id, e]));

	return {
		units,
		vessels,
		events,
		sources,
		frontlineSegments,
		sourceById,
		unitById,
		vesselById,
		eventById
	};
}

function assertKnown(id: string, known: Set<string>, ctx: string): void {
	if (!known.has(id)) {
		throw new DataLoadError(ctx, `cited source "${id}" not in registry`);
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
