<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import FilePicker from '#lib/components/FilePicker.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import InviteBox from '#lib/components/InviteBox.svelte';
	import Select from '#lib/components/Select.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
	let copied = $state(false);
	let langForm: HTMLFormElement;
	// svelte-ignore state_referenced_locally
	let lang = $state<'auto' | 'en' | 'de'>(data.langPref);

	async function submitLanguage() {
		await tick(); // let the hidden input pick up the new value first
		langForm.requestSubmit();
	}

	async function copyInbox() {
		if (!data.inboxAddress) return;
		await navigator.clipboard.writeText(data.inboxAddress);
		copied = true;
	}
</script>

<Header title={i.t('settings.title')} />

<div class="stack">
	<section class="card row">
		<Avatar name={data.user!.name} src={data.user!.avatarUrl} size={56} />
		<span class="grow">
			<strong>{data.user!.name}</strong>
			<small class="muted">{data.email}</small>
		</span>
	</section>

	<form
		method="POST"
		action="?/language"
		bind:this={langForm}
		use:enhance={() =>
			async ({ update }) => {
				await update({ reset: false });
				await invalidateAll();
			}}
	>
		<Select
			name="lang"
			bind:value={lang}
			label={i.t('settings.language')}
			onchange={submitLanguage}
			options={[
				{ value: 'auto', label: i.t('settings.languageAuto'), icon: 'sparkles' },
				{ value: 'en', label: 'English' },
				{ value: 'de', label: 'Deutsch' }
			]}
		/>
	</form>

	<h2 class="section-title">{i.t('settings.inviteHeading')}</h2>
	<p class="muted hint">{i.t('settings.inviteHint')}</p>
	<form method="POST" action="?/invite" use:enhance>
		<button class="btn block"><Icon name="userPlus" /> {i.t('settings.createInvite')}</button>
	</form>
	{#if form?.inviteUrl}
		<InviteBox url={form.inviteUrl} text={i.t('invite.text')} />
	{/if}

	<h2 class="section-title">{i.t('settings.ebonHeading')}</h2>
	<section class="card stack">
		{#if data.inboxAddress}
			<p>{i.t('settings.ebonText')}</p>
			<code class="sender">ebon@mailing.rewe.de</code>
			<button class="btn" onclick={copyInbox}>
				<Icon name="mail" /> <span class="addr">{data.inboxAddress}</span>
			</button>
			{#if copied}<small class="muted">{i.t('common.copied')}</small>{/if}
			<small class="muted">{i.t('settings.ebonFromHint', { email: data.email })}</small>
		{:else}
			<p class="muted">{i.t('settings.noInbox')}</p>
		{/if}
	</section>

	<h2 class="section-title">{i.t('settings.uploadHeading')}</h2>
	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance
		class="card stack"
	>
		<FilePicker
			name="pdf"
			accept="application/pdf"
			multiple
			label={i.t('settings.choosePdf')}
			emptyText={i.t('settings.noFileChosen')}
		/>
		<button class="btn"><Icon name="upload" /> {i.t('settings.import')}</button>
		{#if form?.imported}<small class="plus">{i.t('settings.imported', { n: form.imported })}</small
			>{/if}
		{#if form?.uploadError}<small class="error">{i.t(form.uploadError)}</small>{/if}
	</form>

	<form method="POST" action="/auth/logout">
		<button class="btn block"><Icon name="logout" /> {i.t('settings.logout')}</button>
	</form>
</div>

<style>
	.hint {
		font-size: 0.9rem;
		margin: -4px 4px 0;
	}
	.grow {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	p {
		margin: 0;
	}
	.sender {
		align-self: flex-start;
		padding: 4px 10px;
		border-radius: 8px;
		background: var(--surface-2);
		font-size: 0.85em;
	}
	.addr {
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
