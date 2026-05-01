<script lang="ts">
	import type { EventCategory } from '@d-day/schema';

	import { buildSvg, type AxisAffiliation } from '$lib/layers/unit-icons';
	import { vesselIconUri } from '$lib/layers/vessel-icons';

	interface Props {
		categoryFilter: Record<EventCategory, boolean>;
		onCategoryToggle: (cat: EventCategory) => void;
		navalVisible: boolean;
		onNavalToggle: () => void;
	}

	const { categoryFilter, onCategoryToggle, navalVisible, onNavalToggle }: Props = $props();

	let open = $state(false);

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}

	type Sample = {
		side: 'allied' | 'axis';
		branch: 'infantry' | 'airborne';
		country: string;
		number: string;
		axisAffiliation?: AxisAffiliation;
		label: string;
	};

	const categoryLabels: Array<{ key: EventCategory; label: string }> = [
		{ key: 'airborne', label: 'Aéroportées' },
		{ key: 'h-hour', label: 'H-Hour' },
		{ key: 'beach', label: 'Combat de plage' },
		{ key: 'inland', label: 'Avance intérieure' },
		{ key: 'german-reaction', label: 'Réaction allemande' },
		{ key: 'naval', label: 'Bombardement naval' },
		{ key: 'air', label: 'Bombardement aérien' }
	];

	const samples: Sample[] = [
		{
			side: 'allied',
			branch: 'infantry',
			country: 'US',
			number: '29',
			label: "Division d'infanterie US (1st ID, 29th ID)"
		},
		{
			side: 'allied',
			branch: 'airborne',
			country: 'US',
			number: '82',
			label: 'Division aéroportée US (82nd, 101st)'
		},
		{
			side: 'axis',
			branch: 'infantry',
			country: 'DE',
			number: '352',
			axisAffiliation: 'wehrmacht',
			label: 'Division Wehrmacht (352. ID, 91./709.)'
		},
		{
			side: 'axis',
			branch: 'infantry',
			country: 'DE',
			number: 'SS',
			axisAffiliation: 'ss',
			label: 'Division Waffen-SS (gris feldgrau)'
		}
	];

	function svgUri(s: Sample): string {
		return `data:image/svg+xml;utf8,${encodeURIComponent(
			buildSvg(s.side, s.branch, s.country, s.number, s.axisAffiliation ?? 'wehrmacht')
		)}`;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if !open}
	<button class="pill" type="button" onclick={() => (open = true)}>
		<span class="pill-glyph" aria-hidden="true">▦</span>
		<span>Légende</span>
		<span class="visually-hidden"> — ouvrir</span>
	</button>
{:else}
	<aside class="legend">
		<button
			class="close"
			type="button"
			aria-label="Fermer la légende"
			onclick={() => (open = false)}>×</button
		>
		<dl>
			{#each samples as s (s.label)}
				<dt><img class="icon" src={svgUri(s)} alt="" /></dt>
				<dd>{s.label}</dd>
			{/each}
			<dt>
				<img class="icon vessel" src={vesselIconUri('battleship', 'US')} alt="" />
			</dt>
			<dd>Navire bombardier (cuirassé / croiseur / monitor)</dd>
			<dt><span class="swatch event"></span></dt>
			<dd>Événement — apparaît à son heure, s'estompe en ~1 h</dd>
			<dt><span class="swatch event-disputed"></span></dt>
			<dd>Événement avec faits contestés</dd>
			<dt><span class="swatch occupation"></span></dt>
			<dd>Territoire occupé par l'Axe (recule à mesure de l'avance alliée)</dd>
		</dl>

		<div class="layer-toggles">
			<label>
				<input type="checkbox" checked={navalVisible} onchange={onNavalToggle} />
				<span>Afficher la flotte alliée</span>
			</label>
		</div>

		<fieldset class="filter">
			<legend>Filtrer les événements</legend>
			{#each categoryLabels as cat (cat.key)}
				<label>
					<input
						type="checkbox"
						checked={categoryFilter[cat.key]}
						onchange={() => onCategoryToggle(cat.key)}
					/>
					<span>{cat.label}</span>
				</label>
			{/each}
		</fieldset>
	</aside>
{/if}

<style>
	.pill {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 10;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(20, 20, 20, 0.45);
		color: #f5f5f5;
		padding: 0.3rem 0.7rem;
		border: 0;
		border-radius: 999px;
		backdrop-filter: blur(12px);
		font-family: system-ui, sans-serif;
		font-size: 0.72rem;
		opacity: 0.85;
		cursor: pointer;
		transition:
			background 150ms ease,
			opacity 150ms ease;
	}
	.pill:hover {
		background: rgba(20, 20, 20, 0.7);
		opacity: 1;
	}
	.pill-glyph {
		font-size: 0.85rem;
		line-height: 1;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.legend {
		position: absolute;
		top: 1rem;
		left: 1rem;
		max-width: 18rem;
		background: rgba(20, 20, 20, 0.65);
		color: #f5f5f5;
		padding: 0.5rem 0.7rem 0.55rem 0.7rem;
		border-radius: 6px;
		backdrop-filter: blur(12px);
		font-family: system-ui, sans-serif;
		font-size: 0.78rem;
		line-height: 1.3;
	}
	.close {
		position: absolute;
		top: 0.2rem;
		right: 0.35rem;
		background: transparent;
		border: 0;
		color: #f5f5f5;
		font-size: 1.1rem;
		line-height: 1;
		padding: 0.1rem 0.35rem;
		cursor: pointer;
		opacity: 0.7;
	}
	.close:hover {
		opacity: 1;
	}
	dl {
		display: grid;
		grid-template-columns: 2rem 1fr;
		row-gap: 0.4rem;
		column-gap: 0.5rem;
		margin: 0.2rem 0 0;
		align-items: center;
	}
	dt {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	dd {
		margin: 0;
		opacity: 0.9;
	}
	.icon {
		width: 1.9rem;
		height: 1.9rem;
		display: block;
	}
	.icon.vessel {
		height: 1rem;
		width: 2rem;
	}
	.layer-toggles {
		margin: 0.6rem -0.2rem 0;
		padding: 0.5rem 0.4rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
	}
	.layer-toggles label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.layer-toggles input[type='checkbox'] {
		margin: 0;
		width: 0.85rem;
		height: 0.85rem;
		accent-color: #5ec3ff;
	}
	.swatch {
		display: inline-block;
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 50%;
		border: 1.5px solid rgba(240, 240, 240, 0.95);
	}
	.swatch.event {
		background: rgb(240, 200, 30);
		border-color: rgba(20, 20, 20, 0.7);
	}
	.swatch.event-disputed {
		background: rgb(240, 130, 70);
		border-color: rgba(20, 20, 20, 0.7);
	}
	.swatch.occupation {
		background: rgba(60, 70, 55, 0.55);
		border: 1px solid rgba(40, 50, 35, 0.8);
		border-radius: 2px;
		width: 1rem;
		height: 0.7rem;
	}
	.pill:focus-visible,
	.close:focus-visible {
		outline: 2px solid #5ec3ff;
		outline-offset: 2px;
		opacity: 1;
	}
	.filter {
		margin: 0.6rem -0.2rem 0;
		padding: 0.5rem 0.4rem 0.3rem;
		border: 0;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		display: grid;
		grid-template-columns: 1fr 1fr;
		row-gap: 0.25rem;
		column-gap: 0.5rem;
	}
	.filter legend {
		grid-column: 1 / -1;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.85;
		margin-bottom: 0.2rem;
		padding: 0;
	}
	.filter label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.74rem;
		cursor: pointer;
	}
	.filter input[type='checkbox'] {
		margin: 0;
		width: 0.85rem;
		height: 0.85rem;
		accent-color: #5ec3ff;
		cursor: pointer;
	}
	.filter input[type='checkbox']:focus-visible {
		outline: 2px solid #5ec3ff;
		outline-offset: 2px;
	}
</style>
