<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	/** A destructive form action that asks inline instead of using the browser's confirm(). */
	let {
		action,
		icon,
		label,
		question,
		confirmLabel,
		cancelLabel,
		danger = false,
		disabled = false,
		children
	}: {
		action: string;
		icon: string;
		label: string;
		question: string;
		confirmLabel: string;
		cancelLabel: string;
		danger?: boolean;
		disabled?: boolean;
		/** Extra fields submitted with the confirmation */
		children?: Snippet;
	} = $props();

	let asking = $state(false);
</script>

{#if asking}
	<form method="POST" {action} use:enhance class="ask" class:danger>
		<p>{question}</p>
		{@render children?.()}
		<div class="row">
			<button type="button" class="btn grow" onclick={() => (asking = false)}>{cancelLabel}</button>
			<button class="btn grow confirm"><Icon name={icon} size={18} /> {confirmLabel}</button>
		</div>
	</form>
{:else}
	<button type="button" class="btn block" class:danger {disabled} onclick={() => (asking = true)}>
		<Icon name={icon} size={18} />
		{label}
	</button>
{/if}

<style>
	.ask {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		border: 1px solid var(--line);
		border-radius: 14px;
	}
	.ask p {
		margin: 0;
	}
	.ask.danger {
		border-color: var(--minus);
	}
	.grow {
		flex: 1;
	}
	.danger:not(.ask) {
		color: var(--minus);
	}
	.ask.danger .confirm {
		background: var(--minus);
		border-color: var(--minus);
		color: #fff;
	}
</style>
