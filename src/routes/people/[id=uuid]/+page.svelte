<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { SectionTitle } from '#lib/components/ui/section/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { withToast } from '#lib/toast.ts';
	import { centsToInput, parseCents } from '#lib/money.ts';

	let { data } = $props();
	const i = useI18n();
	const first = $derived(data.person.name.split(' ')[0] ?? data.person.name);
	const iPay = $derived(data.net < 0);
	// What the amount field says, if edited; the label and hint follow it.
	let typed = $state<string | null>(null);
	const paying = $derived.by(() => {
		const t = data.plan.transfer;
		if (!t) return null;
		const c = typed === null ? t.cents : parseCents(typed);
		return c !== null && c > 0 ? Math.min(c, t.cents) : null;
	});
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

	{#if data.contact === 'incoming'}
		<form
			method="POST"
			action="?/acceptContact"
			use:enhance={withToast(i.t, { success: () => i.t('person.connected') })}
			class="border-primary/30 bg-primary/8 flex items-center gap-3 rounded-xl border p-3"
		>
			<span class="flex-1 text-sm">{i.t('person.incoming', { name: first })}</span>
			<Button type="submit" size="sm"><Icon name="check" size={14} /> {i.t('person.accept')}</Button
			>
		</form>
	{:else if data.contact === 'none'}
		<form
			method="POST"
			action="?/requestContact"
			use:enhance={withToast(i.t, {
				success: (d) =>
					d?.contact === 'connected' ? i.t('person.connected') : i.t('person.requestSent')
			})}
		>
			<Button type="submit" variant="outline" class="w-full"
				><Icon name="userPlus" size={16} /> {i.t('person.requestContact')}</Button
			>
		</form>
	{:else if data.contact === 'requested'}
		<p class="text-muted-foreground flex items-center justify-center gap-2 text-sm">
			<Icon name="clock" size={16} />
			{i.t('person.requested')}
		</p>
	{/if}

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
		<form
			method="POST"
			action="?/settle"
			use:enhance={withToast(i.t, {
				done: () => (typed = null),
				// After the reload, a zero balance means everything is settled.
				success: () => (data.net === 0 ? i.t('person.done') : i.t('person.paid'))
			})}
			class="flex flex-col gap-3"
		>
			{#if data.plan.transfer}
				<Label>
					{i.t('person.amount')}
					<Input
						name="amount"
						inputmode="decimal"
						value={centsToInput(data.plan.transfer.cents, i.locale === 'de' ? ',' : '.')}
						oninput={(e) => (typed = e.currentTarget.value)}
						class="tabular text-lg font-semibold md:text-lg"
					/>
				</Label>
				{#if paying !== null && paying < data.plan.transfer.cents}
					<p class="text-muted-foreground -mt-1 px-1 text-xs">
						{i.t('person.partialHint', { rest: i.money(data.plan.transfer.cents - paying) })}
					</p>
				{/if}
			{/if}
			<Button type="submit" size="lg" class="w-full">
				<Icon name="check" size={18} />
				{#if data.plan.transfer}
					{@const amount = i.money(paying ?? data.plan.transfer.cents)}
					{iPay ? i.t('person.iPaid', { amount }) : i.t('person.theyPaid', { name: first, amount })}
				{:else}
					{i.t('person.netOut')}
				{/if}
			</Button>
		</form>
	{/if}

	<!-- Direct expenses only work between contacts -->
	{#if data.contact === 'contact'}
		<Button href="/expenses/new?person={data.person.id}" variant="outline"
			><Icon name="plus" size={16} /> {i.t('person.expenseWith', { name: first })}</Button
		>
	{/if}
</div>
