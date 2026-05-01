import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, it, expect } from 'vitest';

import { frontlineSchema } from '../schemas.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');
const frontlinePath = resolve(repoRoot, 'data', 'frontline.json');
const registryPath = resolve(repoRoot, 'data', 'sources', 'registry.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFrontline = ajv.compile(frontlineSchema);

const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
	sources: { id: string }[];
};
const knownSourceIds = new Set(registry.sources.map((s) => s.id));

interface FrontlineFileShape {
	segments: {
		id: string;
		keyframes: { time: string; path: number[][] }[];
		sources: string[];
	}[];
}

describe('data/frontline.json', () => {
	if (!existsSync(frontlinePath)) {
		it.skip('no frontline file yet', () => {});
		return;
	}

	const file = JSON.parse(readFileSync(frontlinePath, 'utf-8')) as FrontlineFileShape;

	it('validates against frontline.schema.json', () => {
		const ok = validateFrontline(file);
		if (!ok) {
			throw new Error(`frontline.json failed: ${JSON.stringify(validateFrontline.errors)}`);
		}
		expect(ok).toBe(true);
	});

	it('segment IDs are unique', () => {
		const ids = file.segments.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('every keyframe in a segment has the same vertex count', () => {
		for (const seg of file.segments) {
			const v0 = seg.keyframes[0].path.length;
			for (let i = 1; i < seg.keyframes.length; i++) {
				expect(
					seg.keyframes[i].path.length,
					`segment ${seg.id} keyframe ${i}: expected ${v0} vertices, got ${seg.keyframes[i].path.length}`
				).toBe(v0);
			}
		}
	});

	it('keyframes within a segment are in chronological order', () => {
		for (const seg of file.segments) {
			for (let i = 1; i < seg.keyframes.length; i++) {
				const prev = Date.parse(seg.keyframes[i - 1].time);
				const curr = Date.parse(seg.keyframes[i].time);
				expect(curr, `segment ${seg.id} keyframe ${i} not after keyframe ${i - 1}`).toBeGreaterThan(
					prev
				);
			}
		}
	});

	it('every cited source ID exists in the registry', () => {
		for (const seg of file.segments) {
			for (const id of seg.sources) {
				expect(knownSourceIds, `segment ${seg.id} cites unknown source ${id}`).toContain(id);
			}
		}
	});
});
