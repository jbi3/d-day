<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { MapboxOverlay } from '@deck.gl/mapbox';

	import { TimeStore } from '$lib/time-store.svelte';
	import { loadData, unitPositionAt } from '$lib/data-loader';
	import { buildUnitLayers } from '$lib/layers/units';
	import { buildEventLayers } from '$lib/layers/events';
	import { buildTrailLayers } from '$lib/layers/trails';
	import { buildFrontlineLayers } from '$lib/layers/frontline';
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

	function readHashState(): { simHours?: number; selection?: Selection } {
		if (typeof window === 'undefined') return {};
		const raw = window.location.hash.replace(/^#/, '');
		if (!raw) return {};
		const params = new URLSearchParams(raw);
		const out: { simHours?: number; selection?: Selection } = {};
		const t = params.get('t');
		if (t) {
			const n = Number.parseFloat(t);
			if (Number.isFinite(n)) out.simHours = n;
		}
		const sel = params.get('s');
		if (sel) {
			const [kind, id] = sel.split(':');
			if (kind === 'unit' && id) {
				const track = data.unitById.get(id);
				if (track) out.selection = { kind: 'unit', track };
			} else if (kind === 'event' && id) {
				const event = data.eventById.get(id);
				if (event) out.selection = { kind: 'event', event };
			}
		}
		return out;
	}

	function writeHashState() {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams();
		params.set('t', time.simHours.toFixed(2));
		if (selection) {
			if (selection.kind === 'unit') params.set('s', `unit:${selection.track.unit.id}`);
			else params.set('s', `event:${selection.event.id}`);
		}
		const next = `#${params.toString()}`;
		if (window.location.hash !== next) {
			window.history.replaceState(null, '', next);
		}
	}

	function onKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable)) {
			return;
		}
		if (e.key === ' ') {
			e.preventDefault();
			time.toggle();
		} else if (e.key === 'Home') {
			e.preventDefault();
			time.reset();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			time.seek(time.simHours - (e.shiftKey ? 1 : 0.25));
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			time.seek(time.simHours + (e.shiftKey ? 1 : 0.25));
		} else if (e.key === 'Escape') {
			selection = null;
		}
	}

	onMount(() => {
		const initial = readHashState();
		if (initial.simHours !== undefined) time.seek(initial.simHours);
		if (initial.selection) selection = initial.selection;

		// OpenFreeMap positron — free vector basemap, no API key, no rate
		// limit. Placeholder until the painted basemap (post-MVP). If the
		// service is unreachable, fall back to MapLibre demotiles so the
		// app stays usable.
		const primaryStyle = 'https://tiles.openfreemap.org/styles/positron';
		const fallbackStyle = 'https://demotiles.maplibre.org/style.json';

		map = new maplibregl.Map({
			container: mapContainer,
			style: primaryStyle,
			center: [-0.95, 49.4],
			zoom: 8.5
		});

		map.on('error', (e) => {
			const err = e?.error as { message?: string } | undefined;
			const msg = err?.message ?? '';
			if (msg.includes('openfreemap') || msg.includes('Failed to fetch')) {
				console.warn('[basemap] primary unreachable, falling back to demotiles:', msg);
				map?.setStyle(fallbackStyle);
			}
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

	// Keep the URL hash in sync with state — but throttle while playing
	// so we don't churn history at 60fps. Updates on pause + selection
	// + seek (whenever simHours changes outside of playback).
	$effect(() => {
		if (time.playing) return;
		// Read state to register dependencies; values used inside writeHashState.
		void time.simHours;
		void selection;
		writeHashState();
	});

	$effect(() => {
		if (!map || !selection) return;
		let center: [number, number] | null = null;
		if (selection.kind === 'event') {
			center = selection.event.position;
		} else {
			center = unitPositionAt(selection.track, currentIso);
		}
		if (center) {
			map.flyTo({ center, zoom: Math.max(map.getZoom(), 10), duration: 800 });
		}
	});

	$effect(() => {
		if (!deckOverlay) return;
		deckOverlay.setProps({
			layers: [
				...buildFrontlineLayers({ segments: data.frontlineSegments, currentEpoch }),
				...buildTrailLayers({ tracks: data.units, isoTime: currentIso }),
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

<svelte:window onkeydown={onKeydown} />

<div class="map-wrap">
	<div bind:this={mapContainer} class="map"></div>

	<Legend />

	<Details
		{selection}
		sourceById={data.sourceById}
		unitById={data.unitById}
		onSelect={(s) => (selection = s)}
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
