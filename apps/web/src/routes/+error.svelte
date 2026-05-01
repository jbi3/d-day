<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>Erreur — D-Day</title>
</svelte:head>

<div class="error">
	<div class="card">
		<h1>Une erreur s'est produite</h1>
		<p class="status">Code {page.status}</p>
		{#if page.error?.message}
			<p class="message">{page.error.message}</p>
		{/if}
		<p class="hint">
			Cette carte est en cours de développement. Recharge la page ou reviens plus tard.
		</p>
		<a class="back" href="/">Retour à la carte</a>
	</div>
</div>

<style>
	.error {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: #1a1f24;
		color: #e8e8e8;
		font-family: system-ui, sans-serif;
		padding: 2rem;
	}
	.card {
		max-width: 480px;
		background: rgba(20, 20, 20, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
	}
	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.4rem;
		font-weight: 600;
	}
	.status {
		margin: 0 0 1.5rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		font-family: ui-monospace, monospace;
	}
	.message {
		margin: 0 0 1rem;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 4px;
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
		text-align: left;
		word-break: break-word;
	}
	.hint {
		margin: 0 0 1.5rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}
	.back {
		display: inline-block;
		padding: 0.5rem 1.25rem;
		background: #5ec3ff;
		color: #0c1116;
		text-decoration: none;
		border-radius: 4px;
		font-weight: 600;
	}
	.back:hover,
	.back:focus-visible {
		background: #88d4ff;
		outline: 2px solid #5ec3ff;
		outline-offset: 2px;
	}
</style>
