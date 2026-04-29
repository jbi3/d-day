import type { Branch, Side } from '@d-day/schema';

/**
 * NATO-flavored unit symbology generated as SVG data URIs.
 *
 * - Allied = blue rectangle (NATO friendly frame).
 * - Axis = red diamond (NATO hostile frame).
 * - Branch glyph inside the frame: X (infantry), parachute arc (airborne).
 * - Echelon mark above the frame: "XX" for division.
 * - National badge above the frame: simplified US 1944-era flag for US,
 *   Balkenkreuz (Wehrmacht military identifier) for DE.
 *
 * The Balkenkreuz is the historically authentic Wehrmacht-on-equipment
 * marker; the swastika flag is intentionally avoided.
 */

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

function svgUri(svg: string): string {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function flagBadge(country: string, cx: number, cy: number, w: number, h: number): string {
	const x = cx - w / 2;
	const y = cy - h / 2;
	if (country === 'US') {
		const stripeH = h / 7;
		const stripes: string[] = [];
		for (let i = 0; i < 7; i++) {
			const fill = i % 2 === 0 ? '#bf2a3a' : '#ffffff';
			stripes.push(
				`<rect x="${x}" y="${y + i * stripeH}" width="${w}" height="${stripeH}" fill="${fill}"/>`
			);
		}
		const cantonW = w * 0.42;
		const cantonH = h * (4 / 7);
		return `
			${stripes.join('')}
			<rect x="${x}" y="${y}" width="${cantonW}" height="${cantonH}" fill="#22417a"/>
			<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#000" stroke-width="0.8"/>
		`;
	}
	// DE — Balkenkreuz on a field. Black cross, white edges, on a black plate.
	const cw = w * 0.78;
	const ch = h * 0.78;
	const cx0 = cx - cw / 2;
	const cy0 = cy - ch / 2;
	const armT = ch * 0.30;
	const armW = cw * 0.30;
	const innerArmT = ch * 0.18;
	const innerArmW = cw * 0.18;
	return `
		<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1a1a1a" stroke="#000" stroke-width="0.8"/>
		<rect x="${cx0}" y="${cy - armT / 2}" width="${cw}" height="${armT}" fill="#ffffff"/>
		<rect x="${cx - armW / 2}" y="${cy0}" width="${armW}" height="${ch}" fill="#ffffff"/>
		<rect x="${cx0 + (cw - cw * 0.92) / 2}" y="${cy - innerArmT / 2}" width="${cw * 0.92}" height="${innerArmT}" fill="#1a1a1a"/>
		<rect x="${cx - innerArmW / 2}" y="${cy0 + (ch - ch * 0.92) / 2}" width="${innerArmW}" height="${ch * 0.92}" fill="#1a1a1a"/>
	`;
}

function frameAndGlyph(side: Side, branch: Branch): string {
	// Frame box centered horizontally, lower half of the icon.
	const fw = 72;
	const fh = 44;
	const fx = (VB_W - fw) / 2;
	const fy = 60;
	const cx = fx + fw / 2;
	const cy = fy + fh / 2;

	const fill = side === 'allied' ? 'rgba(70,140,220,0.95)' : 'rgba(210,80,80,0.95)';
	const stroke = side === 'allied' ? '#0a3d7a' : '#5a1010';

	let frame: string;
	if (side === 'allied') {
		frame = `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
	} else {
		// Diamond inscribed in the same bbox.
		frame = `<polygon points="${cx},${fy} ${fx + fw},${cy} ${cx},${fy + fh} ${fx},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
	}

	// Inner safe area for the glyph (avoid the diamond's pointed ends).
	const innerFw = side === 'allied' ? fw - 14 : fw - 28;
	const innerFh = side === 'allied' ? fh - 14 : fh - 18;
	const ix = cx - innerFw / 2;
	const iy = cy - innerFh / 2;
	const glyphColor = '#f5f5f5';

	let glyph: string;
	if (branch === 'infantry') {
		glyph = `
			<line x1="${ix}" y1="${iy}" x2="${ix + innerFw}" y2="${iy + innerFh}" stroke="${glyphColor}" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="${ix + innerFw}" y1="${iy}" x2="${ix}" y2="${iy + innerFh}" stroke="${glyphColor}" stroke-width="2.5" stroke-linecap="round"/>
		`;
	} else if (branch === 'airborne') {
		// Stylized parachute: dome arc with two suspension lines.
		const archY = iy + innerFh * 0.3;
		const archEndY = cy + innerFh * 0.05;
		const lineEndY = iy + innerFh - 2;
		glyph = `
			<path d="M ${ix} ${archEndY} Q ${cx} ${archY - innerFh * 0.45} ${ix + innerFw} ${archEndY}" stroke="${glyphColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
			<line x1="${ix + 2}" y1="${archEndY}" x2="${cx - innerFw * 0.12}" y2="${lineEndY}" stroke="${glyphColor}" stroke-width="2" stroke-linecap="round"/>
			<line x1="${ix + innerFw - 2}" y1="${archEndY}" x2="${cx + innerFw * 0.12}" y2="${lineEndY}" stroke="${glyphColor}" stroke-width="2" stroke-linecap="round"/>
		`;
	} else {
		glyph = '';
	}

	return frame + glyph;
}

export function buildSvg(side: Side, branch: Branch, country: string): string {
	const echelonY = 50;
	const echelon = `<text x="${VB_W / 2}" y="${echelonY}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#ffffff" stroke="#000" stroke-width="1" paint-order="stroke">XX</text>`;

	const badgeW = 26;
	const badgeH = 18;
	const badgeCx = VB_W / 2;
	const badgeCy = 22;
	const badge = flagBadge(country, badgeCx, badgeCy, badgeW, badgeH);

	const body = frameAndGlyph(side, branch);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="${VB_W}" height="${VB_H}">${badge}${echelon}${body}</svg>`;
}

function spec(side: Side, branch: Branch, country: string): UnitIconSpec {
	return {
		url: svgUri(buildSvg(side, branch, country)),
		width: VB_W,
		height: VB_H,
		anchorX: VB_W / 2,
		anchorY: VB_H / 2,
		id: iconKey(side, branch, country)
	};
}

export function iconKey(side: Side, branch: Branch, country: string): string {
	return `${side}-${branch}-${country}`;
}

const cache = new Map<string, UnitIconSpec>();

export function unitIcon(side: Side, branch: Branch, country: string): UnitIconSpec {
	const key = iconKey(side, branch, country);
	let s = cache.get(key);
	if (!s) {
		s = spec(side, branch, country);
		cache.set(key, s);
	}
	return s;
}
