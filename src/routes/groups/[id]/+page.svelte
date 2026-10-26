<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import ConfirmAction from '#lib/components/ConfirmAction.svelte';
	import ExpenseRow from '#lib/components/ExpenseRow.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import IconPicker from '#lib/components/IconPicker.svelte';
	import { GROUP_ICON_SUGGESTIONS } from '#lib/icon-suggestions.ts';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import InviteBox from '#lib/components/InviteBox.svelte';
	import Select from '#lib/components/Select.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { SectionTitle } from '#lib/components/ui/section/index.ts';
	import { Switch } from '#lib/components/ui/switch/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { withToast } from '#lib/toast.ts';
	import { centsToInput } from '#lib/money.ts';

	let { data, form } = $props();
	const i = useI18n();
	let managing = $state(false);
	// svelte-ignore state_referenced_locally
	let icon = $state<string | null>(data.group.icon);
	// svelte-ignore state_referenced_locally
	let newCreator = $state(data.others[0]?.id ?? '');
	const open = $derived(data.members.filter((m) => m.withMe));
</script>

<Header title={data.group.name} back="/groups">
	{#snippet actions()}
		<Button
			variant={managing ? 'secondary' : 'ghost'}
			size="icon"
			aria-label={i.t('groups.manage')}
			aria-expanded={managing}
			onclick={() => (managing = !managing)}><Icon name="settings" size={24} /></Button
		>
	{/snippet}
</Header>

<div class="flex flex-col gap-4">
	<div class="flex flex-col items-center gap-2 pb-1">
		<GroupIcon icon={data.group.icon} size={56} />
		<span class="text-muted-foreground text-sm"
			>{i.t('groups.memberCount', { n: data.members.length })}</span
		>
	</div>

	<SectionTitle>{i.t('groups.members')}</SectionTitle>
	<List.Root>
		{#each data.members as m (m.id)}
			<List.Item class="gap-2 py-0 pr-2">
				<a
					href={m.withMe === null ? '/settings' : `/people/${m.id}`}
					class="flex min-w-0 flex-1 items-center gap-3 self-stretch py-3"
				>
					<Avatar name={m.name} src={m.avatarUrl} size={36} />
					<span class="flex min-w-0 flex-1 flex-col">
						<span class="truncate text-sm font-medium"
							>{m.withMe === null ? i.t('common.youSuffix', { name: m.name }) : m.name}</span
						>
						{#if m.withMe}
							<span class="text-muted-foreground text-xs"
								>{m.withMe > 0 ? i.t('overview.owesYou') : i.t('overview.youOweShort')}
								<Amount cents={Math.abs(m.withMe)} /></span
							>
						{/if}
					</span>
					<Amount cents={m.balance} signed class="text-sm font-semibold" />
				</a>
				{#if m.contact === 'requested'}
					<span
						class="text-muted-foreground grid size-9 place-items-center"
						title={i.t('groups.requested')}
						aria-label={i.t('groups.requested')}><Icon name="clock" size={18} /></span
					>
				{:else if m.contact === 'none' || m.contact === 'incoming'}
					<form
						method="POST"
						action="?/requestContact"
						use:enhance={withToast(i.t, {
							success: (d) =>
								d?.contact === 'connected' ? i.t('person.connected') : i.t('person.requestSent')
						})}
					>
						<input type="hidden" name="member" value={m.id} />
						<Button
							type="submit"
							variant="ghost"
							size="icon"
							class="size-9 {m.contact === 'incoming' ? 'text-primary' : 'text-muted-foreground'}"
							title={i.t('groups.requestContact')}
							aria-label={i.t('groups.requestContact')}><Icon name="userPlus" size={18} /></Button
						>
					</form>
				{:else}
					<span class="size-9"></span>
				{/if}
			</List.Item>
		{/each}
	</List.Root>
	<p class="text-muted-foreground px-1 text-xs">
		{i.t(data.group.keepDebts ? 'groups.hintKept' : 'groups.hint')}
	</p>

	{#if data.group.keepDebts && open.length}
		<SectionTitle>{i.t('groups.settleHere')}</SectionTitle>
		<List.Root>
			{#each open as m (m.id)}
				<List.Item class="flex-wrap">
					<Avatar name={m.name} src={m.avatarUrl} size={28} />
					<span class="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
					<span class="text-muted-foreground text-xs"
						>{m.withMe! < 0
							? i.t('person.youOwe', { name: m.name.split(' ')[0] ?? m.name })
							: i.t('person.owesYou', { name: m.name.split(' ')[0] ?? m.name })}
						<Amount cents={Math.abs(m.withMe!)} class="text-foreground font-medium" /></span
					>
					<!-- The amount defaults to everything that is open; less is a partial payment. -->
					<form
						method="POST"
						action="?/settle"
						use:enhance={withToast(i.t, { success: () => i.t('person.paid') })}
						class="flex w-full gap-2"
					>
						<input type="hidden" name="member" value={m.id} />
						<Input
							name="amount"
							inputmode="decimal"
							aria-label={i.t('person.amount')}
							value={centsToInput(Math.abs(m.withMe!), i.locale === 'de' ? ',' : '.')}
							class="tabular h-8 w-28 md:text-sm"
						/>
						<Button type="submit" size="sm" variant="outline" class="flex-1">
							<Icon name="check" size={14} />
							{m.withMe! < 0
								? i.t('person.iPaidShort')
								: i.t('person.theyPaidShort', { name: m.name.split(' ')[0] ?? m.name })}
						</Button>
					</form>
				</List.Item>
			{/each}
		</List.Root>
	{/if}

	<div class="grid grid-cols-2 gap-2">
		<Button href="/expenses/new?group={data.group.id}"
			><Icon name="plus" size={16} /> {i.t('groups.expense')}</Button
		>
		<form method="POST" action="?/invite" use:enhance>
			<Button type="submit" variant="outline" class="w-full"
				><Icon name="userPlus" size={16} /> {i.t('groups.invite')}</Button
			>
		</form>
	</div>
	{#if form?.inviteUrl}
		<InviteBox url={form.inviteUrl} text={i.t('groups.inviteText', { name: data.group.name })} />
	{/if}

	{#if managing}
		<Card.Root>
			<Card.Header>
				<Card.Title>{i.t('groups.manage')}</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-5">
				<form
					method="POST"
					action="?/update"
					use:enhance={withToast(i.t, { reset: false, success: () => i.t('groups.saved') })}
					class="flex flex-col gap-5"
				>
					<Label>
						{i.t('groups.name')}
						<Input name="name" value={data.group.name} required maxlength={60} />
					</Label>
					<IconPicker
						bind:value={icon}
						suggestions={GROUP_ICON_SUGGESTIONS}
						legend={i.t('groups.icon')}
					/>
					<label class="flex items-start justify-between gap-4 rounded-lg border p-3">
						<span class="flex flex-col gap-1">
							<span class="text-sm font-medium">{i.t('groups.keepDebts')}</span>
							<span class="text-muted-foreground text-xs">{i.t('groups.keepDebtsHint')}</span>
						</span>
						<Switch name="keepDebts" checked={data.group.keepDebts} />
					</label>
					<div class="flex items-center gap-3">
						<Button type="submit"><Icon name="edit" size={16} /> {i.t('groups.save')}</Button>
					</div>
				</form>
				<div class="flex flex-col gap-2 border-t pt-5">
					{#if data.isCreator && data.others.length === 0}
						<p class="text-muted-foreground flex items-center gap-2 text-sm">
							<Icon name="leave" size={16} />
							{i.t('groups.soleMember')}
						</p>
					{:else if data.isCreator}
						<ConfirmAction
							action="?/leave"
							icon="leave"
							label={i.t('groups.leave')}
							question={i.t('groups.leaveCreatorConfirm')}
							confirmLabel={i.t('groups.confirm')}
							cancelLabel={i.t('groups.cancel')}
						>
							<Select
								name="newCreator"
								bind:value={newCreator}
								label={i.t('groups.newCreator')}
								options={data.others.map((o) => ({ value: o.id, label: o.name, icon: 'user' }))}
							/>
						</ConfirmAction>
					{:else}
						<ConfirmAction
							action="?/leave"
							icon="leave"
							label={i.t('groups.leave')}
							question={i.t('groups.leaveConfirm')}
							confirmLabel={i.t('groups.confirm')}
							cancelLabel={i.t('groups.cancel')}
						/>
					{/if}
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
						{#if !data.settled}
							<p class="text-muted-foreground text-xs">{i.t('groups.deleteNeedsSettled')}</p>
						{/if}
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.expenses.length}
		<SectionTitle>{i.t('groups.history')}</SectionTitle>
		<List.Root>
			{#each data.expenses as e (e.id)}
				<ExpenseRow expense={e} me={data.user!.id} />
			{/each}
		</List.Root>
	{/if}
</div>
