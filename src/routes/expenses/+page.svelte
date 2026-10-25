<script lang="ts">
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data } = $props();
	const i = useI18n();
</script>

<Header title={i.t('expenses.title')}>
	{#snippet actions()}
		<a class="btn primary" href="/expenses/new" aria-label={i.t('expenses.new')}
			><Icon name="plus" /></a
		>
	{/snippet}
</Header>

{#if data.expenses.length}
	<ul class="list">
		{#each data.expenses as e (e.id)}
			<li><ExpenseRow expense={e} me={data.user!.id} /></li>
		{/each}
	</ul>
{:else}
	<p class="card muted">{i.t('expenses.empty')}</p>
{/if}
