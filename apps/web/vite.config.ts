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
	},
	build: {
		// Split heavy vendors so the page route node stays lighter and the
		// browser can parallelise downloads. Total bytes are unchanged; it
		// improves parsing locality and HTTP/2 multiplexing.
		rolldownOptions: {
			output: {
				advancedChunks: {
					groups: [
						{ name: 'maplibre', test: /[\\/]node_modules[\\/].*maplibre-gl[\\/]/ },
						{ name: 'deck', test: /[\\/]node_modules[\\/].*@deck\.gl[\\/]/ },
						{ name: 'geo', test: /[\\/]node_modules[\\/].*(polygon-clipping|topojson-client|world-atlas)[\\/]/ }
					]
				}
			}
		},
		chunkSizeWarningLimit: 1500
	}
});
