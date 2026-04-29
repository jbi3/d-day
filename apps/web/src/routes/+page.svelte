<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { MapboxOverlay } from '@deck.gl/mapbox';

	import { TimeStore } from '$lib/time-store.svelte';
	import { loadData } from '$lib/data-loader';
	import { buildUnitLayers } from '$lib/layers/units';
	import { buildFrontlineLayers } from '$lib/layers/frontline';
	import { buildEventLayers } from '$lib/layers/events';
	import { buildUncertaintyLayers } from '$lib/layers/uncertainty';
	import Timeline from '$lib/components/timeline.svelte';
	import Details, { type Selection } from '$lib/components/details.svelte';
	import Legend from '$lib/components/legend.svelte';

	const data = loadData();

	const simStartIso = '1944-06-05T22:00:00Z';
	const simStartEpoch = Date.parse(simStartIso);
	const time = new TimeStore(0, 20);

	const currentEpoch = $derived(simStartEpoch + time.simHours * 3_600_000);
	const currentIso = $derived(new Date(currentEpoch).toISOString());

	let selection = $state<Selection>(null);

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let deckOverlay: MapboxOverlay | undefined;

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			// OpenFreeMap positron — free vector basemap, no API key, no
			// rate limit. Placeholder until the painted basemap (post-MVP).
			style: 'https://tiles.openfreemap.org/styles/positron',
			center: [-0.95, 49.4],
			zoom: 8.5
		});

		deckOverlay = new MapboxOverlay({
			layers: [],
			getTooltip: ({ object, layer }) => {
				if (!object || !layer?.id) return null;
				if (layer.id === 'units-marker' && object.label) {
					return { text: object.label };
				}
				if (layer.id === 'events' && object.title) {
					return { text: object.title };
				}
				return null;
			},
			onClick: ({ object, layer }) => {
				if (!object || !layer?.id) {
					selection = null;
					return true;
				}
				if (layer.id === 'units-marker') {
					const track = data.unitById.get(object.id);
					if (track) selection = { kind: 'unit', track };
				} else if (layer.id === 'events') {
					const event = data.eventById.get(object.id);
					if (event) selection = { kind: 'event', event };
				}
				return true;
			}
		});
		map.addControl(deckOverlay as unknown as maplibregl.IControl);

		return () => {
			map?.remove();
		};
	});

	$effect(() => {
		if (!deckOverlay) return;
		deckOverlay.setProps({
			layers: [
				...buildFrontlineLayers({ tracks: data.units, isoTime: currentIso }),
				...buildUncertaintyLayers({
					tracks: data.units,
					events: data.events,
					isoTime: currentIso,
					currentEpoch
				}),
				...buildEventLayers({ events: data.events, currentEpoch }),
				...buildUnitLayers({ tracks: data.units, isoTime: currentIso })
			]
		});
	});

	function formatSimTime(h: number): string {
		const totalMinutes = Math.round(h * 60);
		const startMinute = 22 * 60;
		const absMinutes = startMinute + totalMinutes;
		const hh = Math.floor(absMinutes / 60) % 24;
		const mm = absMinutes % 60;
		const day = absMinutes < 24 * 60 ? 'D-1' : 'D';
		return `${day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>D-Day map — MVP</title>
</svelte:head>

<div class="map-wrap">
	<div bind:this={mapContainer} class="map"></div>

	<Legend />

	<Details
		{selection}
		sourceById={data.sourceById}
		onClose={() => (selection = null)}
	/>

	<Timeline
		{time}
		{simStartEpoch}
		events={data.events}
		{formatSimTime}
		unitCount={data.units.length}
	/>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
	}
	.map-wrap {
		position: fixed;
		inset: 0;
	}
	.map {
		position: absolute;
		inset: 0;
	}
</style>
