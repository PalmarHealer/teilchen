<script lang="ts">
	import Amount from '#lib/components/Amount.svelte';
	import ConfirmAction from '#lib/components/ConfirmAction.svelte';
	import ExpenseForm from '#lib/components/ExpenseForm.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
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

<div class="stack">
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
		<section class="card summary">
			<span class="ico" class:settle={e.kind === 'settlement'}><Icon name={icon} size={28} /></span>
			<h2>{e.title}</h2>
			<strong class="big"><Amount cents={e.amountCents} /></strong>
			<p class="muted">
				{i.date(e.spentAt, { day: 'numeric', month: 'long', year: 'numeric' })} ·
				{i.t('expenses.paidByName', { name: e.payerName })}
			</p>
		</section>

		<h2 class="section-title">{i.t('expenses.shares')}</h2>
		<ul class="list">
			{#each e.shares as s (s.userId)}
				<li class="item">
					<span class="grow">{s.name}</span>
					<Amount cents={s.cents} />
				</li>
			{/each}
		</ul>

		{#if e.kind === 'settlement'}
			<p class="muted hint">{i.t('expenses.settlementInfo')}</p>
		{:else if e.fromReceipt}
			<p class="muted hint">{i.t('expenses.fromReceipt')}</p>
		{/if}
		{#if !data.canManage}
			<p class="muted hint">{i.t('expenses.readOnly')}</p>
		{/if}
		{#if form?.message}<p class="error">{i.t(form.message)}</p>{/if}
	{/if}

	{#if data.canManage}
		<div class="stack actions">
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

<style>
	.summary {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 6px;
	}
	.summary p {
		margin: 0;
	}
	.ico {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--accent) 14%, var(--surface));
		color: var(--accent);
	}
	.ico.settle {
		color: var(--plus);
		background: color-mix(in srgb, var(--plus) 14%, var(--surface));
	}
	.big {
		font-size: 2rem;
	}
	.grow {
		flex: 1;
	}
	.hint {
		font-size: 0.85rem;
		margin: 0 4px;
	}
	.actions {
		margin-top: 8px;
	}
</style>
