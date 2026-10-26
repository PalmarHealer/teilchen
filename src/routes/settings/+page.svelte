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
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { toast, withToast } from '#lib/toast.ts';

	let { data, form } = $props();
	const i = useI18n();
	let langForm: HTMLFormElement;
	let uploadForm: HTMLFormElement;
	// svelte-ignore state_referenced_locally
	let lang = $state<'auto' | 'en' | 'de'>(data.langPref);

	async function submitLanguage() {
		await tick(); // let the hidden input pick up the new value first
		langForm.requestSubmit();
	}

	async function copyInbox() {
		if (!data.inboxAddress) return;
		await navigator.clipboard.writeText(data.inboxAddress);
		toast.success(i.t('common.copied'));
	}
</script>

<Header title={i.t('settings.title')} />

<div class="flex flex-col gap-4">
	<Card.Root>
		<Card.Content class="flex items-center gap-4">
			<Avatar name={data.user!.name} src={data.user!.avatarUrl} size={52} />
			<span class="flex min-w-0 flex-col">
				<span class="truncate font-semibold">{data.user!.name}</span>
				<span class="text-muted-foreground truncate text-sm">{data.email}</span>
			</span>
		</Card.Content>
	</Card.Root>

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

	<Card.Root>
		<Card.Header>
			<Card.Title>{i.t('settings.inviteHeading')}</Card.Title>
			<Card.Description>{i.t('settings.inviteHint')}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#if data.requests.length}
				<div class="flex flex-col gap-2">
					<span class="text-sm font-medium">{i.t('settings.requests')}</span>
					<List.Root>
						{#each data.requests as r (r.id)}
							<List.Item class="gap-2 py-2 pr-2">
								<Avatar name={r.name} src={r.avatarUrl} size={32} />
								<span class="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
								<form
									method="POST"
									action="?/declineContact"
									use:enhance={withToast(i.t, { success: () => i.t('settings.declined') })}
								>
									<input type="hidden" name="from" value={r.id} />
									<Button
										type="submit"
										variant="ghost"
										size="icon"
										class="text-muted-foreground size-8"
										title={i.t('settings.decline')}
										aria-label={i.t('settings.decline')}><Icon name="x" size={18} /></Button
									>
								</form>
								<form
									method="POST"
									action="?/acceptContact"
									use:enhance={withToast(i.t, { success: () => i.t('settings.accepted') })}
								>
									<input type="hidden" name="from" value={r.id} />
									<Button type="submit" size="sm"
										><Icon name="check" size={14} /> {i.t('settings.accept')}</Button
									>
								</form>
							</List.Item>
						{/each}
					</List.Root>
				</div>
			{/if}
			<form method="POST" action="?/invite" use:enhance>
				<Button type="submit" variant="outline" class="w-full"
					><Icon name="userPlus" size={16} /> {i.t('settings.createInvite')}</Button
				>
			</form>
			{#if data.openInvites}
				<form
					method="POST"
					action="?/revokeInvites"
					use:enhance={withToast(i.t, { success: () => i.t('settings.invitesRevoked') })}
				>
					<Button type="submit" variant="ghost" size="sm" class="w-full"
						><Icon name="trash" size={14} /> {i.t('settings.revokeInvites')}</Button
					>
				</form>
			{/if}
			<p class="text-muted-foreground text-xs">{i.t('settings.requestsHint')}</p>
		</Card.Content>
	</Card.Root>
	{#if form?.inviteUrl}
		<InviteBox url={form.inviteUrl} text={i.t('invite.text')} />
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>{i.t('settings.ebonHeading')}</Card.Title>
			{#if data.inboxAddress}
				<Card.Description>{i.t('settings.ebonText')}</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			{#if data.inboxAddress}
				<code class="bg-muted w-fit rounded-md px-2 py-1 font-mono text-xs"
					>ebon@mailing.rewe.de</code
				>
				<Button variant="outline" onclick={copyInbox} class="justify-start">
					<Icon name="mail" size={16} />
					<span class="truncate">{data.inboxAddress}</span>
				</Button>
				<p class="text-muted-foreground text-xs">
					{i.t('settings.ebonFromHint', { email: data.email })}
				</p>
			{:else}
				<p class="text-muted-foreground text-sm">{i.t('settings.noInbox')}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{i.t('settings.uploadHeading')}</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/upload"
				enctype="multipart/form-data"
				bind:this={uploadForm}
				use:enhance={withToast(i.t, {
					loading: i.t('settings.importing'),
					// Also after a failure, so picking the same file again starts a new import
					done: () => uploadForm.reset(),
					success: (d) => i.t('settings.imported', { n: Number(d?.imported ?? 0) })
				})}
				class="flex flex-col gap-3"
			>
				<FilePicker
					name="pdf"
					accept="application/pdf"
					multiple
					label={i.t('settings.choosePdf')}
					emptyText={i.t('settings.noFileChosen')}
				/>
			</form>
		</Card.Content>
	</Card.Root>

	<form method="POST" action="/auth/logout">
		<Button type="submit" variant="ghost" class="text-muted-foreground w-full"
			><Icon name="logout" size={16} /> {i.t('settings.logout')}</Button
		>
	</form>
</div>
