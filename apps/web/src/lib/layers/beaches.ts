import { PathLayer, TextLayer, IconLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';

import type { Position } from '@d-day/schema';

import { FLAG_BY_NATION, type FlagSpec, type Nation } from './national-flags';

type FlagLayout = 'row' | 'stacked';

interface Beach {
	name: string;
	flags: Nation[];
	seaAnchor: Position;
	hHour: string;
	strength: number;
	sources: string[];
	/** Layout for the beach's flag row. Default: 'row'. Use 'stacked' when one
	 * flag must read as visually subordinate (e.g. Sword's FR Kieffer commando
	 * under the dominant UK contribution). */
	flagLayout?: FlagLayout;
	/** Per-flag size weight (multiplied with the strength-derived base size).
	 * Index aligns with `flags`. Default: all 1.0. */
	flagWeights?: number[];
}

interface Boundary {
	id: string;
	start: Position;
	end: Position;
	sources: string[];
}

interface OmahaSubsector {
	name: string;
	labelPosition: Position;
	sources: string[];
}

// `seaAnchor` is the offshore point each beach's name + flag row are
// pinned to. Y values are tuned so the coast-to-marker offset stays
// roughly equivalent across beaches while letting the eastern beaches
// (Juno, Sword) sit a bit lower than the western ones — the Calvados
// coast trends south-east, and matching that gives the row a more
// natural "running along the shore" feel.
//
// `flags` renders as a horizontal row directly below the name,
// left-to-right in array order. Sword carries `['UK', 'FR']` for the
// 1er BFM Commando (Kieffer, 177 men) attached to No. 4 Commando —
// rendered stacked with FR sized to ~35% of UK to reflect the relative
// commitment without erasing the French presence.
//
// H-Hours and assault-force strengths from harrison-1951
// (Cross-Channel Attack, US Army Green Books, Chs. IX–XI) and us-na-aar.
const BEACHES: Beach[] = [
	{
		name: 'UTAH',
		flags: ['US'],
		seaAnchor: [-1.05, 49.55],
		hHour: '1944-06-06T06:30:00Z',
		strength: 23250,
		sources: ['harrison-1951', 'us-na-aar']
	},
	{
		name: 'OMAHA',
		flags: ['US'],
		seaAnchor: [-0.83, 49.51],
		hHour: '1944-06-06T06:30:00Z',
		strength: 34250,
		sources: ['harrison-1951', 'us-na-aar']
	},
	{
		name: 'GOLD',
		flags: ['UK'],
		seaAnchor: [-0.55, 49.46],
		hHour: '1944-06-06T07:25:00Z',
		strength: 24970,
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		name: 'JUNO',
		flags: ['CA'],
		seaAnchor: [-0.37, 49.43],
		hHour: '1944-06-06T07:35:00Z',
		strength: 21400,
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		name: 'SWORD',
		flags: ['UK', 'FR'],
		seaAnchor: [-0.22, 49.39],
		hHour: '1944-06-06T07:25:00Z',
		strength: 28845,
		sources: ['harrison-1951', 'bigot-maps'],
		flagLayout: 'stacked',
		flagWeights: [1, 0.35]
	}
];

// Sector boundaries between adjacent beaches. Each line starts on
// land (slightly inland to clearly cross the coast) and runs out to
// sea, tilted 20° clockwise from vertical (top shifts east) so the
// markers acquire a bit of dynamism and the western beach in each
// pair gets visual breathing room.
//
// Tilt is baked into the `end` coordinates — `end.x = start.x +
// (end.y - start.y) * tan(20°)` — rather than re-computed at
// render-time. Geometry is intentionally schematic; precise sector
// boundaries varied within hundreds of metres depending on which
// OVERLORD planning map you read.
const BOUNDARIES: Boundary[] = [
	{
		id: 'utah-omaha',
		start: [-1.07, 49.34],
		end: [-0.975, 49.6],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'omaha-gold',
		start: [-0.72, 49.32],
		end: [-0.633, 49.56],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'gold-juno',
		start: [-0.48, 49.31],
		end: [-0.404, 49.52],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'juno-sword',
		start: [-0.355, 49.3],
		end: [-0.29, 49.48],
		sources: ['harrison-1951', 'bigot-maps']
	}
];

// OMAHA was subdivided west-to-east into four named sectors —
// Charlie / Dog / Easy / Fox — each further split into Green/White/Red
// company lanes (omitted at this level for legibility). Labels float
// offshore (above the beach proper) so they read as zone callouts —
// the company-level intuition is "this is a slice of OMAHA", not a
// village name dropped on the dunes.
const OMAHA_SUBSECTORS: OmahaSubsector[] = [
	{ name: 'Charlie', labelPosition: [-0.945, 49.46], sources: ['harrison-1951', 'bigot-maps'] },
	{ name: 'Dog', labelPosition: [-0.905, 49.46], sources: ['harrison-1951', 'bigot-maps'] },
	{ name: 'Easy', labelPosition: [-0.865, 49.46], sources: ['harrison-1951', 'bigot-maps'] },
	{ name: 'Fox', labelPosition: [-0.825, 49.46], sources: ['harrison-1951', 'bigot-maps'] }
];

// Tilted dashed lines between OMAHA subsectors. Same 20° rightward
// tilt as the inter-beach boundaries, extended from the beach into
// the sea so they reach past the labels. The coords are tuned so the
// segment passes through the midpoint between adjacent labels AT THE
// LABEL LATITUDE (49.46) — the previous version anchored the
// midpoint at the start latitude (beach), so the tilt then drifted
// the segment ~0.036° east at label level, hiding the Charlie/Dog
// separator behind the Dog label.
const OMAHA_SUBSECTOR_BOUNDARIES: Boundary[] = [
	{
		id: 'omaha-charlie-dog',
		start: [-0.961, 49.36],
		end: [-0.913, 49.49],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'omaha-dog-easy',
		start: [-0.921, 49.36],
		end: [-0.873, 49.49],
		sources: ['harrison-1951', 'bigot-maps']
	},
	{
		id: 'omaha-easy-fox',
		start: [-0.881, 49.36],
		end: [-0.833, 49.49],
		sources: ['harrison-1951', 'bigot-maps']
	}
];

const BOUNDARY_COLOR: [number, number, number, number] = [55, 55, 60, 230];
const SUBSECTOR_BOUNDARY_COLOR: [number, number, number, number] = [55, 55, 60, 200];
const LABEL_COLOR: [number, number, number, number] = [25, 45, 70, 250];

// Names appear at the same tier as Bayeux (zoom 8); boundaries +
// flags one tier earlier (zoom 6) so the beach belt registers at
// overview scale. Subsectors at zoom 10 — early enough to see them
// as soon as you approach OMAHA, late enough to keep the broad view
// uncluttered.
const MIN_ZOOM_BOUNDARY = 6;
const MIN_ZOOM_FLAG = 6;
const MIN_ZOOM_NAME = 8;
const MIN_ZOOM_SUBSECTOR = 10;

const FLAG_BASE_PX = 28;
const FLAG_REF_STRENGTH = 25000;
const FLAG_MIN_PX = 20;
const FLAG_MAX_PX = 40;
const FLAG_MIN_PX_WEIGHTED = 10; // floor when a weight scales a flag down

// Generous gap so two flags (Sword) cannot kiss even after deck.gl's
// SDF rounding. Below ~10 px they touched in practice.
const FLAG_GAP_PX = 14;
const FLAG_STACK_GAP_PX = 6;
const NAME_TO_FLAG_GAP_PX = 14;
const NAME_FONT_PX = 16;

const DASH_COUNT = 32;
const SUBSECTOR_DASH_COUNT = 18;

const NAME_CHARS = Array.from(new Set(BEACHES.flatMap((b) => Array.from(b.name))));
const SUBSECTOR_CHARS = Array.from(
	new Set(OMAHA_SUBSECTORS.flatMap((s) => Array.from(s.name.toUpperCase())))
);

interface BoundarySegment {
	boundaryId: string;
	path: Position[];
}

interface BeachName {
	beachName: string;
	hHour: string;
	position: Position;
	pixelOffsetY: number;
}

interface BeachFlagMarker {
	beachName: string;
	position: Position;
	flag: FlagSpec;
	pixelOffsetX: number;
	pixelOffsetY: number;
	size: number;
}

function flagPxForStrength(strength: number): number {
	const s = FLAG_BASE_PX * Math.sqrt(strength / FLAG_REF_STRENGTH);
	return Math.max(FLAG_MIN_PX, Math.min(FLAG_MAX_PX, s));
}

// Splits a [start, end] line into `dashCount` short paths separated
// by gaps of equal length. PathLayer has no native dash support, so
// we emit the dashes as discrete features.
function dashedSegments(start: Position, end: Position, dashCount: number): Position[][] {
	const totalUnits = dashCount * 2 - 1;
	const dx = (end[0] - start[0]) / totalUnits;
	const dy = (end[1] - start[1]) / totalUnits;
	const segs: Position[][] = [];
	for (let i = 0; i < dashCount; i++) {
		const off = i * 2;
		segs.push([
			[start[0] + off * dx, start[1] + off * dy],
			[start[0] + (off + 1) * dx, start[1] + (off + 1) * dy]
		]);
	}
	return segs;
}

interface BuildBeachLayersOptions {
	zoom: number;
}

/**
 * Renders the five D-Day beach landing sectors as a lightweight
 * marker set drawn well offshore so the coastline reads cleanly:
 *   - the beach name (e.g. "OMAHA") horizontal, no background, dark
 *     navy text,
 *   - one or more national flags arranged in a row OR stacked
 *     (Sword: UK on top, FR Kieffer commando ~35% size below),
 *     sized by `sqrt(strength)`,
 *   - dashed boundary lines marking the sector divisions
 *     (UTAH/OMAHA, OMAHA/GOLD, GOLD/JUNO, JUNO/SWORD), starting
 *     slightly inland and running offshore at a 20° rightward
 *     tilt — gives the row a sense of motion and hands more sky
 *     to UTAH and OMAHA,
 *   - at deep zoom (≥11), the four OMAHA subsectors
 *     (Charlie / Dog / Easy / Fox) appear as labels with thin
 *     pointillé separators between them.
 *
 * Visibility is zoom-gated like `toponyms.ts`: boundaries + flags
 * from zoom 6, names from zoom 8 (Bayeux tier), subsectors from zoom 11.
 *
 * No unit/event tracks for UK / CA / FR forces — this is reference
 * geography only.
 */
export function buildBeachLayers({ zoom }: BuildBeachLayersOptions): Layer[] {
	const boundarySegs: BoundarySegment[] = [];
	for (const b of BOUNDARIES) {
		for (const path of dashedSegments(b.start, b.end, DASH_COUNT)) {
			boundarySegs.push({ boundaryId: b.id, path });
		}
	}

	const subsectorSegs: BoundarySegment[] = [];
	for (const b of OMAHA_SUBSECTOR_BOUNDARIES) {
		for (const path of dashedSegments(b.start, b.end, SUBSECTOR_DASH_COUNT)) {
			subsectorSegs.push({ boundaryId: b.id, path });
		}
	}

	const names: BeachName[] = [];
	const flagMarkers: BeachFlagMarker[] = [];

	for (const b of BEACHES) {
		const baseFlagPx = flagPxForStrength(b.strength);
		const layout = b.flagLayout ?? 'row';
		const weights = b.flagWeights ?? b.flags.map(() => 1);
		const sizes = weights.map((w) =>
			w >= 1 ? baseFlagPx : Math.max(FLAG_MIN_PX_WEIGHTED, baseFlagPx * w)
		);
		// SVG flags have 2:1 aspect (60×30); deck.gl scales to
		// `width = getSize`, so visible height ≈ size/2.
		const heights = sizes.map((s) => s / 2);

		if (layout === 'stacked') {
			// Stack centered; flags share the same X anchor.
			const totalH = heights.reduce((a, h) => a + h, 0) + FLAG_STACK_GAP_PX * (sizes.length - 1);
			let cursorY = -totalH / 2;
			for (let i = 0; i < b.flags.length; i++) {
				const h = heights[i];
				flagMarkers.push({
					beachName: b.name,
					position: b.seaAnchor,
					flag: FLAG_BY_NATION[b.flags[i]],
					pixelOffsetX: 0,
					pixelOffsetY: cursorY + h / 2,
					size: sizes[i]
				});
				cursorY += h + FLAG_STACK_GAP_PX;
			}
			names.push({
				beachName: b.name,
				hHour: b.hHour,
				position: b.seaAnchor,
				pixelOffsetY: -(totalH / 2 + NAME_TO_FLAG_GAP_PX)
			});
		} else {
			const rowWidth =
				sizes.reduce((a, s) => a + s, 0) + FLAG_GAP_PX * (sizes.length - 1);
			let cursorX = -rowWidth / 2;
			for (let i = 0; i < b.flags.length; i++) {
				const s = sizes[i];
				flagMarkers.push({
					beachName: b.name,
					position: b.seaAnchor,
					flag: FLAG_BY_NATION[b.flags[i]],
					pixelOffsetX: cursorX + s / 2,
					pixelOffsetY: 0,
					size: s
				});
				cursorX += s + FLAG_GAP_PX;
			}
			const tallestH = Math.max(...heights);
			names.push({
				beachName: b.name,
				hHour: b.hHour,
				position: b.seaAnchor,
				pixelOffsetY: -(tallestH / 2 + NAME_TO_FLAG_GAP_PX)
			});
		}
	}

	const showBoundary = zoom >= MIN_ZOOM_BOUNDARY;
	const showFlag = zoom >= MIN_ZOOM_FLAG;
	const showName = zoom >= MIN_ZOOM_NAME;
	const showSubsector = zoom >= MIN_ZOOM_SUBSECTOR;

	return [
		new PathLayer<BoundarySegment>({
			id: 'beaches-boundaries',
			data: boundarySegs,
			visible: showBoundary,
			getPath: (d) => d.path,
			getColor: BOUNDARY_COLOR,
			getWidth: 2,
			widthUnits: 'pixels',
			capRounded: false,
			pickable: false
		}),
		new IconLayer<BeachFlagMarker>({
			id: 'beaches-flags',
			data: flagMarkers,
			visible: showFlag,
			getPosition: (d) => d.position,
			getIcon: (d) => d.flag,
			getSize: (d) => d.size,
			sizeUnits: 'pixels',
			getPixelOffset: (d) => [d.pixelOffsetX, d.pixelOffsetY],
			pickable: false
		}),
		new TextLayer<BeachName>({
			id: 'beaches-labels',
			data: names,
			visible: showName,
			characterSet: NAME_CHARS,
			getPosition: (d) => d.position,
			getText: (d) => d.beachName,
			getColor: LABEL_COLOR,
			getSize: NAME_FONT_PX,
			sizeUnits: 'pixels',
			fontFamily: 'system-ui, sans-serif',
			fontWeight: 700,
			fontSettings: { sdf: false },
			getTextAnchor: 'middle',
			getAlignmentBaseline: 'bottom',
			getPixelOffset: (d) => [0, d.pixelOffsetY],
			pickable: false
		}),
		new PathLayer<BoundarySegment>({
			id: 'omaha-subsector-boundaries',
			data: subsectorSegs,
			visible: showSubsector,
			getPath: (d) => d.path,
			getColor: SUBSECTOR_BOUNDARY_COLOR,
			getWidth: 1,
			widthUnits: 'pixels',
			capRounded: false,
			pickable: false
		}),
		new TextLayer<OmahaSubsector>({
			id: 'omaha-subsector-labels',
			data: OMAHA_SUBSECTORS,
			visible: showSubsector,
			characterSet: SUBSECTOR_CHARS,
			getPosition: (d) => d.labelPosition,
			getText: (d) => d.name.toUpperCase(),
			getColor: LABEL_COLOR,
			getSize: 14,
			sizeUnits: 'pixels',
			fontFamily: 'system-ui, sans-serif',
			fontWeight: 700,
			fontSettings: { sdf: false },
			getTextAnchor: 'middle',
			getAlignmentBaseline: 'center',
			pickable: false
		})
	];
}
