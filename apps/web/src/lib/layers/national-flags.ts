/**
 * National flags as standalone SVG data URIs, sized for use by
 * deck.gl IconLayer.
 *
 * Designs are simplified vexillological representations — recognisable
 * at small icon sizes, not pixel-accurate heraldry.
 *
 * - US — 48-star flag, 7 red + 6 white stripes, blue canton with
 *   stars in 6×8 grid (1912–1959 design, in service on D-Day).
 * - UK — Union Jack (1801 design, unchanged in 1944).
 * - CA — Canadian Red Ensign (1921–1957 design with Royal Coat of
 *   Arms shield on the fly), period-correct for D-Day. The shield is
 *   rendered as a simplified gold stylisation; the precise heraldry
 *   is not legible at icon size and would not survive rasterisation.
 *   A modern maple-leaf asset (`CA_MAPLE_LEAF`) is also exported
 *   should a "modern recognisability" mode ever be wanted.
 * - FR — Free French (Forces Françaises Libres) flag: tricolore
 *   with red Croix de Lorraine centred on the white band. Used by
 *   the Kieffer commando (1er BFM Commando, 177 men attached to
 *   No. 4 Commando) on Sword Beach, 6 June 1944 — the only French
 *   ground unit to land on the beaches.
 */

export interface FlagSpec {
	url: string;
	width: number;
	height: number;
	anchorX: number;
	anchorY: number;
	id: string;
}

function svgUri(svg: string): string {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildUS1944(): string {
	const W = 50;
	const H = 26;
	const stripeH = H / 13;
	const stripes: string[] = [];
	for (let i = 0; i < 7; i++) {
		stripes.push(
			`<rect x="0" y="${i * 2 * stripeH}" width="${W}" height="${stripeH}" fill="#bf2a3a"/>`
		);
	}
	const cantonW = W * 0.4;
	const cantonH = stripeH * 7;
	const stars: string[] = [];
	const cols = 8;
	const rows = 6;
	const sx = 1.2;
	const sy = 0.8;
	const stepX = (cantonW - sx * 2) / (cols - 1);
	const stepY = (cantonH - sy * 2) / (rows - 1);
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const cx = sx + c * stepX;
			const cy = sy + r * stepY;
			stars.push(`<circle cx="${cx}" cy="${cy}" r="0.45" fill="#ffffff"/>`);
		}
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
		<rect width="${W}" height="${H}" fill="#ffffff"/>
		${stripes.join('')}
		<rect x="0" y="0" width="${cantonW}" height="${cantonH}" fill="#22417a"/>
		${stars.join('')}
		<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#000" stroke-width="0.5"/>
	</svg>`;
}

function buildUK(): string {
	const W = 60;
	const H = 30;
	const blue = '#012169';
	const red = '#C8102E';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
		<rect width="${W}" height="${H}" fill="${blue}"/>
		<line x1="0" y1="0" x2="${W}" y2="${H}" stroke="#ffffff" stroke-width="6"/>
		<line x1="${W}" y1="0" x2="0" y2="${H}" stroke="#ffffff" stroke-width="6"/>
		<line x1="0" y1="0" x2="${W}" y2="${H}" stroke="${red}" stroke-width="2"/>
		<line x1="${W}" y1="0" x2="0" y2="${H}" stroke="${red}" stroke-width="2"/>
		<rect x="25" y="0" width="10" height="${H}" fill="#ffffff"/>
		<rect x="0" y="10" width="${W}" height="10" fill="#ffffff"/>
		<rect x="27" y="0" width="6" height="${H}" fill="${red}"/>
		<rect x="0" y="12" width="${W}" height="6" fill="${red}"/>
		<rect width="${W}" height="${H}" fill="none" stroke="#000" stroke-width="0.5"/>
	</svg>`;
}

function buildCARedEnsign1944(): string {
	const W = 60;
	const H = 30;
	const blue = '#012169';
	const red = '#C8102E';
	const cantonW = 30;
	const cantonH = 15;
	const shieldX = 42;
	const shieldY = 6;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
		<rect width="${W}" height="${H}" fill="${red}"/>
		<rect x="0" y="0" width="${cantonW}" height="${cantonH}" fill="${blue}"/>
		<line x1="0" y1="0" x2="${cantonW}" y2="${cantonH}" stroke="#ffffff" stroke-width="3"/>
		<line x1="${cantonW}" y1="0" x2="0" y2="${cantonH}" stroke="#ffffff" stroke-width="3"/>
		<line x1="0" y1="0" x2="${cantonW}" y2="${cantonH}" stroke="${red}" stroke-width="1"/>
		<line x1="${cantonW}" y1="0" x2="0" y2="${cantonH}" stroke="${red}" stroke-width="1"/>
		<rect x="13" y="0" width="4" height="${cantonH}" fill="#ffffff"/>
		<rect x="0" y="5.5" width="${cantonW}" height="4" fill="#ffffff"/>
		<rect x="14" y="0" width="2" height="${cantonH}" fill="${red}"/>
		<rect x="0" y="6.5" width="${cantonW}" height="2" fill="${red}"/>
		<g transform="translate(${shieldX}, ${shieldY})">
			<path d="M 0 0 L 12 0 L 12 7 Q 12 12 6 15 Q 0 12 0 7 Z" fill="#ffd24d" stroke="#5a3010" stroke-width="0.5"/>
			<circle cx="3" cy="9" r="1" fill="${red}"/>
			<circle cx="6" cy="11.5" r="1" fill="${red}"/>
			<circle cx="9" cy="9" r="1" fill="${red}"/>
		</g>
		<rect width="${W}" height="${H}" fill="none" stroke="#000" stroke-width="0.5"/>
	</svg>`;
}

function buildCAMapleLeaf(): string {
	const W = 60;
	const H = 30;
	const red = '#bf2a3a';
	// White square centred (15→45). Maple leaf inscribed inside, ~18 px tall.
	// Path approximates the 11-point Canadian maple leaf silhouette;
	// stem at the bottom centre, three top lobes, four side lobes per
	// side with notches between. Coordinates hand-tuned for legibility
	// at icon size — not vexillologically exact.
	const leaf = `
		<path d="M30,6 L31.4,10.5 L34.5,9 L33.6,12.5 L37.5,12.2 L36,14.5 L40,15.6 L36,16.8 L37.5,18.4 L33.6,18.2 L34.5,21.5 L31.4,20 L30,24.5 L28.6,20 L25.5,21.5 L26.4,18.2 L22.5,18.4 L24,16.8 L20,15.6 L24,14.5 L22.5,12.2 L26.4,12.5 L25.5,9 L28.6,10.5 Z"
			fill="${red}"/>
	`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
		<rect x="0" y="0" width="15" height="${H}" fill="${red}"/>
		<rect x="15" y="0" width="30" height="${H}" fill="#ffffff"/>
		<rect x="45" y="0" width="15" height="${H}" fill="${red}"/>
		${leaf}
		<rect width="${W}" height="${H}" fill="none" stroke="#000" stroke-width="0.5"/>
	</svg>`;
}

function buildFRFreeFrance1944(): string {
	const W = 60;
	const H = 30;
	const blue = '#22417a';
	const red = '#bf2a3a';
	// Tricolore: vertical bands. Croix de Lorraine on the centre white
	// band — vertical bar with two horizontal crossbars (lower bar
	// longer than upper, traditional FFL design).
	const cx = 30;
	const barX = cx - 0.9;
	const barW = 1.8;
	const barTop = 7;
	const barBot = 23;
	const upperY = 11.5;
	const upperW = 6;
	const lowerY = 18;
	const lowerW = 9;
	const upperX = cx - upperW / 2;
	const lowerX = cx - lowerW / 2;
	const crossH = 1.6;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
		<rect x="0" y="0" width="20" height="${H}" fill="${blue}"/>
		<rect x="20" y="0" width="20" height="${H}" fill="#ffffff"/>
		<rect x="40" y="0" width="20" height="${H}" fill="${red}"/>
		<rect x="${barX}" y="${barTop}" width="${barW}" height="${barBot - barTop}" fill="${red}"/>
		<rect x="${upperX}" y="${upperY}" width="${upperW}" height="${crossH}" fill="${red}"/>
		<rect x="${lowerX}" y="${lowerY}" width="${lowerW}" height="${crossH}" fill="${red}"/>
		<rect width="${W}" height="${H}" fill="none" stroke="#000" stroke-width="0.5"/>
	</svg>`;
}

function spec(id: string, svg: string, w: number, h: number): FlagSpec {
	return {
		id,
		url: svgUri(svg),
		width: w,
		height: h,
		anchorX: w / 2,
		anchorY: h / 2
	};
}

export const US_1944: FlagSpec = spec('flag-us-1944', buildUS1944(), 50, 26);
export const UK: FlagSpec = spec('flag-uk', buildUK(), 60, 30);
export const CA_RED_ENSIGN_1944: FlagSpec = spec('flag-ca-red-ensign-1944', buildCARedEnsign1944(), 60, 30);
export const CA_MAPLE_LEAF: FlagSpec = spec('flag-ca-maple-leaf', buildCAMapleLeaf(), 60, 30);
export const FR_FREE_FRANCE_1944: FlagSpec = spec(
	'flag-fr-free-france-1944',
	buildFRFreeFrance1944(),
	60,
	30
);

export type Nation = 'US' | 'UK' | 'CA' | 'FR';

export const FLAG_BY_NATION: Record<Nation, FlagSpec> = {
	US: US_1944,
	UK,
	CA: CA_RED_ENSIGN_1944,
	FR: FR_FREE_FRANCE_1944
};
