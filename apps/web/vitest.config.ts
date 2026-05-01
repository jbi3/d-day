import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				runes: true
			}
		})
	],
	resolve: {
		alias: {
			$lib: new URL('./src/lib/', import.meta.url).pathname,
			'@d-day/schema': new URL('../../packages/data/schema/index.ts', import.meta.url).pathname
		},
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{ts,js}'],
		globals: false
	}
});
