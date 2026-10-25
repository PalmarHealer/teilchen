<script lang="ts">
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';

	let { data } = $props();
</script>

<Header title="Ausgaben">
	{#snippet actions()}
		<a class="btn primary" href="/ausgaben/neu" aria-label="Neue Ausgabe"><Icon name="plus" /></a>
	{/snippet}
</Header>

{#if data.expenses.length}
	<ul class="list">
		{#each data.expenses as e (e.id)}
			<li><ExpenseRow expense={e} me={data.user!.id} /></li>
		{/each}
	</ul>
{:else}
	<p class="card muted">Noch keine Ausgaben.</p>
{/if}
