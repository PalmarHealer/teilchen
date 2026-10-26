<script lang="ts">
	import Amount from '#lib/components/Amount.svelte';
	import ConfirmAction from '#lib/components/ConfirmAction.svelte';
	import ExpenseForm from '#lib/components/ExpenseForm.svelte';
	import Header from '#lib/components/Header.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { SectionTitle } from '#lib/components/ui/section/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
	const e = $derived(data.expense);
	const icon = $derived(
		e.kind === 'settlement' ? 'check' : (e.icon ?? (e.fromReceipt ? 'cart' : 'receipt'))
	);
	const back = $derived(e.groupId ? `/groups/${e.groupId}` : '/expenses');
</script>

<Header title={data.edit ? i.t('expenses.edit') : i.t('expenses.detail')} {back} />

<div class="flex flex-col gap-4">
	{#if data.edit}
		<ExpenseForm
			me={data.user!}
			contacts={data.edit.contacts}
			groups={data.edit.groups}
			initial={data.edit.initial}
			action="?/update"
			submitLabel={i.t('expenses.save')}
			error={form?.message}
		/>
	{:else}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 text-center">
				<GroupIcon {icon} size={56} tone={e.kind === 'settlement' ? 'positive' : 'primary'} />
				<h2 class="mt-1 text-lg font-semibold">{e.title}</h2>
				<Amount cents={e.amountCents} class="text-3xl font-semibold tracking-tight" />
				<p class="text-muted-foreground text-sm">
					{i.date(e.spentAt, { day: 'numeric', month: 'long', year: 'numeric' })} ·
					{i.t('expenses.paidByName', { name: e.payerName })}
				</p>
			</Card.Content>
		</Card.Root>

		<SectionTitle>{i.t('expenses.shares')}</SectionTitle>
		<List.Root>
			{#each e.shares as s (s.userId)}
				<List.Item class="text-sm">
					<span class="flex-1">{s.name}</span>
					<Amount cents={s.cents} class="font-medium" />
				</List.Item>
			{/each}
		</List.Root>

		{#if e.kind === 'settlement'}
			<p class="text-muted-foreground px-1 text-xs">{i.t('expenses.settlementInfo')}</p>
		{:else if e.fromReceipt}
			<p class="text-muted-foreground px-1 text-xs">{i.t('expenses.fromReceipt')}</p>
		{/if}
		{#if !data.canManage}
			<p class="text-muted-foreground px-1 text-xs">{i.t('expenses.readOnly')}</p>
		{/if}
	{/if}

	{#if data.canManage}
		<div class="mt-2 flex flex-col gap-2">
			{#if e.fromReceipt}
				<ConfirmAction
					action="?/resplit"
					icon="swipe"
					label={i.t('expenses.resplit')}
					question={i.t('expenses.resplitConfirm')}
					confirmLabel={i.t('expenses.confirm')}
					cancelLabel={i.t('expenses.cancel')}
				/>
			{/if}
			<ConfirmAction
				action="?/delete"
				icon="trash"
				danger
				label={e.kind === 'settlement' ? i.t('expenses.undoSettlement') : i.t('expenses.delete')}
				question={e.kind === 'settlement'
					? i.t('expenses.undoSettlementConfirm')
					: i.t('expenses.deleteConfirm')}
				confirmLabel={i.t('expenses.confirm')}
				cancelLabel={i.t('expenses.cancel')}
			/>
		</div>
	{/if}
</div>
