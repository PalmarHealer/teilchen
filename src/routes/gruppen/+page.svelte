<script lang="ts">
	import { enhance } from '$app/forms';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { GROUP_ICONS } from '#lib/group-icons.ts';

	let { data, form } = $props();
	let icon = $state<string>('home');
</script>

<Header title="Gruppen" />

<div class="stack">
	{#if data.groups.length}
		<ul class="list">
			{#each data.groups as g (g.id)}
				<li>
					<a href="/gruppen/{g.id}"><GroupIcon icon={g.icon} size={36} />{g.name}</a>
				</li>
			{/each}
		</ul>
	{/if}

	<form method="POST" action="?/create" use:enhance class="card stack">
		<h2>Neue Gruppe</h2>
		<input name="name" placeholder="WG, Urlaub, Pärchen…" required maxlength="60" />
		<fieldset class="icons">
			<legend class="muted">Symbol</legend>
			{#each GROUP_ICONS as key (key)}
				<label class="pick" title={key}>
					<input type="radio" name="icon" value={key} bind:group={icon} />
					<Icon name={key} />
				</label>
			{/each}
		</fieldset>
		{#if form?.message}<p class="error">{form.message}</p>{/if}
		<button class="btn primary"><Icon name="plus" /> Erstellen</button>
	</form>
</div>

<style>
	.icons {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 8px;
	}
	legend {
		font-size: 0.9rem;
		margin-bottom: 6px;
	}
	.pick {
		position: relative;
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 12px;
		color: var(--muted);
		cursor: pointer;
	}
	.pick:has(input:checked) {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
	}
	.pick:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.pick input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
</style>
