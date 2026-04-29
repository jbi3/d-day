import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { eventSchema } from '../schemas.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');
const eventsDir = resolve(repoRoot, 'data', 'events');
const registryPath = resolve(repoRoot, 'data', 'sources', 'registry.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateEvent = ajv.compile(eventSchema);

const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
	sources: { id: string }[];
};
const knownSourceIds = new Set(registry.sources.map((s) => s.id));

interface EventsFile {
	events: {
		id: string;
		sources: string[];
		disputedBy?: { source: string; claim: string }[];
	}[];
}

const eventFiles = readdirSync(eventsDir)
	.filter((f) => f.endsWith('.json'))
	.map((f) => ({
		name: f,
		data: JSON.parse(readFileSync(resolve(eventsDir, f), 'utf-8')) as EventsFile
	}));

describe('data/events/*.json', () => {
	if (eventFiles.length === 0) {
		it.skip('no event files yet', () => {});
		return;
	}

	for (const { name, data } of eventFiles) {
		describe(name, () => {
			it('every event validates against event.schema.json', () => {
				for (const e of data.events) {
					const ok = validateEvent(e);
					if (!ok) {
						throw new Error(`Event ${e.id} failed: ${JSON.stringify(validateEvent.errors)}`);
					}
					expect(ok).toBe(true);
				}
			});

			it('event IDs are unique within the file', () => {
				const ids = data.events.map((e) => e.id);
				expect(new Set(ids).size).toBe(ids.length);
			});

			it('every cited source ID exists in the registry', () => {
				for (const e of data.events) {
					for (const id of e.sources) {
						expect(knownSourceIds, `event ${e.id} cites unknown source ${id}`).toContain(id);
					}
					for (const d of e.disputedBy ?? []) {
						expect(
							knownSourceIds,
							`event ${e.id} disputedBy cites unknown source ${d.source}`
						).toContain(d.source);
					}
				}
			});
		});
	}
});
