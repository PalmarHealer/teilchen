<script lang="ts" module>
	export interface ExpenseFormValues {
		title: string;
		amount: string;
		date: string;
		context: string;
		payer: string;
		participants: string[];
		mode: 'equal' | 'exact';
		exact: Record<string, string>;
		icon: string | null;
	}
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n, type MessageKey } from '../i18n/index.ts';
	import { EXPENSE_ICON_SUGGESTIONS } from '../icon-suggestions.ts';
	import { allocate, parseCents } from '../money.ts';
	import Amount from './Amount.svelte';
	import DatePicker from './DatePicker.svelte';
	import IconPicker from './IconPicker.svelte';
	import Select from './Select.svelte';

	/** Shared by "new expense" and "edit expense"; the server validates via parseExpenseForm. */
	let {
		me,
		contacts,
		groups,
		initial,
		action = '',
		submitLabel,
		error
	}: {
		me: { id: string; name: string };
		contacts: { id: string; name: string }[];
		groups: { id: string; name: string; icon: string; memberIds: string[] }[];
		initial: ExpenseFormValues;
		action?: string;
		submitLabel: string;
		error?: MessageKey;
	} = $props();

	const i = useI18n();
	// The form owns its values after the first render.
	// svelte-ignore state_referenced_locally
	let v = $state(structuredClone(initial));

	const people = $derived.by(() => {
		const all = [{ id: me.id, name: i.t('common.youSuffix', { name: me.name }) }, ...contacts];
		if (v.context === 'direct') return all;
		const g = groups.find((g) => `group:${g.id}` === v.context);
		return all.filter((p) => g?.memberIds.includes(p.id));
	});

	const contextOptions = $derived([
		{ value: 'direct', label: i.t('expenses.directBetween'), icon: 'direct' },
		...groups.map((g) => ({ value: `group:${g.id}`, label: g.name, icon: g.icon }))
	]);
	const payerOptions = $derived(people.map((p) => ({ value: p.id, label: p.name, icon: 'user' })));

	// Group changed → select all of its members (not on first render, so edits keep their split)
	// svelte-ignore state_referenced_locally
	let lastContext = initial.context;
	$effect(() => {
		if (v.context === lastContext) return;
		lastContext = v.context;
		if (v.context !== 'direct') v.participants = people.map((p) => p.id);
		if (!people.some((p) => p.id === v.payer)) v.payer = me.id;
	});

	const cents = $derived(parseCents(v.amount) ?? 0);
	const equalShares = $derived(
		v.participants.length
			? allocate(
					cents,
					v.participants.map(() => 1)
				)
			: []
	);
</script>

<form method="POST" {action} use:enhance class="stack">
	<label class="field">
		{i.t('expenses.what')}
		<input
			name="title"
			required
			placeholder={i.t('expenses.whatPlaceholder')}
			maxlength="120"
			bind:value={v.title}
		/>
	</label>
	<div class="two">
		<label class="field">
			{i.t('expenses.amount')}
			<input
				name="amount"
				required
				inputmode="decimal"
				placeholder="0,00"
				bind:value={v.amount}
				class="num big"
			/>
		</label>
		<DatePicker name="date" bind:value={v.date} label={i.t('expenses.date')} />
	</div>

	<Select
		name="context"
		bind:value={v.context}
		options={contextOptions}
		label={i.t('expenses.where')}
	/>
	<Select name="payer" bind:value={v.payer} options={payerOptions} label={i.t('expenses.paidBy')} />

	<fieldset class="stack">
		<legend class="muted">{i.t('expenses.splitBetween')}</legend>
		<div class="chips">
			{#each people as p (p.id)}
				<label class="chip">
					<input type="checkbox" name="participants" value={p.id} bind:group={v.participants} />
					{p.name}
				</label>
			{/each}
		</div>
		<div class="chips">
			<label class="chip">
				<input type="radio" name="mode" value="equal" bind:group={v.mode} />
				{i.t('expenses.equal')}
			</label>
			<label class="chip">
				<input type="radio" name="mode" value="exact" bind:group={v.mode} />
				{i.t('expenses.exact')}
			</label>
		</div>

		{#if v.mode === 'equal'}
			<ul class="list">
				{#each v.participants as id, idx (id)}
					<li class="item">
						<span class="grow">{people.find((p) => p.id === id)?.name}</span>
						<Amount cents={equalShares[idx] ?? 0} />
					</li>
				{/each}
			</ul>
		{:else}
			{#each v.participants as id (id)}
				<label class="field">
					{people.find((p) => p.id === id)?.name}
					<input
						name="exact_{id}"
						inputmode="decimal"
						placeholder="0,00"
						class="num"
						value={v.exact[id] ?? ''}
					/>
				</label>
			{/each}
		{/if}
	</fieldset>

	<IconPicker
		bind:value={v.icon}
		suggestions={EXPENSE_ICON_SUGGESTIONS}
		legend={i.t('expenses.icon')}
	/>

	{#if error}<p class="error">{i.t(error)}</p>{/if}
	<button class="btn primary block">{submitLabel}</button>
</form>

<style>
	.two {
		display: grid;
		grid-template-columns: 1fr 1.4fr;
		gap: 12px;
		align-items: end;
	}
	.big {
		font-size: 1.3rem;
		font-weight: 700;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}
	legend {
		font-size: 0.9rem;
		margin-bottom: 6px;
	}
	.grow {
		flex: 1;
	}
</style>
