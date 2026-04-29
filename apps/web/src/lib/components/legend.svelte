<script lang="ts">
	let open = $state(true);
</script>

<aside class="legend" class:collapsed={!open}>
	<button class="toggle" type="button" onclick={() => (open = !open)}>
		{open ? '−' : '+'} Legend
	</button>
	{#if open}
		<dl>
			<dt><span class="swatch allied"></span></dt>
			<dd>Allied unit (1st ID, 29th ID, 82nd / 101st Airborne)</dd>
			<dt><span class="swatch axis"></span></dt>
			<dd>Axis unit (352. ID, 91. LL / 709. ID)</dd>
			<dt><span class="swatch frontline-allied"></span></dt>
			<dd>Allied frontline (soft polyline through unit positions)</dd>
			<dt><span class="swatch frontline-axis"></span></dt>
			<dd>Axis frontline</dd>
			<dt><span class="swatch event"></span></dt>
			<dd>Event marker (dim = upcoming, bright = active ±30 min)</dd>
			<dt><span class="swatch event-disputed"></span></dt>
			<dd>Event with <code>disputedBy</code> entries</dd>
			<dt><span class="swatch uncertainty"></span></dt>
			<dd>Uncertainty halo — currently disputed position</dd>
		</dl>
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
		grid-template-columns: 1.25rem 1fr;
		row-gap: 0.3rem;
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
	.swatch {
		display: inline-block;
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 50%;
		border: 1.5px solid rgba(240, 240, 240, 0.95);
	}
	.swatch.allied {
		background: rgb(60, 130, 210);
	}
	.swatch.axis {
		background: rgb(200, 70, 70);
	}
	.swatch.frontline-allied {
		background: rgba(80, 150, 230, 0.5);
		border-color: rgba(80, 150, 230, 0.95);
		border-radius: 2px;
		height: 0.35rem;
		width: 1rem;
	}
	.swatch.frontline-axis {
		background: rgba(220, 80, 80, 0.5);
		border-color: rgba(220, 80, 80, 0.95);
		border-radius: 2px;
		height: 0.35rem;
		width: 1rem;
	}
	.swatch.event {
		background: rgb(240, 200, 30);
		border-color: rgba(20, 20, 20, 0.7);
	}
	.swatch.event-disputed {
		background: rgb(240, 130, 70);
		border-color: rgba(20, 20, 20, 0.7);
	}
	.swatch.uncertainty {
		background: rgba(240, 130, 70, 0.2);
		border-color: rgba(240, 130, 70, 0.85);
	}
	code {
		font-size: 0.8em;
		opacity: 0.9;
	}
	.hint {
		margin: 0.25rem 0 0;
		font-size: 0.72rem;
		opacity: 0.65;
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
