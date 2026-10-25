<script lang="ts">
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { SectionTitle } from '#lib/components/ui/section/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data } = $props();
	const i = useI18n();
	const total = $derived(data.owedToMe - data.iOwe);
</script>

<div class="flex flex-col gap-4">
	<p class="text-muted-foreground pt-1 text-sm">
		{i.t('overview.hello', { name: data.user?.name.split(' ')[0] ?? '' })}
	</p>

	<Card.Root class="gap-0">
		<Card.Content class="flex flex-col gap-1">
			<span class="text-muted-foreground text-sm">{i.t('overview.total')}</span>
			<Amount cents={total} signed class="text-4xl font-semibold tracking-tight" />
			<div class="text-muted-foreground mt-3 grid grid-cols-2 border-t pt-3 text-sm">
				<span>
					{i.t('overview.youGet')}
					<Amount cents={data.owedToMe} class="text-foreground font-medium" />
				</span>
				<span class="text-right">
					{i.t('overview.youOwe')}
					<Amount cents={data.iOwe} class="text-foreground font-medium" />
				</span>
			</div>
		</Card.Content>
	</Card.Root>

	{#if data.openReceipts > 0}
		<a
			href="/swipe"
			class="border-primary/30 bg-primary/8 hover:bg-primary/12 flex items-center gap-3 rounded-xl border p-4 transition-colors"
		>
			<span class="bg-primary text-primary-foreground grid size-10 place-items-center rounded-md">
				<Icon name="swipe" size={20} />
			</span>
			<span class="flex min-w-0 flex-1 flex-col">
				<span class="text-sm font-semibold"
					>{i.t('overview.openReceipts', { n: data.openReceipts })}</span
				>
				<span class="text-muted-foreground text-xs">{i.t('overview.openReceiptsHint')}</span>
			</span>
			<span class="text-muted-foreground"><Icon name="chevronRight" size={18} /></span>
		</a>
	{/if}

	<SectionTitle>{i.t('overview.people')}</SectionTitle>
	{#if data.people.length}
		<List.Root>
			{#each data.people as p (p.user.id)}
				<List.Item href="/people/{p.user.id}">
					<Avatar name={p.user.name} src={p.user.avatarUrl} size={36} />
					<span class="flex min-w-0 flex-1 flex-col">
						<span class="truncate text-sm font-medium">{p.user.name}</span>
						{#if p.contexts > 1}
							<span class="text-muted-foreground text-xs"
								>{i.t('overview.contextsNetted', { n: p.contexts })}</span
							>
						{/if}
					</span>
					<span class="flex flex-col items-end">
						<span class="text-muted-foreground text-xs"
							>{p.net > 0 ? i.t('overview.owesYou') : i.t('overview.youOweShort')}</span
						>
						<Amount
							cents={Math.abs(p.net)}
							class={p.net > 0 ? 'text-positive font-semibold' : 'text-destructive font-semibold'}
						/>
					</span>
				</List.Item>
			{/each}
		</List.Root>
	{:else}
		<Card.Root>
			<Card.Content class="text-muted-foreground text-sm">{i.t('overview.allSettled')}</Card.Content
			>
		</Card.Root>
	{/if}

	<Button href="/expenses/new" size="lg"
		><Icon name="plus" size={18} /> {i.t('overview.addExpense')}</Button
	>

	{#if data.recent.length}
		<SectionTitle>{i.t('overview.recent')}</SectionTitle>
		<List.Root>
			{#each data.recent as e (e.id)}
				<ExpenseRow expense={e} me={data.user!.id} />
			{/each}
		</List.Root>
	{/if}
</div>
