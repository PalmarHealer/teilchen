<script lang="ts">
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import Icon from '#lib/components/Icon.svelte';

	let { data } = $props();
	const total = $derived(data.owedToMe - data.iOwe);
</script>

<div class="stack">
	<p class="muted hello">Hallo {data.user?.name.split(' ')[0]}</p>

	<section class="card total">
		<span class="muted">Insgesamt</span>
		<strong class="big"><Amount cents={total} signed /></strong>
		<div class="row split">
			<span>Du bekommst <Amount cents={data.owedToMe} /></span>
			<span>Du schuldest <Amount cents={data.iOwe} /></span>
		</div>
	</section>

	{#if data.openReceipts > 0}
		<a class="card cta" href="/swipe">
			<Icon name="swipe" size={28} />
			<span>
				<strong>{data.openReceipts} Einkauf{data.openReceipts === 1 ? '' : 'e'} zum Swipen</strong>
				<span class="muted">Teile deine REWE-Bons in Sekunden auf</span>
			</span>
		</a>
	{/if}

	<h2 class="section-title">Personen</h2>
	{#if data.people.length}
		<ul class="list">
			{#each data.people as p (p.user.id)}
				<li>
					<a href="/personen/{p.user.id}">
						<Avatar name={p.user.name} src={p.user.avatarUrl} />
						<span class="grow">
							{p.user.name}
							{#if p.contexts > 1}
								<small class="muted">· {p.contexts} Bereiche verrechnet</small>
							{/if}
						</span>
						<span class="right">
							<small class="muted">{p.net > 0 ? 'schuldet dir' : 'du schuldest'}</small>
							<Amount cents={Math.abs(p.net)} />
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="card muted">Alles ausgeglichen. Leg los mit einer Ausgabe oder einem Einkauf.</p>
	{/if}

	<a class="btn primary" href="/ausgaben/neu"><Icon name="plus" /> Ausgabe hinzufügen</a>

	{#if data.recent.length}
		<h2 class="section-title">Zuletzt</h2>
		<ul class="list">
			{#each data.recent as e (e.id)}
				<li><ExpenseRow expense={e} me={data.user!.id} /></li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.hello {
		margin: 0;
	}
	.total {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.big {
		font-size: 2.4rem;
		letter-spacing: -0.02em;
	}
	.split {
		justify-content: space-between;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.cta {
		display: flex;
		gap: 14px;
		align-items: center;
		text-decoration: none;
		border-color: var(--accent);
		color: var(--accent);
	}
	.cta span {
		display: flex;
		flex-direction: column;
		color: var(--ink);
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	.right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-weight: 600;
	}
</style>
