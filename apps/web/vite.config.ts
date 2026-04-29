import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		fs: {
			// Allow Vite to serve files outside apps/web/ — the data
			// loader reads ../../../data/{units,events,sources}/*.json
			// at build time via import.meta.glob.
			allow: ['..', '../..', '../../..']
		}
	}
});
