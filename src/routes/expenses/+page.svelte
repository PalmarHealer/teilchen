<script lang="ts">
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data } = $props();
	const i = useI18n();
</script>

<Header title={i.t('expenses.title')}>
	{#snippet actions()}
		<Button href="/expenses/new" size="sm"
			><Icon name="plus" size={16} /> {i.t('expenses.new')}</Button
		>
	{/snippet}
</Header>

{#if data.expenses.length}
	<List.Root>
		{#each data.expenses as e (e.id)}
			<ExpenseRow expense={e} me={data.user!.id} />
		{/each}
	</List.Root>
{:else}
	<Card.Root>
		<Card.Content class="text-muted-foreground text-sm">{i.t('expenses.empty')}</Card.Content>
	</Card.Root>
{/if}
