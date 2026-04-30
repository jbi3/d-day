import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import countries50m from 'world-atlas/countries-10m.json';

import type { Position } from '@d-day/schema';

// ISO 3166-1 numeric code for France in Natural Earth.
const FRANCE_ID = '250';

// Metropolitan France + Corsica bbox. Drops DOM-TOM (Mayotte, Reunion,
// Martinique, Guadeloupe, French Guiana, etc.) - none of which were
// German-occupied and all of which are out of MVP scope.
const EUROPE_BBOX = { minLon: -10, minLat: 35, maxLon: 15, maxLat: 55 };

function ringInsideBbox(ring: number[][]): boolean {
	for (const [x, y] of ring) {
		if (x < EUROPE_BBOX.minLon || x > EUROPE_BBOX.maxLon) return false;
		if (y < EUROPE_BBOX.minLat || y > EUROPE_BBOX.maxLat) return false;
	}
	return true;
}

function loadFranceMultiPolygon(): Position[][][] {
	const topo = countries50m as unknown as Topology;
	const fc = feature(topo, topo.objects.countries) as FeatureCollection<Polygon | MultiPolygon>;
	const france = fc.features.find((f) => String(f.id) === FRANCE_ID);
	if (!france) throw new Error('france-land: France feature not found in world-atlas');

	const geom = france.geometry;
	const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

	return polys
		.filter((poly) => ringInsideBbox(poly[0]))
		.map((poly) => poly.map((ring) => ring.map(([x, y]) => [x, y] as Position)));
}

/**
 * Metropolitan France + Corsica, sourced from Natural Earth 1:50m via
 * the world-atlas package. Used as the land mask for the occupation
 * veil; Allied territory is subtracted from this. Overseas territories
 * are filtered out (out of MVP scope; weren't German-occupied).
 */
export const FRANCE_LAND_MULTIPOLYGON: Position[][][] = loadFranceMultiPolygon();