<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';

	let { data, form } = $props();
	const first = $derived(data.person.name.split(' ')[0]);
	const iPay = $derived(data.net < 0);
</script>

<Header title={data.person.name} back="/" />

<div class="stack">
	<section class="card center">
		<Avatar name={data.person.name} src={data.person.avatarUrl} size={72} />
		{#if data.net === 0}
			<p class="muted">Ihr seid quitt.</p>
		{:else}
			<p class="muted">{iPay ? `Du schuldest ${first}` : `${first} schuldet dir`}</p>
			<strong class="big {iPay ? 'minus' : 'plus'}"><Amount cents={Math.abs(data.net)} /></strong>
		{/if}
	</section>

	{#if data.contexts.length > 1}
		<h2 class="section-title">Gegengerechnet aus</h2>
		<ul class="list">
			{#each data.contexts as c (c.label)}
				<li class="item">
					<Icon name={c.icon} size={20} />
					<span class="grow">{c.label}</span>
					<Amount cents={c.cents} signed />
				</li>
			{/each}
			<li class="item total">
				<span class="grow">Netto</span>
				<Amount cents={data.net} signed />
			</li>
		</ul>
		<p class="muted hint">
			Statt in jeder Gruppe einzeln abzurechnen, gibt es eine einzige Zahlung. Die Gruppen werden
			dabei automatisch mit ausgeglichen.
		</p>
	{/if}

	{#if data.plan.lines.length}
		<form method="POST" action="?/settle" use:enhance>
			<button class="btn primary block">
				<Icon name="check" />
				{#if data.plan.transfer}
					{iPay ? 'Ich habe' : `${first} hat`}
					<Amount cents={data.plan.transfer.cents} /> bezahlt
				{:else}
					Gegenseitig verrechnen
				{/if}
			</button>
		</form>
	{/if}
	{#if form?.settled !== undefined}
		<p class="card row ok"><Icon name="done" /> Ausgeglichen.</p>
	{/if}

	<a class="btn" href="/ausgaben/neu?person={data.person.id}"
		><Icon name="plus" /> Ausgabe mit {first}</a
	>
</div>

<style>
	.center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		text-align: center;
	}
	.center p {
		margin: 8px 0 0;
	}
	.big {
		font-size: 2.2rem;
	}
	.grow {
		flex: 1;
	}
	.ok {
		color: var(--plus);
	}
	.total {
		font-weight: 700;
	}
	.hint {
		font-size: 0.85rem;
		margin: 0 4px;
	}
</style>
