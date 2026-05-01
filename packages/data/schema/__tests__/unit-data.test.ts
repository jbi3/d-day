import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, it, expect } from 'vitest';

import { unitSchema, movementSchema } from '../schemas.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');
const unitsDir = resolve(repoRoot, 'data', 'units');
const registryPath = resolve(repoRoot, 'data', 'sources', 'registry.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateUnit = ajv.compile(unitSchema);
const validateMovement = ajv.compile(movementSchema);

const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
	sources: { id: string }[];
};
const knownSourceIds = new Set(registry.sources.map((s) => s.id));

interface UnitFile {
	unit: { id: string; sources: string[] };
	movement: {
		unitId: string;
		waypoints: { sources: string[]; disputedBy?: { source: string; claim: string }[] }[];
	};
}

const unitFiles = readdirSync(unitsDir)
	.filter((f) => f.endsWith('.json'))
	.map((f) => ({
		name: f,
		data: JSON.parse(readFileSync(resolve(unitsDir, f), 'utf-8')) as UnitFile
	}));

describe('data/units/*.json', () => {
	if (unitFiles.length === 0) {
		it.skip('no unit files yet', () => {});
		return;
	}

	for (const { name, data } of unitFiles) {
		describe(name, () => {
			it('unit validates against unit.schema.json', () => {
				const ok = validateUnit(data.unit);
				if (!ok) throw new Error(JSON.stringify(validateUnit.errors));
				expect(ok).toBe(true);
			});

			it('movement validates against movement.schema.json', () => {
				const ok = validateMovement(data.movement);
				if (!ok) throw new Error(JSON.stringify(validateMovement.errors));
				expect(ok).toBe(true);
			});

			it('movement.unitId matches unit.id', () => {
				expect(data.movement.unitId).toBe(data.unit.id);
			});

			it('every cited source ID exists in the registry', () => {
				const cited = new Set<string>([
					...data.unit.sources,
					...data.movement.waypoints.flatMap((w) => w.sources),
					...data.movement.waypoints.flatMap((w) => (w.disputedBy ?? []).map((d) => d.source))
				]);
				for (const id of cited) {
					expect(knownSourceIds, `source ${id} missing from registry`).toContain(id);
				}
			});
		});
	}
});
