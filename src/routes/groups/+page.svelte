<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import IconPicker from '#lib/components/IconPicker.svelte';
	import { GROUP_ICON_SUGGESTIONS } from '#lib/icon-suggestions.ts';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();
	let icon = $state('home');
</script>

<Header title={i.t('groups.title')} />

<div class="flex flex-col gap-4">
	{#if data.groups.length}
		<List.Root>
			{#each data.groups as g (g.id)}
				<List.Item href="/groups/{g.id}" class="gap-3.5 py-3.5">
					<GroupIcon icon={g.icon} size={44} />
					<span class="flex min-w-0 flex-1 flex-col gap-1">
						<span class="truncate font-semibold">{g.name}</span>
						<span class="flex items-center gap-2">
							{#if g.preview.length}
								<span class="flex -space-x-1.5">
									{#each g.preview as p (p.id)}
										<span class="ring-card rounded-full ring-2"
											><Avatar name={p.name} src={p.avatarUrl} size={20} /></span
										>
									{/each}
								</span>
							{/if}
							<span class="text-muted-foreground text-xs"
								>{i.t('groups.memberCount', { n: g.memberCount })}</span
							>
						</span>
					</span>
					<span class="flex flex-col items-end text-right">
						{#if g.myBalance === 0}
							<Badge variant="positive"
								><Icon name="check" size={12} /> {i.t('groups.settledUp')}</Badge
							>
						{:else}
							<Amount cents={g.myBalance} signed class="text-sm font-semibold" />
							<span class="text-muted-foreground text-xs">{i.t('groups.yourBalance')}</span>
						{/if}
					</span>
					<span class="text-muted-foreground"><Icon name="chevronRight" size={16} /></span>
				</List.Item>
			{/each}
		</List.Root>
	{:else}
		<div class="flex flex-col items-center gap-2 px-2 pt-6 pb-2 text-center">
			<GroupIcon icon="users" size={64} />
			<h2 class="mt-2 text-lg font-semibold">{i.t('groups.emptyTitle')}</h2>
			<p class="text-muted-foreground max-w-[32ch] text-sm">{i.t('groups.emptyText')}</p>
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>{i.t('groups.newGroup')}</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/create" use:enhance class="flex flex-col gap-4">
				<Input name="name" placeholder={i.t('groups.namePlaceholder')} required maxlength={60} />
				<IconPicker
					bind:value={icon}
					suggestions={GROUP_ICON_SUGGESTIONS}
					legend={i.t('groups.icon')}
				/>
				{#if form?.message}<p class="text-destructive text-sm">{i.t(form.message)}</p>{/if}
				<Button type="submit"><Icon name="plus" size={16} /> {i.t('groups.create')}</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
