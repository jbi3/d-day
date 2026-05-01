import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, it, expect } from 'vitest';

import { vesselSchema, vesselTrackSchema } from '../schemas.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');
const vesselsDir = resolve(repoRoot, 'data', 'vessels');
const registryPath = resolve(repoRoot, 'data', 'sources', 'registry.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateVessel = ajv.compile(vesselSchema);
const validateVesselTrack = ajv.compile(vesselTrackSchema);

const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
	sources: { id: string }[];
};
const knownSourceIds = new Set(registry.sources.map((s) => s.id));

interface VesselFile {
	vessel: { id: string; sources: string[] };
	track: {
		vesselId: string;
		waypoints: { sources: string[]; disputedBy?: { source: string; claim: string }[] }[];
	};
}

const vesselFiles = existsSync(vesselsDir)
	? readdirSync(vesselsDir)
			.filter((f) => f.endsWith('.json'))
			.map((f) => ({
				name: f,
				data: JSON.parse(readFileSync(resolve(vesselsDir, f), 'utf-8')) as VesselFile
			}))
	: [];

describe('data/vessels/*.json', () => {
	if (vesselFiles.length === 0) {
		it.skip('no vessel files yet', () => {});
		return;
	}

	for (const { name, data } of vesselFiles) {
		describe(name, () => {
			it('vessel validates against vessel.schema.json', () => {
				const ok = validateVessel(data.vessel);
				if (!ok) throw new Error(JSON.stringify(validateVessel.errors));
				expect(ok).toBe(true);
			});

			it('track validates against vessel-track.schema.json', () => {
				const ok = validateVesselTrack(data.track);
				if (!ok) throw new Error(JSON.stringify(validateVesselTrack.errors));
				expect(ok).toBe(true);
			});

			it('track.vesselId matches vessel.id', () => {
				expect(data.track.vesselId).toBe(data.vessel.id);
			});

			it('every cited source ID exists in the registry', () => {
				const cited = new Set<string>([
					...data.vessel.sources,
					...data.track.waypoints.flatMap((w) => w.sources),
					...data.track.waypoints.flatMap((w) => (w.disputedBy ?? []).map((d) => d.source))
				]);
				for (const id of cited) {
					expect(knownSourceIds, `source ${id} missing from registry`).toContain(id);
				}
			});
		});
	}
});
