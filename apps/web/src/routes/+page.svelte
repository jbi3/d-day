<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { MapboxOverlay } from '@deck.gl/mapbox';

	import { TimeStore } from '$lib/time-store.svelte';
	import { loadData } from '$lib/data-loader';
	import { buildUnitLayers } from '$lib/layers/units';

	const data = loadData();

	// MVP simulation window: D-1 22:00 → D 18:00 (20 hours from anchor).
	const simStartIso = '1944-06-05T22:00:00Z';
	const simStartEpoch = Date.parse(simStartIso);
	const time = new TimeStore(0, 20);

	const currentIso = $derived(
		new Date(simStartEpoch + time.simHours * 3_600_000).toISOString()
	);

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
			layers: buildUnitLayers({ tracks: data.units, isoTime: currentIso })
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

	<div class="hud">
		<div class="row">
			<button onclick={() => time.toggle()}>
				{time.playing ? 'Pause' : 'Play'}
			</button>
			<span class="time">{formatSimTime(time.simHours)}</span>
			<span class="meta">{data.units.length} unit{data.units.length === 1 ? '' : 's'}</span>
		</div>
		<input
			type="range"
			min={time.start}
			max={time.end}
			step={0.05}
			bind:value={time.simHours}
		/>
	</div>
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
	.hud {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		right: 1rem;
		background: rgba(20, 20, 20, 0.85);
		color: #fff;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		backdrop-filter: blur(8px);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.time {
		font-variant-numeric: tabular-nums;
		font-size: 1.05rem;
	}
	.meta {
		opacity: 0.75;
		font-size: 0.85rem;
		margin-left: auto;
	}
	button {
		background: #2a6;
		color: #fff;
		border: 0;
		padding: 0.4rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}
	input[type='range'] {
		width: 100%;
	}
</style>
