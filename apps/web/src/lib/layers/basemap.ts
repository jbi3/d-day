import type { Position } from '@d-day/schema';
import type { Layer } from '@deck.gl/core';
import { PolygonLayer } from '@deck.gl/layers';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import countries from 'world-atlas/countries-10m.json';

// Visible bbox: wide enough to include S England, Channel Islands,
// N France, Belgium, Netherlands, NW Germany. Drives both the land
// clip and the sea background extent.
const BBOX = { minLon: -8, minLat: 47, maxLon: 6, maxLat: 52 };

const LAND_FILL: [number, number, number] = [235, 230, 211];
const LAND_STROKE: [number, number, number] = [180, 170, 145];

interface LandPoly {
	id: string;
	contour: Position[][];
}

// Stricter than a ring-bbox-vs-window check: countries whose polygons
// cross the antimeridian (Russia, USA, Fiji, Kiribati) end up with a
// global bbox in lon/lat and falsely pass an intersection test even
// though no actual vertex is anywhere near our window. We require at
// least one vertex inside the window — fast and correct for the
// regional Western-Europe basemap.
function ringHasPointInBbox(ring: number[][]): boolean {
	for (const [x, y] of ring) {
		if (x >= BBOX.minLon && x <= BBOX.maxLon && y >= BBOX.minLat && y <= BBOX.maxLat) {
			return true;
		}
	}
	return false;
}

function loadBasemapLand(): LandPoly[] {
	const topo = countries as unknown as Topology;
	const fc = feature(topo, topo.objects.countries) as FeatureCollection<Polygon | MultiPolygon>;

	const out: LandPoly[] = [];
	for (const f of fc.features) {
		const geom = f.geometry;
		const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
		for (let i = 0; i < polys.length; i++) {
			const poly = polys[i];
			if (!ringHasPointInBbox(poly[0])) continue;
			out.push({
				id: `${f.id ?? 'x'}-${i}`,
				contour: poly.map((ring) => ring.map(([x, y]) => [x, y] as Position))
			});
		}
	}
	return out;
}

const BASEMAP_LAND: LandPoly[] = loadBasemapLand();

/**
 * Renders the basemap land as deck.gl polygons sourced from the same
 * Natural Earth 1:10M data as the occupation veil. By using a single
 * source for both, the coastline drawn under the veil and the
 * coastline used to compute the veil are guaranteed to align.
 *
 * The sea is the background color of the (otherwise empty) MapLibre
 * style; this layer paints land on top.
 */
export function buildBasemapLayers(): Layer[] {
	return [
		new PolygonLayer<LandPoly>({
			id: 'basemap-land',
			data: BASEMAP_LAND,
			getPolygon: (d) => d.contour,
			getFillColor: [...LAND_FILL, 255],
			getLineColor: [...LAND_STROKE, 200],
			lineWidthUnits: 'pixels',
			getLineWidth: 0.6,
			stroked: true,
			filled: true,
			pickable: false
		})
	];
}
