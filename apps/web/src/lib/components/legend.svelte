<script lang="ts">
	import { buildSvg, type AxisAffiliation } from '$lib/layers/unit-icons';

	let open = $state(true);

	type Sample = {
		side: 'allied' | 'axis';
		branch: 'infantry' | 'airborne';
		country: string;
		number: string;
		axisAffiliation?: AxisAffiliation;
		label: string;
	};

	const samples: Sample[] = [
		{ side: 'allied', branch: 'infantry', country: 'US', number: '29', label: 'US infantry division (1st ID, 29th ID)' },
		{ side: 'allied', branch: 'airborne', country: 'US', number: '82', label: 'US airborne division (82nd, 101st)' },
		{ side: 'axis', branch: 'infantry', country: 'DE', number: '352', axisAffiliation: 'wehrmacht', label: 'Wehrmacht division (352. ID, 91./709.)' },
		{ side: 'axis', branch: 'infantry', country: 'DE', number: 'SS', axisAffiliation: 'ss', label: 'Waffen-SS division (gris feldgrau)' }
	];

	function svgUri(s: Sample): string {
		return `data:image/svg+xml;utf8,${encodeURIComponent(
			buildSvg(s.side, s.branch, s.country, s.number, s.axisAffiliation ?? 'wehrmacht')
		)}`;
	}
</script>

<aside class="legend" class:collapsed={!open}>
	<button class="toggle" type="button" onclick={() => (open = !open)}>
		{open ? '−' : '+'} Legend
	</button>
	{#if open}
		<dl>
			{#each samples as s (s.label)}
				<dt><img class="icon" src={svgUri(s)} alt="" /></dt>
				<dd>{s.label}</dd>
			{/each}
			<dt><span class="swatch event"></span></dt>
			<dd>Event marker — fires at its time, fades over ~1h</dd>
			<dt><span class="swatch event-disputed"></span></dt>
			<dd>Event with <code>disputedBy</code> entries</dd>
			<dt><span class="swatch occupation"></span></dt>
			<dd>German-occupied land (recedes as Allies advance; <code>harrison-1951</code>, <code>us-na-aar</code>)</dd>
		</dl>
		<p class="hint">
			NATO frame: rectangle = friendly (contour blanc), diamond = hostile (contour
			noir). Drapeau national en fond, glyph de branche (✕ infanterie / parachute
			aéroportée) en filigrane, numéro de division par-dessus. SS = fond gris
			feldgrau au lieu de la Hakenkreuzflagge.
		</p>
		<p class="hint">Click a marker for sources & disputed claims.</p>
		<p class="hint">
			<kbd>Space</kbd> play/pause · <kbd>←</kbd> <kbd>→</kbd> scrub
			(<kbd>Shift</kbd>+arrow = ±1h) · <kbd>Home</kbd> reset · <kbd>Esc</kbd> close
		</p>
	{/if}
</aside>

<style>
	.legend {
		position: absolute;
		top: 1rem;
		left: 1rem;
		max-width: 18rem;
		background: rgba(20, 20, 20, 0.9);
		color: #f5f5f5;
		padding: 0.6rem 0.85rem;
		border-radius: 6px;
		backdrop-filter: blur(8px);
		font-family: system-ui, sans-serif;
		font-size: 0.78rem;
		line-height: 1.35;
	}
	.legend.collapsed {
		padding: 0.4rem 0.6rem;
	}
	.toggle {
		background: transparent;
		border: 0;
		color: #f5f5f5;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}
	dl {
		display: grid;
		grid-template-columns: 2rem 1fr;
		row-gap: 0.4rem;
		column-gap: 0.5rem;
		margin: 0.5rem 0 0.4rem;
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
	code {
		font-size: 0.8em;
		opacity: 0.9;
	}
	.hint {
		margin: 0.35rem 0 0;
		font-size: 0.72rem;
		opacity: 0.7;
	}
	kbd {
		display: inline-block;
		padding: 0 0.3rem;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.12);
		font-size: 0.7rem;
		font-family: ui-monospace, monospace;
	}
</style>
