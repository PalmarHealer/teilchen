<script lang="ts">
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ProductEditor from '#lib/components/ProductEditor.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { SectionTitle } from '#lib/components/ui/section/index.ts';
	import { useI18n, type MessageKey } from '#lib/i18n/index.ts';
	import { productIcon } from '#lib/product-icon.ts';
	import { productThumb } from '#lib/product-image.ts';

	let { data } = $props();
	const i = useI18n();

	let filter = $state('');
	const products = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return data.products;
		return data.products.filter((p) =>
			[p.name, p.title, p.label].some((s) => s?.toLowerCase().includes(q))
		);
	});

	// Which product the editor is open for; keyed by its receipt line name
	let editing = $state<(typeof data.products)[number] | null>(null);
	let open = $state(false);
	// Photos that didn't load: the icon instead
	let broken = $state<Record<string, true>>({});

	const statusKey = (s: string) =>
		(['imported', 'no_ebon', 'unknown_user', 'ignored'].includes(s)
			? `admin.mailStatus.${s}`
			: null) as MessageKey | null;
	const when = (d: Date) =>
		d.toLocaleString(i.locale, {
			dateStyle: 'short',
			timeStyle: 'short',
			timeZone: 'Europe/Berlin'
		});
</script>

<Header title={i.t('admin.title')} />

<div class="flex flex-col gap-4">
	<SectionTitle>{i.t('admin.mails')}</SectionTitle>
	<p class="text-muted-foreground -mt-2 px-1 text-xs">{i.t('admin.mailsHint')}</p>
	{#if data.mails.length}
		<List.Root>
			{#each data.mails as m (m.messageId)}
				{@const key = statusKey(m.status)}
				<List.Item>
					<Icon name="mail" size={18} />
					<span class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="truncate text-sm font-medium">{m.userName ?? '–'}</span>
						<span class="text-muted-foreground truncate text-xs"
							>{when(m.receivedAt)}{m.detail ? ` · ${m.detail}` : ''}</span
						>
					</span>
					<Badge variant={m.status === 'imported' ? 'secondary' : 'outline'}
						>{key ? i.t(key) : m.status}</Badge
					>
				</List.Item>
			{/each}
		</List.Root>
	{:else}
		<p class="text-muted-foreground px-1 text-sm">{i.t('admin.noMails')}</p>
	{/if}

	<SectionTitle>{i.t('admin.products')} ({data.products.length})</SectionTitle>
	<p class="text-muted-foreground -mt-2 px-1 text-xs">{i.t('admin.productsHint')}</p>
	<Input type="search" bind:value={filter} placeholder={i.t('admin.filter')} />
	{#if products.length}
		<List.Root>
			{#each products as p (p.name)}
				<li data-slot="list-item">
					<button
						class="hover:bg-accent/60 focus-visible:bg-accent/60 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none"
						onclick={() => {
							editing = p;
							open = true;
						}}
					>
						{#if p.imageUrl && !broken[p.imageUrl]}
							{@const url = p.imageUrl}
							<img
								src={productThumb(url, 152)}
								alt=""
								loading="lazy"
								class="size-9 flex-none object-contain"
								onerror={() => (broken[url] = true)}
							/>
						{:else}
							<GroupIcon icon={productIcon(p.label ?? p.title ?? p.name)} size={36} />
						{/if}
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="truncate text-sm font-medium">{p.label ?? p.title ?? p.name}</span>
							<span class="text-muted-foreground truncate font-mono text-xs">{p.name}</span>
						</span>
						<Badge variant="outline"
							>{p.source === 'system'
								? i.t('admin.auto')
								: p.source === 'user'
									? i.t('admin.byHand')
									: i.t('admin.labelOnly')}</Badge
						>
						<Icon name="edit" size={16} />
					</button>
				</li>
			{/each}
		</List.Root>
	{:else}
		<p class="text-muted-foreground px-1 text-sm">{i.t('admin.noProducts')}</p>
	{/if}
</div>

{#if editing}
	<ProductEditor item={{ ...editing, id: editing.name }} field="name" canRename bind:open />
{/if}
