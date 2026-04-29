<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { MapboxOverlay } from '@deck.gl/mapbox';
	import { ScatterplotLayer } from '@deck.gl/layers';

	// MVP simulation window: D-1 22:00 → D 18:00 (20 hours).
	// Two placeholder waypoints near Omaha for the fake unit.
	const startCoord: [number, number] = [-1.2117, 49.4099];
	const endCoord: [number, number] = [-1.0747, 49.3411];
	const tStart = 0;
	const tEnd = 20;

	let simHours = $state(0);
	let playing = $state(false);

	const t = $derived((simHours - tStart) / (tEnd - tStart));
	const unitPosition = $derived<[number, number]>([
		startCoord[0] + (endCoord[0] - startCoord[0]) * t,
		startCoord[1] + (endCoord[1] - startCoord[1]) * t
	]);

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let deckOverlay: MapboxOverlay | undefined;

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://demotiles.maplibre.org/style.json',
			center: [-1.15, 49.38],
			zoom: 9
		});

		deckOverlay = new MapboxOverlay({ layers: [] });
		map.addControl(deckOverlay as unknown as maplibregl.IControl);

		return () => {
			map?.remove();
		};
	});

	$effect(() => {
		if (!playing) return;
		let last = performance.now();
		let raf = 0;
		const step = (now: number) => {
			const dt = (now - last) / 1000;
			last = now;
			simHours = Math.min(tEnd, simHours + dt * 0.5);
			if (simHours >= tEnd) {
				playing = false;
				return;
			}
			raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	});

	$effect(() => {
		if (!deckOverlay) return;
		deckOverlay.setProps({
			layers: [
				new ScatterplotLayer({
					id: 'fake-unit',
					data: [{ position: unitPosition }],
					getPosition: (d: { position: [number, number] }) => d.position,
					getRadius: 1500,
					radiusUnits: 'meters',
					getFillColor: [0, 100, 200, 200],
					stroked: true,
					getLineColor: [255, 255, 255, 255],
					lineWidthUnits: 'pixels',
					getLineWidth: 2,
					pickable: true
				})
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
	<title>D-Day map — tech validation</title>
</svelte:head>

<div class="map-wrap">
	<div bind:this={mapContainer} class="map"></div>

	<div class="hud">
		<div class="row">
			<button onclick={() => (playing = !playing)}>
				{playing ? 'Pause' : 'Play'}
			</button>
			<span class="time">{formatSimTime(simHours)}</span>
		</div>
		<input type="range" min={tStart} max={tEnd} step={0.05} bind:value={simHours} />
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
