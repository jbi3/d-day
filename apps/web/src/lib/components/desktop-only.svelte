<script lang="ts">
	let blocked = $state(false);

	function evaluate() {
		if (typeof window === 'undefined') return;
		const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
		const narrow = window.innerWidth < 1024;
		blocked = coarse || narrow;
	}

	$effect(() => {
		evaluate();
		const onResize = () => evaluate();
		window.addEventListener('resize', onResize);
		const mq = window.matchMedia?.('(pointer: coarse)');
		mq?.addEventListener?.('change', evaluate);
		return () => {
			window.removeEventListener('resize', onResize);
			mq?.removeEventListener?.('change', evaluate);
		};
	});
</script>

{#if blocked}
	<div class="block">
		<div class="card">
			<h1>Cette carte est conçue pour un grand écran</h1>
			<p>
				L'expérience repose sur le survol, le scroll précis du temps et la lecture de
				symboles fins. Reviens depuis un ordinateur (écran ≥ 1024 px, souris ou trackpad).
			</p>
			<p class="hint">
				Mobile et tactile sont volontairement non supportés pour ne pas dégrader la lecture
				historique.
			</p>
		</div>
	</div>
{/if}

<style>
	.block {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		background: #1a1f24;
		color: #e8e8e8;
		font-family: system-ui, sans-serif;
		padding: 1.5rem;
	}
	.card {
		max-width: 28rem;
		background: rgba(20, 20, 20, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 1.5rem 1.5rem 1.75rem;
		text-align: center;
	}
	h1 {
		margin: 0 0 0.85rem;
		font-size: 1.15rem;
		font-weight: 600;
		line-height: 1.3;
	}
	p {
		margin: 0 0 0.6rem;
		font-size: 0.92rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.9);
	}
	.hint {
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 0;
	}
</style>
