import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sourceSchema, unitSchema, movementSchema, eventSchema } from '../schemas.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fx = (name: string) =>
	JSON.parse(readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateSource = ajv.compile(sourceSchema);
const validateUnit = ajv.compile(unitSchema);
const validateMovement = ajv.compile(movementSchema);
const validateEvent = ajv.compile(eventSchema);

describe('source schema', () => {
	it('accepts a valid source', () => {
		expect(validateSource(fx('source-valid.json'))).toBe(true);
	});

	it('rejects an invalid source', () => {
		const ok = validateSource(fx('source-invalid.json'));
		expect(ok).toBe(false);
		expect(validateSource.errors).toBeTruthy();
	});
});

describe('unit schema', () => {
	it('accepts a valid unit', () => {
		expect(validateUnit(fx('unit-valid.json'))).toBe(true);
	});

	it('rejects an invalid unit', () => {
		expect(validateUnit(fx('unit-invalid.json'))).toBe(false);
	});
});

describe('movement schema', () => {
	it('accepts a valid movement', () => {
		expect(validateMovement(fx('movement-valid.json'))).toBe(true);
	});

	it('rejects an invalid movement', () => {
		expect(validateMovement(fx('movement-invalid.json'))).toBe(false);
	});

	it('accepts a movement with disputedBy entries (contested-fact path)', () => {
		const ok = validateMovement(fx('movement-disputed.json'));
		expect(ok).toBe(true);
	});
});

describe('event schema', () => {
	it('accepts a valid event', () => {
		expect(validateEvent(fx('event-valid.json'))).toBe(true);
	});

	it('rejects an invalid event', () => {
		expect(validateEvent(fx('event-invalid.json'))).toBe(false);
	});
});
