<script lang="ts">
	import DesktopOnly from '$lib/components/desktop-only.svelte';
	import Details, { type Selection } from '$lib/components/details.svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import Legend from '$lib/components/legend.svelte';
	import SectorSelector from '$lib/components/sector-selector.svelte';
	import Timeline from '$lib/components/timeline.svelte';
	import type { EventCategory } from '@d-day/schema';

	import { loadData, unitPositionAt, type LoadedData } from '$lib/data-loader';
	import { buildBasemapLayers } from '$lib/layers/basemap';
	import { buildBeachLayers } from '$lib/layers/beaches';
	import { buildEventLayers } from '$lib/layers/events';
	import { buildFrontlineLayers } from '$lib/layers/frontline';
	import { buildRoadLayers } from '$lib/layers/roads';
	import { buildToponymLayers } from '$lib/layers/toponyms';
	import { buildTrailLayers } from '$lib/layers/trails';
	import { buildUnitLayers } from '$lib/layers/units';
	import { TimeStore } from '$lib/time-store.svelte';
	import { MapboxOverlay } from '@deck.gl/mapbox';
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';

	let data = $state<LoadedData | null>(null);
	let dataError = $state<Error | null>(null);

	let categoryFilter = $state<Record<EventCategory, boolean>>({
		airborne: true,
		'h-hour': true,
		beach: true,
		inland: true,
		'german-reaction': true,
		naval: true,
		air: true
	});

	function toggleCategory(cat: EventCategory) {
		categoryFilter = { ...categoryFilter, [cat]: !categoryFilter[cat] };
	}

	const filteredEvents = $derived.by(() => {
		if (!data) return [];
		return data.events.filter((e) => !e.category || categoryFilter[e.category]);
	});

	const simStartIso = '1944-06-05T22:00:00Z';
	const simStartEpoch = Date.parse(simStartIso);
	const time = new TimeStore(0, 20);

	const currentEpoch = $derived(simStartEpoch + time.simHours * 3_600_000);
	const currentIso = $derived(new Date(currentEpoch).toISOString());

	let selection = $state<Selection>(null);
	let zoom = $state(8.5);

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let deckOverlay: MapboxOverlay | undefined;

	function readHashStateFor(d: LoadedData): { simHours?: number; selection?: Selection } {
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
				const track = d.unitById.get(id);
				if (track) out.selection = { kind: 'unit', track };
			} else if (kind === 'event' && id) {
				const event = d.eventById.get(id);
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
		if (
			target &&
			(target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable)
		) {
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
		// Kick off the async dataset fetch ; the deck.gl + maplibre setup
		// proceeds in parallel so the basemap can paint while data loads.
		loadData()
			.then((d) => {
				data = d;
				const initial = readHashStateFor(d);
				if (initial.simHours !== undefined) time.seek(initial.simHours);
				if (initial.selection) selection = initial.selection;
			})
			.catch((err: unknown) => {
				dataError = err instanceof Error ? err : new Error(String(err));
			});

		// Basemap is rendered entirely via deck.gl (see buildBasemapLayers)
		// from the same Natural Earth 1:10M source as the occupation veil,
		// so coastlines align by construction. MapLibre carries only the
		// sea-color background and the camera; no tiles, no external host.
		const blankStyle: maplibregl.StyleSpecification = {
			version: 8,
			sources: {},
			layers: [{ id: 'sea', type: 'background', paint: { 'background-color': '#c8d6dd' } }]
		};

		map = new maplibregl.Map({
			container: mapContainer,
			style: blankStyle,
			center: [-0.95, 49.4],
			zoom: 8.5
		});

		map.on('zoom', () => {
			if (map) zoom = map.getZoom();
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
				if (!data) return true;
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
			const reduceMotion =
				typeof window !== 'undefined' &&
				window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
			const targetZoom = Math.max(map.getZoom(), 10);
			if (reduceMotion) {
				map.jumpTo({ center, zoom: targetZoom });
			} else {
				map.flyTo({ center, zoom: targetZoom, duration: 800 });
			}
		}
	});

	$effect(() => {
		if (!deckOverlay) return;
		// Render basemap chrome immediately ; data-driven layers wait for
		// loadData() to resolve so the user sees the map taking shape
		// progressively rather than a blank canvas.
		const chrome = [
			...buildBasemapLayers(),
			...buildRoadLayers({ zoom }),
			...buildToponymLayers({ zoom }),
			...buildBeachLayers({ zoom })
		];
		if (!data) {
			deckOverlay.setProps({ layers: chrome });
			return;
		}
		deckOverlay.setProps({
			layers: [
				...buildBasemapLayers(),
				...buildFrontlineLayers({ segments: data.frontlineSegments, currentEpoch }),
				...buildRoadLayers({ zoom }),
				...buildToponymLayers({ zoom }),
				...buildBeachLayers({ zoom }),
				...buildTrailLayers({ tracks: data.units, isoTime: currentIso }),
				...buildEventLayers({ events: filteredEvents, currentEpoch }),
				...buildUnitLayers({ tracks: data.units, isoTime: currentIso, zoom })
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
	<title>D-Day — 6 juin 1944 — carte interactive heure par heure</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<DesktopOnly />

{#if dataError}
	<div class="error-wrap">
		<div class="error-card">
			<h1>Données indisponibles</h1>
			<p class="hint">
				La carte n'a pas pu charger ses données historiques. Recharge la page ou reviens plus tard.
			</p>
			<p class="msg">{dataError.message}</p>
		</div>
	</div>
{:else}
	<div class="map-wrap">
		<div bind:this={mapContainer} class="map"></div>

		<Legend {categoryFilter} onCategoryToggle={toggleCategory} />

		<SectorSelector
			onJump={(center, zoom) => {
				if (!map) return;
				const reduceMotion =
					typeof window !== 'undefined' &&
					window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
				if (reduceMotion) {
					map.jumpTo({ center, zoom });
				} else {
					map.flyTo({ center, zoom, duration: 900 });
				}
			}}
		/>

		{#if data}
			<Details
				{selection}
				sourceById={data.sourceById}
				unitById={data.unitById}
				onSelect={(s) => (selection = s)}
				onClose={() => (selection = null)}
			/>

			<Timeline {time} {simStartEpoch} events={filteredEvents} {formatSimTime} />
		{:else}
			<div class="loading" role="status" aria-live="polite">
				<div class="loading-card">Chargement des données…</div>
			</div>
		{/if}
	</div>
{/if}

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
		z-index: 0;
	}
	.map-wrap :global(.legend),
	.map-wrap :global(.details),
	.map-wrap :global(.hud),
	.map-wrap :global(.wrap) {
		z-index: 10;
	}
	.loading {
		position: absolute;
		left: 50%;
		bottom: 1.5rem;
		transform: translateX(-50%);
		z-index: 10;
		pointer-events: none;
	}
	.loading-card {
		background: rgba(20, 20, 20, 0.7);
		color: #f5f5f5;
		padding: 0.5rem 1rem;
		border-radius: 999px;
		font-family: system-ui, sans-serif;
		font-size: 0.85rem;
		backdrop-filter: blur(8px);
	}
	.error-wrap {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: #1a1f24;
		color: #e8e8e8;
		padding: 2rem;
	}
	.error-card {
		max-width: 480px;
		background: rgba(20, 20, 20, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
	}
	.error-card h1 {
		margin: 0 0 1rem;
		font-size: 1.4rem;
		font-weight: 600;
	}
	.error-card .hint {
		margin: 0 0 1rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}
	.error-card .msg {
		margin: 0;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 4px;
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
		text-align: left;
		word-break: break-word;
		color: rgba(255, 200, 200, 0.9);
	}
</style>
