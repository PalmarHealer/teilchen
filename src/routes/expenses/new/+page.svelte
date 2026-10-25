<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Header from '#lib/components/Header.svelte';
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
	const today = new Date().toISOString().slice(0, 10);

	const people = $derived.by(() => {
		const all = [{ id: me.id, name: i.t('common.youSuffix', { name: me.name }) }, ...data.contacts];
		if (context === 'direct') return all;
		const g = data.groups.find((g) => `group:${g.id}` === context);
		return all.filter((p) => g?.memberIds.includes(p.id));
	});

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
	<div class="row two">
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
		<label class="field">
			{i.t('expenses.date')}
			<input name="date" type="date" value={today} required />
		</label>
	</div>

	<label class="field">
		{i.t('expenses.where')}
		<select name="context" bind:value={context}>
			<option value="direct">{i.t('expenses.directBetween')}</option>
			{#each data.groups as g (g.id)}
				<option value="group:{g.id}">{i.t('expenses.groupOption', { name: g.name })}</option>
			{/each}
		</select>
	</label>

	<label class="field">
		{i.t('expenses.paidBy')}
		<select name="payer" bind:value={payer}>
			{#each people as p (p.id)}
				<option value={p.id}>{p.name}</option>
			{/each}
		</select>
	</label>

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
				{#each participants as id, i (id)}
					<li class="item">
						<span class="grow">{people.find((p) => p.id === id)?.name}</span>
						<Amount cents={equalShares[i] ?? 0} />
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
	.two > * {
		flex: 1;
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
