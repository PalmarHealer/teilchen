<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Avatar from '#lib/components/Avatar.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import InviteBox from '#lib/components/InviteBox.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
	let copied = $state(false);
	let langForm: HTMLFormElement;

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
		<label class="field">
			{i.t('settings.language')}
			<select name="lang" value={data.langPref} onchange={() => langForm.requestSubmit()}>
				<option value="auto">{i.t('settings.languageAuto')}</option>
				<option value="en">English</option>
				<option value="de">Deutsch</option>
			</select>
		</label>
	</form>

	<h2 class="section-title">{i.t('settings.inviteHeading')}</h2>
	<form method="POST" action="?/invite" use:enhance>
		<button class="btn block"><Icon name="userPlus" /> {i.t('settings.createInvite')}</button>
	</form>
	{#if form?.inviteUrl}
		<InviteBox url={form.inviteUrl} text={i.t('invite.text')} />
	{/if}

	<h2 class="section-title">{i.t('settings.ebonHeading')}</h2>
	<section class="card stack">
		{#if data.inboxAddress}
			<p>{i.t('settings.ebonText')} <code>ebon@mailing.rewe.de</code>.</p>
			<button class="btn" onclick={copyInbox}>
				<Icon name="mail" /> <span class="addr">{data.inboxAddress}</span>
			</button>
			{#if copied}<small class="muted">{i.t('common.copied')}</small>{/if}
			<small class="muted">{i.t('settings.ebonFromHint', { email: data.email })}</small>
		{:else}
			<p class="muted">{i.t('settings.noInbox')}</p>
		{/if}
	</section>

	<!-- Without the app certificate the REWE API cannot work, so the section is hidden. -->
	{#if data.reweAvailable || data.rewe}
		<h2 class="section-title">{i.t('settings.reweHeading')}</h2>
		<section class="card stack">
			{#if data.rewe}
				<p class="row connected">
					<Icon name="done" />
					{i.t('settings.connected')}
					{data.rewe.lastSyncAt
						? i.t('settings.lastSync', {
								date: i.date(data.rewe.lastSyncAt, { dateStyle: 'medium', timeStyle: 'short' })
							})
						: i.t('settings.firstSync')}
				</p>
				{#if data.rewe.lastError}<p class="error">{data.rewe.lastError}</p>{/if}
				<form method="POST" action="?/reweDisconnect" use:enhance>
					<button class="btn block">{i.t('settings.disconnect')}</button>
				</form>
			{:else if form?.reweAuthUrl}
				<p class="muted">{i.t('settings.reweDesktopOnly')}</p>
				<ol>
					<li>
						<a href={form.reweAuthUrl} target="_blank" rel="noreferrer"
							>{i.t('settings.reweStep1')}</a
						>
						{i.t('settings.reweStep1Hint')}
					</li>
					<li>{i.t('settings.reweStep0')}</li>
					<li>{i.t('settings.reweStep2', { prefix: 'de.rewe.app://redirect?code=' })}</li>
					<li>{i.t('settings.reweStep3')}</li>
				</ol>
				<form method="POST" action="?/reweFinish" use:enhance class="stack">
					<input name="redirect" placeholder="de.rewe.app://redirect?code=…" required />
					<button class="btn primary">{i.t('settings.connect')}</button>
				</form>
			{:else}
				<p class="muted">{i.t('settings.reweIntro')}</p>
				<form method="POST" action="?/reweStart" use:enhance>
					<button class="btn block">{i.t('settings.reweConnect')}</button>
				</form>
			{/if}
			{#if form?.reweError}<p class="error">{i.t(form.reweError)}</p>{/if}
		</section>
	{/if}

	<h2 class="section-title">{i.t('settings.uploadHeading')}</h2>
	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance
		class="card stack"
	>
		<input type="file" name="pdf" accept="application/pdf" multiple required />
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
	.grow {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	p {
		margin: 0;
	}
	.connected {
		gap: 8px;
		color: var(--plus);
		flex-wrap: wrap;
	}
	ol {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	code {
		font-size: 0.85em;
		word-break: break-all;
	}
	.addr {
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
