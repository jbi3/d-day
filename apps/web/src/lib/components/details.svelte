<script lang="ts">
	import type { UnitTrack } from '$lib/data-loader';
	import type { MapEvent, Source } from '@d-day/schema';

	export type Selection =
		| { kind: 'unit'; track: UnitTrack }
		| { kind: 'event'; event: MapEvent }
		| null;

	interface Props {
		selection: Selection;
		sourceById: Map<string, Source>;
		unitById: Map<string, UnitTrack>;
		onSelect: (s: Selection) => void;
		onClose: () => void;
	}

	const { selection, sourceById, unitById, onSelect, onClose }: Props = $props();

	let panel: HTMLElement | undefined = $state();
	let previouslyFocused: HTMLElement | null = null;

	$effect(() => {
		if (!selection) {
			previouslyFocused = null;
			return;
		}
		// Focus the panel on open so Tab cycles inside; remember the prior
		// focus to restore it when the panel closes.
		previouslyFocused = (
			typeof document !== 'undefined' ? document.activeElement : null
		) as HTMLElement | null;
		queueMicrotask(() => panel?.focus());
		return () => {
			previouslyFocused?.focus?.();
		};
	});

	function focusable(): HTMLElement[] {
		if (!panel) return [];
		return Array.from(
			panel.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab' || !panel) return;
		const active = document.activeElement as HTMLElement | null;
		if (!active || !panel.contains(active)) return;
		const items = focusable();
		if (items.length === 0) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && (active === first || active === panel)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}

	function selectUnit(id: string) {
		const track = unitById.get(id);
		if (track) onSelect({ kind: 'unit', track });
	}

	function formatTime(iso: string): string {
		const d = new Date(iso);
		return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
	}
	function pad(n: number): string {
		return String(n).padStart(2, '0');
	}

	function sideLabel(side: string): string {
		if (side === 'allied') return 'Allié';
		if (side === 'axis') return 'Axe';
		return side;
	}

	function branchLabel(branch: string): string {
		const map: Record<string, string> = {
			infantry: 'Infanterie',
			airborne: 'Aéroportée',
			armor: 'Blindée',
			artillery: 'Artillerie',
			naval: 'Marine',
			air: 'Aérienne'
		};
		return map[branch] ?? branch;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if selection}
	<aside class="details" bind:this={panel} tabindex="-1" aria-label="Fiche de détail">
		<button class="close" type="button" onclick={onClose} aria-label="Fermer">×</button>

		{#if selection.kind === 'unit'}
			{@const u = selection.track.unit}
			{@const m = selection.track.movement}
			<h2>{u.name}</h2>
			<dl>
				<dt>Côté</dt>
				<dd class="side-{u.side}">{sideLabel(u.side)}</dd>
				<dt>Pays</dt>
				<dd>{u.country}</dd>
				<dt>Échelon</dt>
				<dd>{u.echelon}</dd>
				<dt>Arme</dt>
				<dd>{branchLabel(u.branch)}</dd>
				<dt>Étapes</dt>
				<dd>{m.waypoints.length}</dd>
			</dl>

			<h3>Sources</h3>
			<ul class="sources">
				{#each u.sources as id (id)}
					{@const source = sourceById.get(id)}
					{#if source}
						<li>
							<code>{id}</code>
							<span class="title">{source.title}</span>
							{#if source.author}<span class="author">— {source.author}</span>{/if}
						</li>
					{/if}
				{/each}
			</ul>

			{#if m.waypoints.some((w) => (w.disputedBy?.length ?? 0) > 0)}
				<h3>Étapes contestées</h3>
				<ul class="disputes">
					{#each m.waypoints as w (w.time)}
						{#if (w.disputedBy?.length ?? 0) > 0}
							<li>
								<div class="dispute-time">{formatTime(w.time)}</div>
								{#each w.disputedBy ?? [] as d (d.source + d.claim)}
									<div class="claim">
										<code>{d.source}</code> : {d.claim}
									</div>
								{/each}
							</li>
						{/if}
					{/each}
				</ul>
			{/if}
		{:else}
			{@const e = selection.event}
			<h2>{e.title}</h2>
			<div class="event-time">{formatTime(e.time)}</div>
			{#if e.description}
				<p>{e.description}</p>
			{/if}

			{#if (e.involvedUnits?.length ?? 0) > 0}
				<h3>Unités impliquées</h3>
				<ul class="unit-links">
					{#each e.involvedUnits ?? [] as id (id)}
						{@const track = unitById.get(id)}
						{#if track}
							<li>
								<button
									class="unit-link side-{track.unit.side}"
									type="button"
									onclick={() => selectUnit(id)}
								>
									{track.unit.shortName ?? track.unit.name}
								</button>
							</li>
						{:else}
							<li class="unit-link missing">{id} <span>(absent du jeu de données)</span></li>
						{/if}
					{/each}
				</ul>
			{/if}

			<h3>Sources</h3>
			<ul class="sources">
				{#each e.sources as id (id)}
					{@const source = sourceById.get(id)}
					{#if source}
						<li>
							<code>{id}</code>
							<span class="title">{source.title}</span>
							{#if source.author}<span class="author">— {source.author}</span>{/if}
						</li>
					{/if}
				{/each}
			</ul>

			{#if (e.disputedBy?.length ?? 0) > 0}
				<h3>Faits contestés</h3>
				<ul class="disputes">
					{#each e.disputedBy ?? [] as d (d.source + d.claim)}
						<li class="claim"><code>{d.source}</code> : {d.claim}</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</aside>
{/if}

<style>
	.details {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: min(28rem, calc(100vw - 2rem));
		max-height: calc(100vh - 8rem);
		overflow: auto;
		background: rgba(20, 20, 20, 0.92);
		color: #f5f5f5;
		padding: 1rem 1.25rem 1.25rem;
		border-radius: 8px;
		backdrop-filter: blur(10px);
		font-family: system-ui, sans-serif;
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.close {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: transparent;
		color: #f5f5f5;
		border: 0;
		font-size: 1.6rem;
		line-height: 1;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
	}
	.close:hover {
		opacity: 0.7;
	}
	h2 {
		margin: 0 2rem 0.5rem 0;
		font-size: 1.1rem;
		line-height: 1.2;
	}
	h3 {
		margin: 1rem 0 0.4rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.85;
	}
	dl {
		display: grid;
		grid-template-columns: 7rem 1fr;
		row-gap: 0.2rem;
		column-gap: 0.6rem;
		margin: 0.5rem 0;
	}
	dt {
		opacity: 0.85;
	}
	dd {
		margin: 0;
	}
	.side-allied {
		color: #6db4ec;
	}
	.side-axis {
		color: #e87a7a;
	}
	.event-time {
		font-variant-numeric: tabular-nums;
		opacity: 0.9;
		margin-bottom: 0.5rem;
	}
	p {
		margin: 0.5rem 0;
		opacity: 0.92;
	}
	.sources,
	.disputes {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.sources li {
		padding: 0.3rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.sources li:first-child {
		border-top: 0;
	}
	.sources code,
	.disputes code {
		display: inline-block;
		font-size: 0.78rem;
		opacity: 0.85;
		margin-right: 0.4rem;
	}
	.title {
		font-weight: 500;
	}
	.author {
		opacity: 0.85;
		margin-left: 0.25rem;
	}
	.disputes li {
		padding: 0.4rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.disputes li:first-child {
		border-top: 0;
	}
	.dispute-time {
		font-variant-numeric: tabular-nums;
		opacity: 0.85;
		font-size: 0.82rem;
		margin-bottom: 0.2rem;
	}
	.claim {
		opacity: 0.92;
	}
	.unit-links {
		list-style: none;
		padding: 0;
		margin: 0.25rem 0 0.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.unit-link {
		background: rgba(255, 255, 255, 0.1);
		color: #f5f5f5;
		border: 0;
		padding: 0.25rem 0.6rem;
		border-radius: 4px;
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
	}
	.unit-link:hover {
		background: rgba(255, 255, 255, 0.18);
	}
	.unit-link.side-allied {
		border-left: 3px solid #6db4ec;
	}
	.unit-link.side-axis {
		border-left: 3px solid #e87a7a;
	}
	.unit-link.missing {
		opacity: 0.75;
		font-size: 0.78rem;
		padding: 0.25rem 0.5rem;
	}
	.unit-link.missing span {
		opacity: 0.85;
	}
	.details:focus-visible,
	.close:focus-visible,
	.unit-link:focus-visible {
		outline: 2px solid #5ec3ff;
		outline-offset: 2px;
	}
</style>
