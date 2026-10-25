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
	import Icon from './Icon.svelte';
	import Select from './Select.svelte';
	import { Button } from './ui/button/index.ts';
	import { Input } from './ui/input/index.ts';
	import { Label } from './ui/label/index.ts';
	import * as List from './ui/list/index.ts';

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

	const chip =
		'has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary hover:bg-accent has-focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium shadow-xs transition-colors has-focus-visible:ring-[3px]';

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

<form method="POST" {action} use:enhance class="flex flex-col gap-5">
	<Label>
		{i.t('expenses.what')}
		<Input
			name="title"
			required
			placeholder={i.t('expenses.whatPlaceholder')}
			maxlength={120}
			bind:value={v.title}
		/>
	</Label>
	<div class="grid grid-cols-[1fr_1.4fr] items-end gap-3">
		<Label>
			{i.t('expenses.amount')}
			<Input
				name="amount"
				required
				inputmode="decimal"
				placeholder="0,00"
				bind:value={v.amount}
				class="tabular text-lg font-semibold md:text-lg"
			/>
		</Label>
		<DatePicker name="date" bind:value={v.date} label={i.t('expenses.date')} />
	</div>

	<Select
		name="context"
		bind:value={v.context}
		options={contextOptions}
		label={i.t('expenses.where')}
	/>
	<Select name="payer" bind:value={v.payer} options={payerOptions} label={i.t('expenses.paidBy')} />

	<fieldset class="flex flex-col gap-3">
		<legend class="mb-2 text-sm leading-none font-medium">{i.t('expenses.splitBetween')}</legend>
		<div class="flex flex-wrap gap-2">
			{#each people as p (p.id)}
				<label class={chip}>
					<input
						type="checkbox"
						name="participants"
						value={p.id}
						bind:group={v.participants}
						class="sr-only"
					/>
					<span class="check"><Icon name="check" size={14} /></span>
					{p.name}
				</label>
			{/each}
		</div>
		<div class="bg-muted inline-flex w-fit rounded-lg p-1">
			{#each [['equal', i.t('expenses.equal')], ['exact', i.t('expenses.exact')]] as [mode, text] (mode)}
				<label
					class="has-checked:bg-card has-checked:text-foreground text-muted-foreground has-focus-visible:ring-ring/50 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors has-checked:shadow-sm has-focus-visible:ring-[3px]"
				>
					<input type="radio" name="mode" value={mode} bind:group={v.mode} class="sr-only" />
					{text}
				</label>
			{/each}
		</div>

		{#if v.mode === 'equal'}
			<List.Root>
				{#each v.participants as id, idx (id)}
					<List.Item class="min-h-11 py-2 text-sm">
						<span class="flex-1">{people.find((p) => p.id === id)?.name}</span>
						<Amount cents={equalShares[idx] ?? 0} />
					</List.Item>
				{/each}
			</List.Root>
		{:else}
			{#each v.participants as id (id)}
				<Label class="font-normal">
					{people.find((p) => p.id === id)?.name}
					<Input
						name="exact_{id}"
						inputmode="decimal"
						placeholder="0,00"
						class="tabular"
						value={v.exact[id] ?? ''}
					/>
				</Label>
			{/each}
		{/if}
	</fieldset>

	<IconPicker
		bind:value={v.icon}
		suggestions={EXPENSE_ICON_SUGGESTIONS}
		legend={i.t('expenses.icon')}
	/>

	{#if error}<p class="text-destructive text-sm">{i.t(error)}</p>{/if}
	<Button type="submit" size="lg" class="w-full">{submitLabel}</Button>
</form>

<style>
	/* The tick only shows on selected people */
	label:not(:has(:checked)) .check {
		display: none;
	}
</style>
