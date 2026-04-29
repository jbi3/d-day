import type { Position } from '@d-day/schema';

/**
 * Approximate land mask for the Cotentin + Bessin in our MVP window.
 *
 * Outer ring traced loosely along the Normandy coast: down the south
 * inland edge, up the east boundary, then west along the Bessin coast,
 * around the Carentan estuary indentation, up the east Cotentin coast,
 * around the Cotentin tip, and down the west Cotentin coast back to
 * the start.
 *
 * Used as an intersection mask so frontline territory polygons never
 * spill into the Channel or the Bay. Precision is intentionally low —
 * a few hundred metres of slop is fine for a conceptual visualisation.
 */
export const NORMANDY_LAND_RING: Position[] = [
	[-1.95, 49.18],
	[0.30, 49.18],
	[0.30, 49.295],
	[0.10, 49.29],
	[-0.20, 49.295],
	[-0.40, 49.335],
	[-0.60, 49.345],
	[-0.78, 49.34],
	[-0.85, 49.355],
	[-0.95, 49.378],
	[-1.05, 49.39],
	[-1.10, 49.36],
	[-1.13, 49.32],
	[-1.20, 49.30],
	[-1.27, 49.295],
	[-1.32, 49.32],
	[-1.30, 49.36],
	[-1.22, 49.40],
	[-1.20, 49.44],
	[-1.21, 49.50],
	[-1.27, 49.59],
	[-1.30, 49.66],
	[-1.50, 49.70],
	[-1.85, 49.71],
	[-1.94, 49.71],
	[-1.93, 49.55],
	[-1.85, 49.45],
	[-1.75, 49.35],
	[-1.65, 49.25]
];
