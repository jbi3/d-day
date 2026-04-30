import type { Branch, Side } from '@d-day/schema';

/**
 * NATO-flavored unit symbology generated as SVG data URIs.
 *
 * Anatomy (post batch 4):
 * - Frame is a square (allied) or the same square rotated 45° (axis
 *   diamond), 56×56 in viewBox units. Square corners (rx=0).
 * - Border is thick (12 px in viewBox units) — white for allied,
 *   near-black for axis — so the icon edge dominates against any
 *   basemap colour underneath.
 * - "XX" division-echelon mark sits above the frame.
 * - Allied fill = stylised national flag clipped to the square.
 *   Stylised because the icon renders down to ~28 px on screen and
 *   the historical 7-stripes flag turns into mush at that scale.
 * - Axis fill = solid colour (no flag): Wehrmacht red, SS feldgrau.
 * - Branch glyph = X cross at moderate opacity, drawn over the fill
 *   as a NATO watermark. Both infantry and airborne render with the
 *   same X (parachute icon was too busy at this scale).
 * - Division number rendered last, centered in the frame (white fill,
 *   black halo via paint-order).
 * - Whole symbol wrapped in a single drop shadow filter so it lifts
 *   off the basemap.
 *
 * Sourcing posture: brief.md #3 historical-accuracy criterion is
 * preserved by keeping the SS feldgrau distinction; Wehrmacht red
 * recalls the NATO hostile-frame red without referencing a specific
 * flag. The 5-stripe US flag is a deliberate readability compromise.
 */

export type AxisAffiliation = 'wehrmacht' | 'ss';

export interface UnitIconSpec {
	url: string;
	width: number;
	height: number;
	anchorX: number;
	anchorY: number;
	id: string;
}

const VB_W = 128;
const VB_H = 128;

// Square frame, shifted down so the "XX" echelon mark fits above it.
// Diamond bbox (axis, rotated 45°) ≈ 79×79 — fits in 128 with margin
// for stroke + drop shadow.
const FW = 56;
const FH = 56;
const FX = (VB_W - FW) / 2; // 36
const FY = 42;
const CX = FX + FW / 2; // 64
const CY = FY + FH / 2; // 70

const STROKE_W = 7;
const ALLIED_STROKE = '#ffffff';
const AXIS_STROKE = '#1a1a1a';

const WEHRMACHT_FILL = '#bf2a3a';
// SS background — feldgrau, same palette as the occupation veil
// (frontline.ts FELDGRAU = [60, 70, 55]).
const SS_FILL = '#3c4637';

const GLYPH_COLOR = '#f5f5f5';
const GLYPH_OPACITY = 0.6;
const GLYPH_STROKE_W = 4.5;

// XX echelon mark — Allied sits just above the square (10 px gap),
// Axis sits a bit higher because the diamond's top corner reaches
// further up than the square's top edge, otherwise the text touches
// the corner.
const ECHELON_Y_ALLIED = 22;
const ECHELON_Y_AXIS = 14;
const ECHELON_FONT = 12;

function svgUri(svg: string): string {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Stylised US flag for icon-scale rendering. Uses 7 stripes (4 red
// + 3 white) for the historical band count, but with the canton sized
// so the bands below it are large and distinct. The trick: stripes
// span only the width to the right of the canton in the upper portion
// (so each visible band stays thick), and span the full width in the
// lower portion. This way every band stays readable at icon scale
// rather than being crushed by the canton overlay.
function usFlagFill(x: number, y: number, w: number, h: number): string {
	const stripeH = h / 7;
	const cantonW = w * 0.45;
	const cantonH = stripeH * 4; // canton spans the top 4 stripes
	const stripes: string[] = [];
	for (let i = 0; i < 7; i++) {
		const fill = i % 2 === 0 ? '#c8102e' : '#ffffff';
		// Above canton bottom: stripe lives only to the right of canton.
		// Below: full width.
		const sx = i < 4 ? x + cantonW : x;
		const sw = i < 4 ? w - cantonW : w;
		stripes.push(
			`<rect x="${sx}" y="${y + i * stripeH}" width="${sw}" height="${stripeH}" fill="${fill}"/>`
		);
	}
	const canton = `<rect x="${x}" y="${y}" width="${cantonW}" height="${cantonH}" fill="#22417a"/>`;
	// 3×2 grid of dots inside canton, suggesting the star field —
	// readable down to ~28 px on screen.
	const dotR = Math.min(cantonW, cantonH) * 0.07;
	const cols = 3;
	const rows = 2;
	const padX = cantonW * 0.18;
	const padY = cantonH * 0.22;
	const stepX = (cantonW - 2 * padX) / (cols - 1);
	const stepY = (cantonH - 2 * padY) / (rows - 1);
	const dots: string[] = [];
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			dots.push(
				`<circle cx="${x + padX + c * stepX}" cy="${y + padY + r * stepY}" r="${dotR}" fill="#ffffff"/>`
			);
		}
	}
	return `${stripes.join('')}${canton}${dots.join('')}`;
}

// Solid colour fill spanning the entire viewBox — clipping handles the
// silhouette. Critical for the rotated-rect (diamond) clip path: a
// fill rect matching the un-rotated frame would leave the diamond's
// N/S/E/W corners empty (the bug seen in batch 3).
function solidFillFull(color: string): string {
	return `<rect x="0" y="0" width="${VB_W}" height="${VB_H}" fill="${color}"/>`;
}

function fillFor(side: Side, country: string, axisAffiliation: AxisAffiliation): string {
	if (side === 'allied') {
		// MVP: only US allied units. Other allied nationalities (UK, CA, FR)
		// would slot in here via national-flags.ts when needed.
		if (country === 'US') return usFlagFill(FX, FY, FW, FH);
		// Fallback: solid blue panel until per-country flags are wired.
		return solidFillFull('#22417a');
	}
	// axis — solid colour, no flag.
	if (axisAffiliation === 'ss') return solidFillFull(SS_FILL);
	return solidFillFull(WEHRMACHT_FILL);
}

// Returns SVG fragments: clipPath defining the frame shape, and the
// outer outline stroking the same shape.
function frameShape(side: Side): { defs: string; outline: string } {
	if (side === 'allied') {
		const rect = `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}"/>`;
		return {
			defs: `<clipPath id="frameClip">${rect}</clipPath>`,
			outline: `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="none" stroke="${ALLIED_STROKE}" stroke-width="${STROKE_W}"/>`
		};
	}
	const transform = `transform="rotate(45 ${CX} ${CY})"`;
	return {
		defs: `<clipPath id="frameClip"><rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" ${transform}/></clipPath>`,
		outline: `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="none" stroke="${AXIS_STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="miter" ${transform}/>`
	};
}

// Branch watermark — both infantry and airborne render the same X
// cross. The previous parachute glyph was too busy at this scale and
// the user asked to simplify.
function branchGlyph(side: Side, _branch: Branch): string {
	const innerFw = side === 'allied' ? FW - 18 : FW - 28;
	const innerFh = side === 'allied' ? FH - 18 : FH - 28;
	const ix = CX - innerFw / 2;
	const iy = CY - innerFh / 2;
	return `
		<g opacity="${GLYPH_OPACITY}">
			<line x1="${ix}" y1="${iy}" x2="${ix + innerFw}" y2="${iy + innerFh}" stroke="${GLYPH_COLOR}" stroke-width="${GLYPH_STROKE_W}" stroke-linecap="round"/>
			<line x1="${ix + innerFw}" y1="${iy}" x2="${ix}" y2="${iy + innerFh}" stroke="${GLYPH_COLOR}" stroke-width="${GLYPH_STROKE_W}" stroke-linecap="round"/>
		</g>
	`;
}

// Number font scales down for longer strings (e.g. "91/709"). Sized
// to fit comfortably inside a 56×56 frame.
function numberFontSize(displayNumber: string): number {
	const len = displayNumber.length;
	if (len <= 3) return 22;
	if (len <= 5) return 16;
	return 11;
}

function numberText(displayNumber: string): string {
	const fs = numberFontSize(displayNumber);
	return `<text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-size="${fs}" font-weight="800" fill="#ffffff" stroke="#000000" stroke-width="2" paint-order="stroke" style="paint-order:stroke">${displayNumber}</text>`;
}

function echelonText(side: Side): string {
	const y = side === 'allied' ? ECHELON_Y_ALLIED : ECHELON_Y_AXIS;
	// Allied: white fill / black halo — matches the white border.
	// Axis: dark fill / white halo — matches the near-black border.
	const fill = side === 'allied' ? '#ffffff' : AXIS_STROKE;
	const stroke = side === 'allied' ? '#000000' : '#ffffff';
	return `<text x="${CX}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="${ECHELON_FONT}" font-weight="800" fill="${fill}" stroke="${stroke}" stroke-width="1" paint-order="stroke" style="paint-order:stroke">XX</text>`;
}

function shadowFilter(): string {
	// Larger offset, larger blur, higher opacity → reads as a more
	// detached / floating icon over the basemap.
	return `<filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.7"/></filter>`;
}

export function buildSvg(
	side: Side,
	branch: Branch,
	country: string,
	displayNumber: string,
	axisAffiliation: AxisAffiliation = 'wehrmacht'
): string {
	const shape = frameShape(side);
	const fill = fillFor(side, country, axisAffiliation);
	const glyph = branchGlyph(side, branch);
	const num = numberText(displayNumber);
	const echelon = echelonText(side);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="${VB_W}" height="${VB_H}"><defs>${shape.defs}${shadowFilter()}</defs><g filter="url(#shadow)"><g clip-path="url(#frameClip)">${fill}${glyph}</g>${shape.outline}${echelon}${num}</g></svg>`;
}

function spec(
	side: Side,
	branch: Branch,
	country: string,
	displayNumber: string,
	axisAffiliation: AxisAffiliation
): UnitIconSpec {
	const id = iconKey(side, branch, country, displayNumber, axisAffiliation);
	return {
		url: svgUri(buildSvg(side, branch, country, displayNumber, axisAffiliation)),
		width: VB_W,
		height: VB_H,
		anchorX: VB_W / 2,
		anchorY: VB_H / 2,
		id
	};
}

export function iconKey(
	side: Side,
	branch: Branch,
	country: string,
	displayNumber: string,
	axisAffiliation: AxisAffiliation
): string {
	return `${side}-${branch}-${country}-${axisAffiliation}-${displayNumber}`;
}

const cache = new Map<string, UnitIconSpec>();

export function unitIcon(
	side: Side,
	branch: Branch,
	country: string,
	displayNumber: string,
	axisAffiliation: AxisAffiliation = 'wehrmacht'
): UnitIconSpec {
	const key = iconKey(side, branch, country, displayNumber, axisAffiliation);
	let s = cache.get(key);
	if (!s) {
		s = spec(side, branch, country, displayNumber, axisAffiliation);
		cache.set(key, s);
	}
	return s;
}
