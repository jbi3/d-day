export type SourceID = string;
export type UnitID = string;
export type EventID = string;

export type Side = 'allied' | 'axis';
export type Echelon = 'division' | 'regiment' | 'battalion' | 'company';
export type Branch = 'infantry' | 'airborne' | 'armor' | 'engineer' | 'artillery' | 'naval' | 'air';

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

export interface Commander {
	name: string;
	rank: string;
}

export interface CasualtyPhase {
	phase: string;
	killed?: number;
	wounded?: number;
	missing?: number;
	captured?: number;
}

export interface Casualties {
	total: number;
	byPhase?: CasualtyPhase[];
}

export interface Unit {
	id: UnitID;
	side: Side;
	country: string;
	echelon: Echelon;
	branch: Branch;
	name: string;
	shortName?: string;
	/** Approximate troop count engaged on D-Day. Used to scale icon size. */
	strength?: number;
	/** For axis units, distinguishes Wehrmacht (default) from Waffen-SS for icon styling. */
	axisAffiliation?: 'wehrmacht' | 'ss';
	commander?: Commander;
	casualties?: Casualties;
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

export type FrontlineConfidence = 'established' | 'estimated' | 'contested';

export interface FrontlineSegment {
	id: string;
	label?: string;
	closed?: boolean;
	confidence?: FrontlineConfidence;
	keyframes: FrontlineKeyframe[];
	sources: SourceID[];
}

export interface FrontlineFile {
	segments: FrontlineSegment[];
}

export type EventCategory =
	| 'airborne'
	| 'h-hour'
	| 'beach'
	| 'inland'
	| 'german-reaction'
	| 'naval'
	| 'air';

export interface MapEvent {
	id: EventID;
	title: string;
	description?: string;
	time: string; // ISO-8601
	position: Position;
	involvedUnits?: UnitID[];
	category?: EventCategory;
	sources: SourceID[];
	disputedBy?: Dispute[];
}
