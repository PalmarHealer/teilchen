<script lang="ts">
	import { useI18n } from '../i18n/index.ts';
	import Amount from './Amount.svelte';
	import GroupIcon from './GroupIcon.svelte';
	import * as List from './ui/list/index.ts';

	interface Row {
		id: string;
		kind: 'expense' | 'settlement';
		title: string;
		icon: string | null;
		fromReceipt: boolean;
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
	const icon = $derived(
		e.kind === 'settlement' ? 'check' : (e.icon ?? (e.fromReceipt ? 'cart' : 'receipt'))
	);
</script>

<List.Item href="/expenses/{e.id}">
	<GroupIcon {icon} size={36} tone={e.kind === 'settlement' ? 'positive' : 'primary'} />
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="truncate text-sm font-medium">{e.title}</span>
		<span class="text-muted-foreground truncate text-xs"
			>{date} · {e.payerId === me ? i.t('common.you') : e.payerName} · <Amount
				cents={e.amountCents}
			/></span
		>
	</span>
	{#if effect !== 0}
		<Amount cents={effect} signed class="text-sm font-semibold" />
	{:else}
		<span class="text-muted-foreground text-xs">{i.t('common.notInvolved')}</span>
	{/if}
</List.Item>
