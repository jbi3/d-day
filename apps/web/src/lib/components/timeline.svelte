<script lang="ts">
	import type { TimeStore } from '$lib/time-store.svelte';
	import type { MapEvent } from '@d-day/schema';

	interface Props {
		time: TimeStore;
		simStartEpoch: number;
		events: MapEvent[];
		formatSimTime: (h: number) => string;
	}

	const { time, simStartEpoch, events, formatSimTime }: Props = $props();

	function eventOffsetHours(e: MapEvent): number {
		return (Date.parse(e.time) - simStartEpoch) / 3_600_000;
	}

	const visibleEvents = $derived(
		events
			.map((e) => ({ event: e, hours: eventOffsetHours(e) }))
			.filter((e) => e.hours >= time.start && e.hours <= time.end)
	);

	function pinLeft(hours: number): string {
		const pct = ((hours - time.start) / (time.end - time.start)) * 100;
		return `${pct}%`;
	}

	// Tick marks every 6 sim-hours: D-1 22:00, D 00:00, D 06:00, D 12:00, D 18:00.
	const ticks: { hours: number; label: string }[] = [
		{ hours: 0, label: 'D-1 22:00' },
		{ hours: 2, label: 'D 00:00' },
		{ hours: 8, label: 'D 06:00' },
		{ hours: 14, label: 'D 12:00' },
		{ hours: 20, label: 'D 18:00' }
	];

	const HIDE_DELAY_MS = 2500;
	let visible = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let reduceMotion = $state(false);

	$effect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return;
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduceMotion = mq.matches;
		const onChange = (e: MediaQueryListEvent) => (reduceMotion = e.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	function clearHideTimer() {
		if (hideTimer !== null) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
	}

	function armHideTimer() {
		clearHideTimer();
		hideTimer = setTimeout(() => {
			visible = false;
			hideTimer = null;
		}, HIDE_DELAY_MS);
	}

	$effect(() => {
		if (reduceMotion) {
			clearHideTimer();
			visible = true;
			return;
		}
		if (time.playing) {
			visible = true;
			armHideTimer();
		} else {
			clearHideTimer();
			visible = true;
		}
	});

	function onWindowMouseMove() {
		if (reduceMotion) return;
		if (!time.playing) return;
		visible = true;
		armHideTimer();
	}

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;
	async function copyLink() {
		if (typeof window === 'undefined') return;
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1800);
		} catch {
			// Clipboard refused (insecure context, permission); the URL is still
			// in the browser bar — silently no-op rather than show an error.
		}
	}
</script>

<svelte:window onmousemove={onWindowMouseMove} />

<div class="hud" class:hidden={!visible}>
	<div class="row">
		<button
			class="play"
			onclick={() => time.toggle()}
			aria-label={time.playing ? 'Pause' : 'Lecture'}
		>
			{time.playing ? '❚❚' : '▶'}
		</button>
		<button
			class="secondary"
			onclick={() => time.reset()}
			title="Revenir à D-1 22:00"
			aria-label="Réinitialiser"
		>
			↺
		</button>
		<span class="time">{formatSimTime(time.simHours)}</span>
		<label class="speed">
			<span>Vitesse</span>
			<select bind:value={time.playRate} aria-label="Vitesse de lecture">
				<option value={0.25}>0,25×</option>
				<option value={0.5}>0,5×</option>
				<option value={1}>1×</option>
				<option value={2}>2×</option>
				<option value={4}>4×</option>
			</select>
		</label>
		<button
			class="secondary copy"
			type="button"
			onclick={copyLink}
			aria-label="Copier le lien partageable"
		>
			{copied ? '✓ Copié' : '⎘ Lien'}
		</button>
	</div>

	<div class="track-wrap">
		<input
			class="scrub"
			type="range"
			min={time.start}
			max={time.end}
			step={0.05}
			bind:value={time.simHours}
			aria-label="Position dans la chronologie (heures depuis D-1 22:00)"
		/>
		<div class="pins" aria-hidden="true">
			{#each visibleEvents as { event, hours } (event.id)}
				<button
					type="button"
					class="pin"
					class:disputed={(event.disputedBy?.length ?? 0) > 0}
					style:left={pinLeft(hours)}
					title="{formatSimTime(hours)} — {event.title}"
					onclick={() => time.seek(hours)}
				></button>
			{/each}
		</div>
		<div class="ticks" aria-hidden="true">
			{#each ticks as t (t.hours)}
				<span class="tick" style:left={pinLeft(t.hours)}>{t.label}</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.hud {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		right: 1rem;
		background: rgba(20, 20, 20, 0.55);
		color: #fff;
		padding: 0.55rem 0.85rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		backdrop-filter: blur(12px);
		font-family: system-ui, sans-serif;
		transition:
			opacity 250ms ease,
			transform 250ms ease;
	}
	.hud.hidden {
		opacity: 0;
		transform: translateY(8px);
		pointer-events: none;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.time {
		font-variant-numeric: tabular-nums;
		font-size: 1rem;
	}
	button {
		background: rgba(255, 255, 255, 0.18);
		color: #fff;
		border: 0;
		padding: 0.35rem 0.7rem;
		border-radius: 4px;
		cursor: pointer;
		font: inherit;
	}
	button.play {
		font-size: 0.95rem;
		line-height: 1;
		min-width: 2.4rem;
	}
	button.secondary {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.35rem 0.6rem;
		font-size: 1.05rem;
		line-height: 1;
	}
	button:hover {
		background: rgba(255, 255, 255, 0.28);
	}
	.speed {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		opacity: 0.85;
		margin-left: auto;
	}
	.copy {
		font-size: 0.78rem;
		padding: 0.3rem 0.6rem;
	}
	.speed select {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		border: 0;
		border-radius: 4px;
		padding: 0.2rem 0.45rem;
		font: inherit;
	}
	.track-wrap {
		position: relative;
		padding-top: 0.5rem;
	}
	.scrub {
		width: 100%;
	}
	.pins {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 0.6rem;
		pointer-events: none;
	}
	.pin {
		position: absolute;
		top: 0;
		width: 6px;
		height: 0.6rem;
		padding: 0;
		border-radius: 2px;
		background: #f0c419;
		transform: translateX(-50%);
		pointer-events: auto;
		cursor: pointer;
	}
	.pin.disputed {
		background: #e07a3f;
		box-shadow: 0 0 0 1px #fff5;
	}
	.pin:hover {
		filter: brightness(1.2);
	}
	.ticks {
		position: relative;
		height: 1rem;
		margin-top: 0.1rem;
	}
	.tick {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		font-size: 0.68rem;
		opacity: 0.7;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	button:focus-visible,
	.scrub:focus-visible,
	.speed select:focus-visible {
		outline: 2px solid #5ec3ff;
		outline-offset: 2px;
	}
	.pin:focus-visible {
		outline: 2px solid #5ec3ff;
		outline-offset: 1px;
	}
	@media (prefers-reduced-motion: reduce) {
		.hud {
			transition: none;
		}
	}
</style>
