import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sourceSchema } from '../schemas.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(__dirname, '../../../../data/sources/registry.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSource = ajv.compile(sourceSchema);

interface Registry {
	version: number;
	sources: unknown[];
}

const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as Registry;

describe('source registry', () => {
	it('every entry validates against source.schema.json', () => {
		for (const entry of registry.sources) {
			const ok = validateSource(entry);
			if (!ok) {
				throw new Error(
					`Source ${(entry as { id?: string }).id ?? '?'} failed: ${JSON.stringify(validateSource.errors)}`
				);
			}
			expect(ok).toBe(true);
		}
	});

	it('source IDs are unique', () => {
		const ids = (registry.sources as { id: string }[]).map((s) => s.id);
		const set = new Set(ids);
		expect(set.size).toBe(ids.length);
	});

	it('has at least the brief shortlist (≥7 entries)', () => {
		expect(registry.sources.length).toBeGreaterThanOrEqual(7);
	});
});
