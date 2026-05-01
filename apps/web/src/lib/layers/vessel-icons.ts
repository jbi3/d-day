import type { VesselKind } from '@d-day/schema';

const COUNTRY_COLOR: Record<string, string> = {
	US: '#3B5BA5',
	UK: '#9B2335',
	FR: '#1F4E89',
	CA: '#C8102E',
	PL: '#DC143C',
	NL: '#AE1C28',
	NO: '#BA0C2F'
};

const HULL_FILL = '#1a1f24';
const HULL_STROKE = '#f5f5f5';

function dimensions(kind: VesselKind): { length: number; height: number; superstructure: boolean } {
	switch (kind) {
		case 'battleship':
			return { length: 56, height: 12, superstructure: true };
		case 'monitor':
			return { length: 38, height: 14, superstructure: true };
		case 'heavy-cruiser':
			return { length: 46, height: 11, superstructure: true };
		case 'cruiser':
		case 'light-cruiser':
			return { length: 40, height: 10, superstructure: true };
		case 'destroyer':
			return { length: 30, height: 7, superstructure: false };
		case 'destroyer-escort':
			return { length: 26, height: 6, superstructure: false };
		case 'frigate':
			return { length: 28, height: 7, superstructure: false };
	}
}

/**
 * Stylised side-view ship silhouette as a data-URI SVG. Colour band
 * along the deck encodes nationality; size encodes displacement
 * (caller scales the IconLayer through getSize).
 */
export function buildVesselSvg(kind: VesselKind, country: string): string {
	const { length, height, superstructure } = dimensions(kind);
	const flag = COUNTRY_COLOR[country] ?? '#888';
	const W = 64;
	const H = 32;
	const cx = W / 2;
	const cy = H / 2 + 1;
	const halfL = length / 2;

	// Hull: pointed bow (right), squared stern (left).
	const bow = cx + halfL;
	const stern = cx - halfL;
	const deck = cy - height / 2;
	const keel = cy + height / 2;
	const bowTip = cx + halfL + 4;

	const hull = `M ${stern} ${deck} L ${bow} ${deck} L ${bowTip} ${cy} L ${bow} ${keel} L ${stern} ${keel} Z`;
	const flagBand = `<rect x="${stern + 1}" y="${deck + 1}" width="${length - 2}" height="2.6" fill="${flag}"/>`;

	let suprstr = '';
	if (superstructure) {
		const sw = length * 0.35;
		const sx = cx - sw / 2;
		const sh = 4;
		suprstr = `<rect x="${sx}" y="${deck - sh}" width="${sw}" height="${sh}" fill="${HULL_FILL}" stroke="${HULL_STROKE}" stroke-width="0.7"/>`;
		// Two stubby masts
		suprstr += `<line x1="${sx + sw * 0.3}" y1="${deck - sh}" x2="${sx + sw * 0.3}" y2="${deck - sh - 4}" stroke="${HULL_STROKE}" stroke-width="0.9"/>`;
		suprstr += `<line x1="${sx + sw * 0.7}" y1="${deck - sh}" x2="${sx + sw * 0.7}" y2="${deck - sh - 4}" stroke="${HULL_STROKE}" stroke-width="0.9"/>`;
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.55"/></filter><g filter="url(#s)"><path d="${hull}" fill="${HULL_FILL}" stroke="${HULL_STROKE}" stroke-width="0.9" stroke-linejoin="round"/>${flagBand}${suprstr}</g></svg>`;
}

const cache = new Map<string, string>();
export function vesselIconUri(kind: VesselKind, country: string): string {
	const key = `${kind}|${country}`;
	let v = cache.get(key);
	if (!v) {
		v = `data:image/svg+xml;utf8,${encodeURIComponent(buildVesselSvg(kind, country))}`;
		cache.set(key, v);
	}
	return v;
}
