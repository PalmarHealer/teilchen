<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import DatePicker from '#lib/components/DatePicker.svelte';
	import Header from '#lib/components/Header.svelte';
	import Select from '#lib/components/Select.svelte';
	import { useI18n } from '#lib/i18n/index.ts';
	import { allocate, parseCents } from '#lib/money.ts';

	let { data, form } = $props();
	const i = useI18n();

	const me = $derived(data.user!);
	// Initial values come from the URL (?person=, ?group=) and are edited locally afterwards.
	// svelte-ignore state_referenced_locally
	let context = $state(data.preset.group ? `group:${data.preset.group}` : 'direct');
	let amount = $state('');
	let mode = $state<'equal' | 'exact'>('equal');
	// svelte-ignore state_referenced_locally
	let participants = $state<string[]>(
		data.preset.person ? [data.user!.id, data.preset.person] : [data.user!.id]
	);
	// svelte-ignore state_referenced_locally
	let payer = $state(data.user!.id);
	const now = new Date();
	let date = $state(
		`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
	);

	const people = $derived.by(() => {
		const all = [{ id: me.id, name: i.t('common.youSuffix', { name: me.name }) }, ...data.contacts];
		if (context === 'direct') return all;
		const g = data.groups.find((g) => `group:${g.id}` === context);
		return all.filter((p) => g?.memberIds.includes(p.id));
	});

	const contextOptions = $derived([
		{ value: 'direct', label: i.t('expenses.directBetween'), icon: 'direct' },
		...data.groups.map((g) => ({ value: `group:${g.id}`, label: g.name, icon: g.icon }))
	]);
	const payerOptions = $derived(people.map((p) => ({ value: p.id, label: p.name, icon: 'user' })));

	// Group changed → select all of its members
	let lastContext = '';
	$effect(() => {
		if (context === lastContext) return;
		lastContext = context;
		if (context !== 'direct') participants = people.map((p) => p.id);
		if (!people.some((p) => p.id === payer)) payer = me.id;
	});

	const cents = $derived(parseCents(amount) ?? 0);
	const equalShares = $derived(
		participants.length
			? allocate(
					cents,
					participants.map(() => 1)
				)
			: []
	);
</script>

<Header title={i.t('expenses.new')} back="/expenses" />

<form method="POST" use:enhance class="stack">
	<label class="field">
		{i.t('expenses.what')}
		<input name="title" required placeholder={i.t('expenses.whatPlaceholder')} maxlength="120" />
	</label>
	<div class="two">
		<label class="field">
			{i.t('expenses.amount')}
			<input
				name="amount"
				required
				inputmode="decimal"
				placeholder="0,00"
				bind:value={amount}
				class="num big"
			/>
		</label>
		<DatePicker name="date" bind:value={date} label={i.t('expenses.date')} />
	</div>

	<Select
		name="context"
		bind:value={context}
		options={contextOptions}
		label={i.t('expenses.where')}
	/>
	<Select name="payer" bind:value={payer} options={payerOptions} label={i.t('expenses.paidBy')} />

	<fieldset class="stack">
		<legend class="muted">{i.t('expenses.splitBetween')}</legend>
		<div class="chips">
			{#each people as p (p.id)}
				<label class="chip">
					<input type="checkbox" name="participants" value={p.id} bind:group={participants} />
					{p.name}
				</label>
			{/each}
		</div>
		<div class="chips">
			<label class="chip">
				<input type="radio" name="mode" value="equal" bind:group={mode} />
				{i.t('expenses.equal')}
			</label>
			<label class="chip">
				<input type="radio" name="mode" value="exact" bind:group={mode} />
				{i.t('expenses.exact')}
			</label>
		</div>

		{#if mode === 'equal'}
			<ul class="list">
				{#each participants as id, idx (id)}
					<li class="item">
						<span class="grow">{people.find((p) => p.id === id)?.name}</span>
						<Amount cents={equalShares[idx] ?? 0} />
					</li>
				{/each}
			</ul>
		{:else}
			{#each participants as id (id)}
				<label class="field">
					{people.find((p) => p.id === id)?.name}
					<input name="exact_{id}" inputmode="decimal" placeholder="0,00" class="num" />
				</label>
			{/each}
		{/if}
	</fieldset>

	{#if form?.message}<p class="error">{i.t(form.message)}</p>{/if}
	<button class="btn primary block">{i.t('expenses.save')}</button>
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
