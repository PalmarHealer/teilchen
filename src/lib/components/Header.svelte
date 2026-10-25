<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	let { title, back, actions }: { title: string; back?: string; actions?: Snippet } = $props();
</script>

<header>
	{#if back}
		<a class="back" href={back} aria-label="Zurück"><Icon name="back" /></a>
	{/if}
	<h1>{title}</h1>
	<div class="actions">{@render actions?.()}</div>
</header>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 0 16px;
	}
	h1 {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.back {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		margin-left: -8px;
		border-radius: 50%;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
</style>
