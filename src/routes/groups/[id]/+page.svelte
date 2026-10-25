<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import ConfirmAction from '#lib/components/ConfirmAction.svelte';
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import GroupIconPicker from '#lib/components/GroupIconPicker.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import InviteBox from '#lib/components/InviteBox.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
	let managing = $state(false);
	// svelte-ignore state_referenced_locally
	let icon = $state(data.group.icon);
</script>

<Header title={data.group.name} back="/groups">
	{#snippet actions()}
		<button
			class="icon-btn"
			aria-label={i.t('groups.manage')}
			aria-expanded={managing}
			onclick={() => (managing = !managing)}><Icon name="settings" /></button
		>
	{/snippet}
</Header>

<div class="stack">
	<section class="hero">
		<GroupIcon icon={data.group.icon} size={56} />
		<span class="muted">{i.t('groups.memberCount', { n: data.members.length })}</span>
	</section>
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

	{#if managing || form?.manageError || form?.updated}
		<section class="card stack manage">
			<h2 class="row"><Icon name="settings" /> {i.t('groups.manage')}</h2>
			<form
				method="POST"
				action="?/update"
				use:enhance={() =>
					async ({ update }) =>
						update({ reset: false })}
				class="stack"
			>
				<label class="field">
					{i.t('groups.name')}
					<input name="name" value={data.group.name} required maxlength="60" />
				</label>
				<GroupIconPicker bind:value={icon} legend={i.t('groups.icon')} />
				<button class="btn primary"><Icon name="edit" size={18} /> {i.t('groups.save')}</button>
				{#if form?.updated}<small class="plus">{i.t('groups.saved')}</small>{/if}
			</form>
			<ConfirmAction
				action="?/leave"
				icon="leave"
				label={i.t('groups.leave')}
				question={i.t('groups.leaveConfirm')}
				confirmLabel={i.t('groups.confirm')}
				cancelLabel={i.t('groups.cancel')}
			/>
			{#if data.isCreator}
				<ConfirmAction
					action="?/delete"
					icon="trash"
					danger
					disabled={!data.settled}
					label={i.t('groups.delete')}
					question={i.t('groups.deleteConfirm')}
					confirmLabel={i.t('groups.confirm')}
					cancelLabel={i.t('groups.cancel')}
				/>
				{#if !data.settled}<small class="muted">{i.t('groups.deleteNeedsSettled')}</small>{/if}
			{/if}
			{#if form?.manageError}<p class="error">{i.t(form.manageError)}</p>{/if}
		</section>
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
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 4px 0 8px;
	}
	.icon-btn {
		all: unset;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		cursor: pointer;
		color: var(--muted);
	}
	.icon-btn:hover,
	.icon-btn:focus-visible,
	.icon-btn[aria-expanded='true'] {
		background: var(--surface-2);
		color: var(--ink);
	}
	.manage h2 {
		gap: 8px;
	}
	.hint {
		font-size: 0.85rem;
		margin: 0 4px;
	}
</style>
