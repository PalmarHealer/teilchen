<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import IconPicker from '#lib/components/IconPicker.svelte';
	import { GROUP_ICON_SUGGESTIONS } from '#lib/icon-suggestions.ts';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
	let icon = $state('home');
</script>

<Header title={i.t('groups.title')} />

<div class="stack">
	{#if data.groups.length}
		<ul class="list groups">
			{#each data.groups as g (g.id)}
				<li>
					<a href="/groups/{g.id}">
						<GroupIcon icon={g.icon} size={46} />
						<span class="main">
							<span class="name">{g.name}</span>
							<span class="meta">
								{#if g.preview.length}
									<span class="faces">
										{#each g.preview as p (p.id)}<Avatar
												name={p.name}
												src={p.avatarUrl}
												size={20}
											/>{/each}
									</span>
								{/if}
								<small class="muted">{i.t('groups.memberCount', { n: g.memberCount })}</small>
							</span>
						</span>
						<span class="balance">
							{#if g.myBalance === 0}
								<small class="muted settled"
									><Icon name="check" size={14} /> {i.t('groups.settledUp')}</small
								>
							{:else}
								<strong><Amount cents={g.myBalance} signed /></strong>
								<small class="muted">{i.t('groups.yourBalance')}</small>
							{/if}
						</span>
						<span class="chev"><Icon name="chevronRight" size={18} /></span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<section class="empty">
			<span class="hero"><Icon name="users" size={36} /></span>
			<h2>{i.t('groups.emptyTitle')}</h2>
			<p class="muted">{i.t('groups.emptyText')}</p>
		</section>
	{/if}

	<form method="POST" action="?/create" use:enhance class="card stack create">
		<h2 class="row"><Icon name="plus" /> {i.t('groups.newGroup')}</h2>
		<input name="name" placeholder={i.t('groups.namePlaceholder')} required maxlength="60" />
		<IconPicker
			bind:value={icon}
			suggestions={GROUP_ICON_SUGGESTIONS}
			legend={i.t('groups.icon')}
		/>
		{#if form?.message}<p class="error">{i.t(form.message)}</p>{/if}
		<button class="btn primary"><Icon name="sparkles" /> {i.t('groups.create')}</button>
	</form>
</div>

<style>
	.groups a {
		gap: 14px;
		padding: 14px 16px;
	}
	.main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.name {
		font-weight: 700;
		font-size: 1.05rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.faces {
		display: flex;
	}
	.faces :global(> *:not(:first-child)) {
		margin-left: -6px;
	}
	.faces :global(> *) {
		box-shadow: 0 0 0 2px var(--surface);
		border-radius: 50%;
	}
	.balance {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-align: right;
	}
	.settled {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.chev {
		display: grid;
		color: var(--muted);
	}
	.empty {
		text-align: center;
		padding: 24px 8px 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.empty p {
		margin: 0;
		max-width: 32ch;
	}
	.hero {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		border-radius: 24px;
		background: color-mix(in srgb, var(--accent) 14%, var(--surface));
		color: var(--accent);
	}
	.create h2 {
		gap: 8px;
	}
</style>
