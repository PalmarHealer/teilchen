<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import InviteBox from '#lib/components/InviteBox.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
</script>

<Header title={data.group.name} back="/groups" />

<div class="stack">
	<h2 class="section-title">{i.t('groups.members')}</h2>
	<ul class="list">
		{#each data.members as m (m.id)}
			<li>
				<a href={m.withMe === null ? '/settings' : `/people/${m.id}`}>
					<Avatar name={m.name} src={m.avatarUrl} size={36} />
					<span class="grow">
						{m.withMe === null ? i.t('common.youSuffix', { name: m.name }) : m.name}
						{#if m.withMe}
							<small class="muted"
								>· {m.withMe > 0 ? i.t('overview.owesYou') : i.t('overview.youOweShort')}
								<Amount cents={Math.abs(m.withMe)} /></small
							>
						{/if}
					</span>
					<Amount cents={m.balance} signed />
				</a>
			</li>
		{/each}
	</ul>
	<p class="muted hint">{i.t('groups.hint')}</p>

	<div class="row">
		<a class="btn primary grow" href="/expenses/new?group={data.group.id}"
			><Icon name="plus" /> {i.t('groups.expense')}</a
		>
		<form method="POST" action="?/invite" use:enhance class="grow">
			<button class="btn block"><Icon name="userPlus" /> {i.t('groups.invite')}</button>
		</form>
	</div>
	{#if form?.inviteUrl}
		<InviteBox url={form.inviteUrl} text={i.t('groups.inviteText', { name: data.group.name })} />
	{/if}

	{#if data.expenses.length}
		<h2 class="section-title">{i.t('groups.history')}</h2>
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
