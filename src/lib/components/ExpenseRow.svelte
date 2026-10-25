<script lang="ts">
	import Amount from './Amount.svelte';
	import Icon from './Icon.svelte';

	interface Row {
		id: string;
		kind: 'expense' | 'settlement';
		title: string;
		amountCents: number;
		spentAt: Date;
		payerId: string;
		payerName: string;
		myShare: number;
	}
	let { expense: e, me }: { expense: Row; me: string } = $props();
	/** Was diese Buchung an meinem Saldo ändert. */
	const effect = $derived(e.payerId === me ? e.amountCents - e.myShare : -e.myShare);
	const date = $derived(
		new Date(e.spentAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
	);
</script>

<div class="item">
	<span class="ico" class:settle={e.kind === 'settlement'}>
		<Icon name={e.kind === 'settlement' ? 'check' : 'receipt'} size={18} />
	</span>
	<span class="grow">
		<span class="title">{e.title}</span>
		<small class="muted"
			>{date} · {e.payerId === me ? 'du' : e.payerName} · <Amount cents={e.amountCents} /></small
		>
	</span>
	{#if effect !== 0}
		<strong><Amount cents={effect} signed /></strong>
	{:else}
		<small class="muted">nicht beteiligt</small>
	{/if}
</div>

<style>
	.ico {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: var(--surface-2);
		color: var(--muted);
		flex: none;
	}
	.ico.settle {
		color: var(--plus);
	}
	.grow {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
