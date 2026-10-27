<script lang="ts">
	import Amount from '#lib/components/Amount.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { SectionTitle } from '#lib/components/ui/section/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data } = $props();
	const i = useI18n();
	const fmt = (d: Date) => i.date(d, { weekday: 'short', day: '2-digit', month: 'short' });
</script>

<Header title={i.t('swipe.title')} />

{#snippet row(r: (typeof data.open)[number], sub: string)}
	<List.Item href="/swipe/{r.id}">
		<GroupIcon icon="receipt" size={40} />
		<span class="flex min-w-0 flex-1 flex-col">
			<span class="text-sm font-medium">{fmt(r.purchasedAt)}</span>
			<span class="text-muted-foreground truncate text-xs"
				>{sub} · {i.t('swipe.items', { n: r.items })}</span
			>
		</span>
		<Amount cents={r.totalCents} class="text-sm font-semibold" />
		<span class="text-muted-foreground"><Icon name="chevronRight" size={16} /></span>
	</List.Item>
{/snippet}

{#if data.open.length || data.theirs.length}
	<div class="flex flex-col gap-4">
		{#if data.open.length}
			<List.Root>
				{#each data.open as r (r.id)}
					{@render row(r, r.market ?? 'REWE')}
				{/each}
			</List.Root>
		{/if}
		{#if data.theirs.length}
			<SectionTitle>{i.t('swipe.swipeToo')}</SectionTitle>
			<p class="text-muted-foreground -mt-2 px-1 text-xs">{i.t('swipe.swipeTooHint')}</p>
			<List.Root>
				{#each data.theirs as r (r.id)}
					{@render row(r, i.t('swipe.paidBy', { name: r.payerName }))}
				{/each}
			</List.Root>
		{/if}
	</div>
{:else}
	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-3 py-4 text-center">
			<GroupIcon icon="party" size={56} />
			<h2 class="font-semibold">{i.t('swipe.emptyTitle')}</h2>
			<p class="text-muted-foreground max-w-[32ch] text-sm">{i.t('swipe.emptyText')}</p>
			<Button href="/settings" variant="outline" class="mt-1"
				><Icon name="mail" size={16} /> {i.t('swipe.setupImport')}</Button
			>
		</Card.Content>
	</Card.Root>
{/if}
