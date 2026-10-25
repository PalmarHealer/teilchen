<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { SectionTitle } from '#lib/components/ui/section/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
	const first = $derived(data.person.name.split(' ')[0] ?? data.person.name);
	const iPay = $derived(data.net < 0);
</script>

<Header title={data.person.name} back="/" />

<div class="flex flex-col gap-4">
	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-1 text-center">
			<Avatar name={data.person.name} src={data.person.avatarUrl} size={64} />
			{#if data.net === 0}
				<p class="text-muted-foreground mt-2 text-sm">{i.t('person.settled')}</p>
			{:else}
				<p class="text-muted-foreground mt-2 text-sm">
					{iPay ? i.t('person.youOwe', { name: first }) : i.t('person.owesYou', { name: first })}
				</p>
				<Amount
					cents={Math.abs(data.net)}
					class="text-4xl font-semibold tracking-tight {iPay
						? 'text-destructive'
						: 'text-positive'}"
				/>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if data.contexts.length > 1}
		<SectionTitle>{i.t('person.nettedFrom')}</SectionTitle>
		<List.Root>
			{#each data.contexts as c (c.key)}
				<List.Item class="text-sm">
					<span class="text-muted-foreground"><Icon name={c.icon} size={18} /></span>
					<span class="flex-1">{c.label ?? i.t('common.direct')}</span>
					<Amount cents={c.cents} signed />
				</List.Item>
			{/each}
			<List.Item class="bg-muted/40 text-sm font-semibold">
				<span class="flex-1">{i.t('person.net')}</span>
				<Amount cents={data.net} signed />
			</List.Item>
		</List.Root>
		<p class="text-muted-foreground px-1 text-xs">{i.t('person.hint')}</p>
	{/if}

	{#if data.keptGroups.length}
		<SectionTitle>{i.t('person.keptGroups')}</SectionTitle>
		<List.Root>
			{#each data.keptGroups as g (g.id)}
				<List.Item href="/groups/{g.id}" class="text-sm">
					<GroupIcon icon={g.icon} size={28} />
					<span class="flex-1">{g.name}</span>
					<Amount cents={g.cents} signed />
				</List.Item>
			{/each}
		</List.Root>
		<p class="text-muted-foreground px-1 text-xs">{i.t('person.keptHint')}</p>
	{/if}

	{#if data.plan.lines.length}
		<form method="POST" action="?/settle" use:enhance>
			<Button type="submit" size="lg" class="w-full">
				<Icon name="check" size={18} />
				{#if data.plan.transfer}
					{@const amount = i.money(data.plan.transfer.cents)}
					{iPay ? i.t('person.iPaid', { amount }) : i.t('person.theyPaid', { name: first, amount })}
				{:else}
					{i.t('person.netOut')}
				{/if}
			</Button>
		</form>
	{/if}
	{#if form?.settled !== undefined}
		<p
			class="border-positive/30 bg-positive/10 text-positive flex items-center gap-2 rounded-lg border p-3 text-sm font-medium"
		>
			<Icon name="done" size={18} />
			{i.t('person.done')}
		</p>
	{/if}
	{#if form?.message}<p class="text-destructive text-sm">{i.t(form.message)}</p>{/if}

	<Button href="/expenses/new?person={data.person.id}" variant="outline"
		><Icon name="plus" size={16} /> {i.t('person.expenseWith', { name: first })}</Button
	>
</div>
