export type SourceID = string;
export type UnitID = string;
export type EventID = string;

export type Side = 'allied' | 'axis';
export type Echelon = 'division' | 'regiment' | 'battalion' | 'company';
export type Branch =
	| 'infantry'
	| 'airborne'
	| 'armor'
	| 'engineer'
	| 'artillery'
	| 'naval'
	| 'air';

export type SourceKind = 'book' | 'archive' | 'map' | 'aar' | 'web' | 'report';

export interface Source {
	id: SourceID;
	title: string;
	author?: string;
	year?: number;
	kind: SourceKind;
	url?: string;
	notes?: string;
}

/**
 * One contested fact: which sources dispute it, and what they claim instead.
 * Per CLAUDE.md sourcing posture: never silently pick — record both.
 */
export interface Dispute {
	source: SourceID;
	claim: string;
}

export type Position = [number, number]; // [lon, lat]

export interface Unit {
	id: UnitID;
	side: Side;
	country: string;
	echelon: Echelon;
	branch: Branch;
	name: string;
	shortName?: string;
	sources: SourceID[];
}

export interface Waypoint {
	time: string; // ISO-8601
	position: Position;
	sources: SourceID[];
	disputedBy?: Dispute[];
	note?: string;
}

export interface Movement {
	unitId: UnitID;
	waypoints: Waypoint[];
}

export interface FrontlineKeyframe {
	time: string; // ISO-8601
	path: Position[];
}

export interface FrontlineSegment {
	id: string;
	label?: string;
	closed?: boolean;
	keyframes: FrontlineKeyframe[];
	sources: SourceID[];
}

export interface FrontlineFile {
	segments: FrontlineSegment[];
}

export interface MapEvent {
	id: EventID;
	title: string;
	description?: string;
	time: string; // ISO-8601
	position: Position;
	involvedUnits?: UnitID[];
	sources: SourceID[];
	disputedBy?: Dispute[];
}
