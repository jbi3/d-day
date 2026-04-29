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
	import Timeline from '$lib/components/timeline.svelte';

	const data = loadData();

	const simStartIso = '1944-06-05T22:00:00Z';
	const simStartEpoch = Date.parse(simStartIso);
	const time = new TimeStore(0, 20);

	const currentEpoch = $derived(simStartEpoch + time.simHours * 3_600_000);
	const currentIso = $derived(new Date(currentEpoch).toISOString());

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let deckOverlay: MapboxOverlay | undefined;

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://demotiles.maplibre.org/style.json',
			center: [-0.88, 49.37],
			zoom: 9
		});

		deckOverlay = new MapboxOverlay({ layers: [] });
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
