<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import InviteBox from '#lib/components/InviteBox.svelte';

	let { data, form } = $props();
</script>

<Header title={data.group.name} back="/gruppen" />

<div class="stack">
	<h2 class="section-title">Mitglieder</h2>
	<ul class="list">
		{#each data.members as m (m.id)}
			<li>
				<a href={m.withMe === null ? '/einstellungen' : `/personen/${m.id}`}>
					<Avatar name={m.name} src={m.avatarUrl} size={36} />
					<span class="grow">
						{m.name}{m.withMe === null ? ' (du)' : ''}
						{#if m.withMe}
							<small class="muted"
								>· {m.withMe > 0 ? 'schuldet dir' : 'du schuldest'}
								<Amount cents={Math.abs(m.withMe)} /></small
							>
						{/if}
					</span>
					<Amount cents={m.balance} signed />
				</a>
			</li>
		{/each}
	</ul>
	<p class="muted hint">
		Abgerechnet wird pro Person, nicht pro Gruppe: Auf der Personenseite wird alles, was ihr
		untereinander offen habt, gegengerechnet.
	</p>

	<div class="row">
		<a class="btn primary grow" href="/ausgaben/neu?group={data.group.id}"
			><Icon name="plus" /> Ausgabe</a
		>
		<form method="POST" action="?/invite" use:enhance class="grow">
			<button class="btn block"><Icon name="user" /> Einladen</button>
		</form>
	</div>
	{#if form?.inviteUrl}
		<InviteBox url={form.inviteUrl} text="Komm in die Gruppe {data.group.name} auf Teilchen" />
	{/if}

	{#if data.expenses.length}
		<h2 class="section-title">Verlauf</h2>
		<ul class="list">
			{#each data.expenses as e (e.id)}
				<li><ExpenseRow expense={e} me={data.user!.id} /></li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.grow {
		flex: 1;
		min-width: 0;
	}
	.hint {
		font-size: 0.85rem;
		margin: 0 4px;
	}
</style>
