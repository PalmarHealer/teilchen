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
	import { untrack } from 'svelte';
	import { useI18n, type MessageKey } from '../i18n/index.ts';
	import { EXPENSE_ICON_SUGGESTIONS } from '../icon-suggestions.ts';
	import { formatAmountInput, reformatInput } from '../amount-input.ts';
	import { allocate, centsToInput, parseCents, type Cents } from '../money.ts';
	import { centsForPercents, parsePercent, percentOf } from '../percent.ts';
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
		groups: {
			id: string;
			name: string;
			icon: string;
			memberIds: string[];
			members: { id: string; name: string }[];
		}[];
		initial: ExpenseFormValues;
		action?: string;
		submitLabel: string;
		error?: MessageKey;
	} = $props();

	const i = useI18n();
	const decimal = $derived(i.locale === 'de' ? ',' : '.');
	/** Cents as formatted input text ("1.234,50"). */
	const moneyText = (c: Cents) => formatAmountInput(centsToInput(c, decimal), 0, decimal).text;
	const formatted = (text: string) => (text ? formatAmountInput(text, 0, decimal).text : '');

	// The form owns its values after the first render.
	// svelte-ignore state_referenced_locally
	let v = $state({
		...structuredClone(initial),
		amount: formatted(initial.amount),
		exact: Object.fromEntries(Object.entries(initial.exact).map(([id, t]) => [id, formatted(t)]))
	});

	const people = $derived.by(() => {
		const you = { id: me.id, name: i.t('common.youSuffix', { name: me.name }) };
		if (v.context === 'direct') return [you, ...contacts];
		// In a group: its members, contacts or not
		const g = groups.find((g) => `group:${g.id}` === v.context);
		return (g?.members ?? []).map((p) => (p.id === me.id ? you : p));
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

	// Exact mode: each amount can also be entered as a percentage of the total. Rows typed as a
	// percentage keep it (and follow the total); the others show the percentage of their amount.
	let percents = $state<Record<string, string>>({});
	// Rows whose amount was typed by hand keep it; the rest of the total is split equally over the
	// others, so going down the list always leaves the remainder. A stored exact split is kept.
	// svelte-ignore state_referenced_locally
	let pinned = $state<Record<string, true>>(
		initial.mode === 'exact'
			? Object.fromEntries(
					Object.entries(initial.exact)
						.filter(([, t]) => t)
						.map(([id]) => [id, true])
				)
			: {}
	);
	const percentFormat = $derived(
		new Intl.NumberFormat(i.locale, { maximumFractionDigits: 1, useGrouping: false })
	);

	function percentText(id: string): string {
		if (id in percents) return percents[id]!;
		const p = percentOf(parseCents(v.exact[id] ?? '') ?? 0, cents);
		return p === null || !v.exact[id] ? '' : percentFormat.format(p);
	}

	/** Amounts of the rows typed as percentages, from the current total. */
	function applyPercents() {
		const rows = v.participants.filter((id) => id in percents);
		const parts = centsForPercents(
			cents,
			rows.map((id) => parsePercent(percents[id]!) ?? 0)
		);
		rows.forEach((id, idx) => {
			v.exact[id] = moneyText(parts[idx]!);
		});
	}

	/** Percentage rows from the total, then the rest split equally over the rows not set by hand. */
	function rebalance() {
		applyPercents();
		const free = v.participants.filter((id) => !pinned[id] && !(id in percents));
		const set = v.participants
			.filter((id) => !free.includes(id))
			.reduce((sum, id) => sum + (parseCents(v.exact[id] ?? '') ?? 0), 0);
		const parts = allocate(
			Math.max(0, cents - set),
			free.map(() => 1)
		);
		free.forEach((id, idx) => {
			v.exact[id] = cents > 0 ? moneyText(parts[idx]!) : '';
		});
	}

	// Clearing a row hands it back to the automatic split.
	function typedAmount(id: string, value: string) {
		v.exact[id] = value;
		delete percents[id];
		if (value.trim()) pinned[id] = true;
		else delete pinned[id];
		rebalance();
	}

	function typedPercent(id: string, value: string) {
		delete pinned[id];
		if (value.trim()) percents[id] = value;
		else delete percents[id];
		rebalance();
	}

	$effect(() => {
		void cents;
		void v.participants.join();
		untrack(rebalance);
	});

	const assigned = $derived(
		v.participants.reduce((sum, id) => sum + (parseCents(v.exact[id] ?? '') ?? 0), 0)
	);

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
				value={v.amount}
				oninput={(e) => (v.amount = reformatInput(e, decimal))}
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
				{@const name = people.find((p) => p.id === id)?.name}
				<div class="flex flex-col gap-2">
					<span class="text-sm leading-none">{name}</span>
					<div class="grid grid-cols-[1fr_6.5rem] gap-2">
						<div class="relative">
							<Input
								name="exact_{id}"
								inputmode="decimal"
								placeholder="0,00"
								aria-label={i.t('expenses.shareAmount', { name: name ?? '' })}
								class="tabular pr-7"
								value={v.exact[id] ?? ''}
								oninput={(e) => typedAmount(id, reformatInput(e, decimal))}
							/>
							<span
								class="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm"
								>€</span
							>
						</div>
						<div class="relative">
							<Input
								inputmode="decimal"
								placeholder="0"
								aria-label={i.t('expenses.sharePercent', { name: name ?? '' })}
								class="tabular pr-7"
								value={percentText(id)}
								oninput={(e) => typedPercent(id, e.currentTarget.value)}
							/>
							<span
								class="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm"
								>%</span
							>
						</div>
					</div>
				</div>
			{/each}
			{#if cents > 0 && v.participants.length}
				<p
					class="text-sm {assigned === cents ? 'text-positive' : 'text-muted-foreground'}"
					aria-live="polite"
				>
					{#if assigned === cents}
						{i.t('expenses.splitComplete')}
					{:else if assigned < cents}
						{i.t('expenses.splitRest', { amount: i.money(cents - assigned) })}
					{:else}
						{i.t('expenses.splitOver', { amount: i.money(assigned - cents) })}
					{/if}
				</p>
			{/if}
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
