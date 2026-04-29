<script lang="ts">
	import type { TimeStore } from '$lib/time-store.svelte';
	import type { MapEvent } from '@d-day/schema';

	interface Props {
		time: TimeStore;
		simStartEpoch: number;
		events: MapEvent[];
		formatSimTime: (h: number) => string;
		unitCount: number;
	}

	const { time, simStartEpoch, events, formatSimTime, unitCount }: Props = $props();

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

	let shareLabel = $state('Share');

	async function share() {
		if (typeof window === 'undefined') return;
		const url = window.location.href;
		try {
			await navigator.clipboard.writeText(url);
			shareLabel = '✓ Copied';
		} catch {
			// Fallback: select and let user copy manually.
			shareLabel = url;
		}
		setTimeout(() => {
			shareLabel = 'Share';
		}, 1600);
	}
</script>

<div class="hud">
	<div class="row">
		<button onclick={() => time.toggle()}>
			{time.playing ? 'Pause' : 'Play'}
		</button>
		<button class="secondary" onclick={() => time.reset()} title="Jump to D-1 22:00">
			↺
		</button>
		<span class="time">{formatSimTime(time.simHours)}</span>
		<label class="speed">
			<span>Speed</span>
			<select bind:value={time.playRate}>
				<option value={0.25}>0.25×</option>
				<option value={0.5}>0.5×</option>
				<option value={1}>1×</option>
				<option value={2}>2×</option>
				<option value={4}>4×</option>
			</select>
		</label>
		<span class="meta">
			{unitCount} unit{unitCount === 1 ? '' : 's'} · {visibleEvents.length} event{visibleEvents.length === 1 ? '' : 's'}
		</span>
		<button
			class="secondary"
			type="button"
			onclick={share}
			title="Copy a link to this moment"
		>
			{shareLabel}
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
			{#each ticks as t}
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
		background: rgba(20, 20, 20, 0.85);
		color: #fff;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		backdrop-filter: blur(8px);
		font-family: system-ui, sans-serif;
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
		font: inherit;
	}
	button.secondary {
		background: rgba(255, 255, 255, 0.12);
		padding: 0.4rem 0.7rem;
		font-size: 1.1rem;
		line-height: 1;
	}
	.speed {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		opacity: 0.85;
	}
	.speed select {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		border: 0;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		font: inherit;
	}
	.track-wrap {
		position: relative;
		padding-top: 0.6rem;
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
		margin-top: 0.15rem;
	}
	.tick {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		font-size: 0.72rem;
		opacity: 0.55;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
