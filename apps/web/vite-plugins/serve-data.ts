import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = join(here, '..', '..', '..', 'data');

function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const s = statSync(full);
		if (s.isDirectory()) yield* walk(full);
		else if (s.isFile() && entry.endsWith('.json')) yield full;
	}
}

interface Manifest {
	units: string[];
	vessels: string[];
	events: string[];
	sources: string;
	frontline: string;
}

function listJson(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.sort();
}

function buildManifest(): Manifest {
	return {
		units: listJson(join(dataRoot, 'units')).map((f) => `units/${f}`),
		vessels: listJson(join(dataRoot, 'vessels')).map((f) => `vessels/${f}`),
		events: listJson(join(dataRoot, 'events')).map((f) => `events/${f}`),
		sources: 'sources/registry.json',
		frontline: 'frontline.json'
	};
}

/**
 * Vite plugin that exposes the workspace `data/` tree at the URL prefix
 * `/data/` :
 *
 * - In dev, a server middleware reads files on demand from `../../../data/`,
 *   so editing JSON triggers an immediate refresh in the browser without
 *   a Vite HMR restart and without copying anything.
 *
 * - In build, the same files are copied into the static output under
 *   `build/data/<...>` so they ship with the generated site.
 */
export function serveData(): Plugin {
	return {
		name: 'd-day:serve-data',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = req.url ?? '';
				if (!url.startsWith('/data/')) return next();
				const rel = url.replace(/^\/data\//, '').split('?')[0];

				// Synthetic manifest, regenerated each request so dev edits
				// to data/ pick up immediately.
				if (rel === 'manifest.json') {
					const body = JSON.stringify(buildManifest());
					res.setHeader('Content-Type', 'application/json; charset=utf-8');
					res.setHeader('Cache-Control', 'no-cache');
					res.statusCode = 200;
					return res.end(body);
				}

				const path = join(dataRoot, rel);
				if (!path.startsWith(dataRoot) || !existsSync(path)) {
					res.statusCode = 404;
					return res.end('Not found');
				}
				try {
					const body = readFileSync(path);
					res.setHeader('Content-Type', 'application/json; charset=utf-8');
					res.setHeader('Cache-Control', 'no-cache');
					res.statusCode = 200;
					res.end(body);
				} catch (err) {
					res.statusCode = 500;
					res.end(err instanceof Error ? err.message : 'Read error');
				}
			});
		},
		closeBundle() {
			// SvelteKit's adapter-static writes its output to ./build by
			// default; copy each *.json under data/ to build/data/<...>
			// and write the manifest alongside.
			const outRoot = join(here, '..', 'build', 'data');
			if (!existsSync(outRoot)) mkdirSync(outRoot, { recursive: true });
			for (const file of walk(dataRoot)) {
				const rel = posix.normalize(relative(dataRoot, file).replace(/\\/g, '/'));
				const target = join(outRoot, rel);
				mkdirSync(dirname(target), { recursive: true });
				writeFileSync(target, readFileSync(file));
			}
			writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(buildManifest()));
		}
	};
}
