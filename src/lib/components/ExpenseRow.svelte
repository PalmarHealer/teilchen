<script lang="ts">
	import { useI18n } from '../i18n/index.ts';
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
	const i = useI18n();
	/** How this booking changes my balance. */
	const effect = $derived(e.payerId === me ? e.amountCents - e.myShare : -e.myShare);
	const date = $derived(i.date(e.spentAt));
</script>

<div class="item">
	<span class="ico" class:settle={e.kind === 'settlement'}>
		<Icon name={e.kind === 'settlement' ? 'check' : 'receipt'} size={18} />
	</span>
	<span class="grow">
		<span class="title">{e.title}</span>
		<small class="muted"
			>{date} · {e.payerId === me ? i.t('common.you') : e.payerName} · <Amount
				cents={e.amountCents}
			/></small
		>
	</span>
	{#if effect !== 0}
		<strong><Amount cents={effect} signed /></strong>
	{:else}
		<small class="muted">{i.t('common.notInvolved')}</small>
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
