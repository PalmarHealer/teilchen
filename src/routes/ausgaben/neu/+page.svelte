<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Header from '#lib/components/Header.svelte';
	import { allocate, parseCents } from '#lib/money.ts';

	let { data, form } = $props();

	const me = $derived(data.user!);
	// Startwerte stammen aus der URL (?person=, ?group=) und werden danach lokal bearbeitet.
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
		const all = [{ id: me.id, name: `${me.name} (du)` }, ...data.contacts];
		if (context === 'direct') return all;
		const g = data.groups.find((g) => `group:${g.id}` === context);
		return all.filter((p) => g?.memberIds.includes(p.id));
	});

	// Gruppe gewechselt → Auswahl auf alle Mitglieder setzen
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

<Header title="Neue Ausgabe" back="/ausgaben" />

<form method="POST" use:enhance class="stack">
	<label class="field">
		Wofür?
		<input name="title" required placeholder="z.B. Pizza, Tanken, Kino" maxlength="120" />
	</label>
	<div class="row two">
		<label class="field">
			Betrag (€)
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
			Datum
			<input name="date" type="date" value={today} required />
		</label>
	</div>

	<label class="field">
		Wo?
		<select name="context" bind:value={context}>
			<option value="direct">Direkt zwischen Personen</option>
			{#each data.groups as g (g.id)}
				<option value="group:{g.id}">Gruppe: {g.name}</option>
			{/each}
		</select>
	</label>

	<label class="field">
		Bezahlt von
		<select name="payer" bind:value={payer}>
			{#each people as p (p.id)}
				<option value={p.id}>{p.name}</option>
			{/each}
		</select>
	</label>

	<fieldset class="stack">
		<legend class="muted">Aufteilen auf</legend>
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
				<input type="radio" name="mode" value="equal" bind:group={mode} /> Gleich
			</label>
			<label class="chip">
				<input type="radio" name="mode" value="exact" bind:group={mode} /> Genaue Beträge
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

	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<button class="btn primary block">Speichern</button>
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
