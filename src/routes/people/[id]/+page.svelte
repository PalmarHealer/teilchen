<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
	const first = $derived(data.person.name.split(' ')[0] ?? data.person.name);
	const iPay = $derived(data.net < 0);
</script>

<Header title={data.person.name} back="/" />

<div class="stack">
	<section class="card center">
		<Avatar name={data.person.name} src={data.person.avatarUrl} size={72} />
		{#if data.net === 0}
			<p class="muted">{i.t('person.settled')}</p>
		{:else}
			<p class="muted">
				{iPay ? i.t('person.youOwe', { name: first }) : i.t('person.owesYou', { name: first })}
			</p>
			<strong class="big {iPay ? 'minus' : 'plus'}"><Amount cents={Math.abs(data.net)} /></strong>
		{/if}
	</section>

	{#if data.contexts.length > 1}
		<h2 class="section-title">{i.t('person.nettedFrom')}</h2>
		<ul class="list">
			{#each data.contexts as c (c.key)}
				<li class="item">
					<Icon name={c.icon} size={20} />
					<span class="grow">{c.label ?? i.t('common.direct')}</span>
					<Amount cents={c.cents} signed />
				</li>
			{/each}
			<li class="item total">
				<span class="grow">{i.t('person.net')}</span>
				<Amount cents={data.net} signed />
			</li>
		</ul>
		<p class="muted hint">{i.t('person.hint')}</p>
	{/if}

	{#if data.plan.lines.length}
		<form method="POST" action="?/settle" use:enhance>
			<button class="btn primary block">
				<Icon name="check" />
				{#if data.plan.transfer}
					{@const amount = i.money(data.plan.transfer.cents)}
					{iPay ? i.t('person.iPaid', { amount }) : i.t('person.theyPaid', { name: first, amount })}
				{:else}
					{i.t('person.netOut')}
				{/if}
			</button>
		</form>
	{/if}
	{#if form?.settled !== undefined}
		<p class="card row ok"><Icon name="done" /> {i.t('person.done')}</p>
	{/if}
	{#if form?.message}<p class="error">{i.t(form.message)}</p>{/if}

	<a class="btn" href="/expenses/new?person={data.person.id}"
		><Icon name="plus" /> {i.t('person.expenseWith', { name: first })}</a
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
