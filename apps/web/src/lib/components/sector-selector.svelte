<script lang="ts">
	interface Sector {
		id: string;
		label: string;
		center: [number, number];
		zoom: number;
	}

	interface Props {
		onJump: (center: [number, number], zoom: number) => void;
	}

	const { onJump }: Props = $props();

	let open = $state(false);

	const sectors: Sector[] = [
		{ id: 'cotentin', label: 'Cotentin (airborne US)', center: [-1.31, 49.39], zoom: 9.5 },
		{ id: 'utah', label: 'Utah', center: [-1.18, 49.41], zoom: 11 },
		{ id: 'omaha', label: 'Omaha', center: [-0.88, 49.37], zoom: 11 },
		{ id: 'gold', label: 'Gold', center: [-0.6, 49.34], zoom: 11 },
		{ id: 'juno', label: 'Juno', center: [-0.43, 49.33], zoom: 11 },
		{ id: 'sword', label: 'Sword', center: [-0.27, 49.295], zoom: 11 }
	];

	function jump(s: Sector) {
		onJump(s.center, s.zoom);
		open = false;
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="wrap">
	<button class="trigger" type="button" aria-expanded={open} onclick={() => (open = !open)}>
		<span aria-hidden="true">⌖</span>
		<span>Aller à</span>
	</button>
	{#if open}
		<ul class="menu" role="menu">
			{#each sectors as s (s.id)}
				<li role="none">
					<button type="button" role="menuitem" onclick={() => jump(s)}>{s.label}</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.wrap {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 10;
		font-family: system-ui, sans-serif;
	}
	.trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(20, 20, 20, 0.55);
		color: #f5f5f5;
		padding: 0.35rem 0.75rem;
		border: 0;
		border-radius: 6px;
		backdrop-filter: blur(12px);
		font-size: 0.78rem;
		cursor: pointer;
	}
	.trigger:hover {
		background: rgba(20, 20, 20, 0.75);
	}
	.menu {
		list-style: none;
		margin: 0.35rem 0 0;
		padding: 0.3rem;
		background: rgba(20, 20, 20, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		backdrop-filter: blur(12px);
		min-width: 12rem;
	}
	.menu li {
		display: block;
	}
	.menu button {
		display: block;
		width: 100%;
		text-align: left;
		background: transparent;
		color: #f5f5f5;
		border: 0;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.menu button:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.trigger:focus-visible,
	.menu button:focus-visible {
		outline: 2px solid #5ec3ff;
		outline-offset: 2px;
	}
</style>
