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
	const matches = (...fields: (string | null)[]) => {
		const q = filter.trim().toLowerCase();
		return !q || fields.some((s) => s?.toLowerCase().includes(q));
	};
	const products = $derived(data.products.filter((p) => matches(p.name, p.title, p.label)));
	const unlinked = $derived(data.unlinked.filter((p) => matches(p.name, p.label)));

	// Which product the editor is open for; keyed by its receipt line name
	type Editing = {
		name: string;
		title: string | null;
		label: string | null;
		imageUrl: string | null;
	};
	let editing = $state<Editing | null>(null);
	let open = $state(false);
	const edit = (p: Editing) => {
		editing = p;
		open = true;
	};
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
						<span class="truncate text-sm font-medium"
							>{m.userName ?? (m.status === 'unknown_user' ? i.t('admin.noUser') : '–')}</span
						>
						<!-- unknown_user: the addresses it was sent to/from, in full, to see why none matched -->
						<span
							class={[
								'text-muted-foreground text-xs',
								m.status === 'unknown_user' ? 'break-all' : 'truncate'
							]}>{when(m.receivedAt)}{m.detail ? ` · ${m.detail}` : ''}</span
						>
					</span>
					<Badge variant={m.status === 'imported' ? 'secondary' : 'outline'}
						>{key ? i.t(key) : m.status}</Badge
					>
				</List.Item>
			{/each}
		</List.Root>
		{#if data.mails.some((m) => m.status === 'unknown_user')}
			<p class="text-muted-foreground -mt-2 px-1 text-xs">{i.t('admin.unknownUserHint')}</p>
		{/if}
	{:else}
		<p class="text-muted-foreground px-1 text-sm">{i.t('admin.noMails')}</p>
	{/if}

	<Input type="search" bind:value={filter} placeholder={i.t('admin.filter')} />

	<SectionTitle>{i.t('admin.products')} ({data.products.length})</SectionTitle>
	<p class="text-muted-foreground -mt-2 px-1 text-xs">{i.t('admin.productsHint')}</p>
	{#if products.length}
		<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
			{#each products as p (p.name)}
				<li>
					<button
						class="bg-card hover:bg-accent/60 focus-visible:ring-ring/50 flex h-full w-full flex-col items-center gap-2 rounded-xl border p-3 text-center shadow-xs transition-colors outline-none focus-visible:ring-[3px]"
						onclick={() => edit(p)}
					>
						{#if p.imageUrl && !broken[p.imageUrl]}
							{@const url = p.imageUrl}
							<img
								src={productThumb(url, 300)}
								alt=""
								loading="lazy"
								class="aspect-square w-full max-w-36 object-contain"
								onerror={() => (broken[url] = true)}
							/>
						{:else}
							<span class="flex aspect-square w-full max-w-36 items-center justify-center">
								<GroupIcon icon={productIcon(p.label ?? p.title ?? p.name)} size={72} />
							</span>
						{/if}
						<span class="line-clamp-2 w-full text-sm font-medium hyphens-auto wrap-break-word"
							>{p.label ?? p.title ?? p.name}</span
						>
						<span class="text-muted-foreground w-full truncate font-mono text-xs">{p.name}</span>
						<Badge variant="outline" class="mt-auto"
							>{p.source === 'system' ? i.t('admin.auto') : i.t('admin.byHand')}</Badge
						>
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-muted-foreground px-1 text-sm">{i.t('admin.noProducts')}</p>
	{/if}

	<SectionTitle>{i.t('admin.unlinked')} ({data.unlinked.length})</SectionTitle>
	<p class="text-muted-foreground -mt-2 px-1 text-xs">{i.t('admin.unlinkedHint')}</p>
	{#if unlinked.length}
		<List.Root>
			{#each unlinked as p (p.name)}
				<li data-slot="list-item">
					<button
						class="hover:bg-accent/60 focus-visible:bg-accent/60 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none"
						onclick={() => edit({ ...p, title: null, imageUrl: null })}
					>
						<GroupIcon icon={productIcon(p.label ?? p.name)} size={36} />
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="truncate text-sm font-medium">{p.label ?? p.name}</span>
							<span class="text-muted-foreground truncate font-mono text-xs"
								>{p.name} · {i.t('admin.times', { n: p.count })}</span
							>
						</span>
						<Badge variant="outline"
							>{p.missed ? i.t('admin.notFound') : i.t('admin.pending')}</Badge
						>
						<Icon name="edit" size={16} />
					</button>
				</li>
			{/each}
		</List.Root>
	{:else}
		<p class="text-muted-foreground px-1 text-sm">{i.t('admin.noUnlinked')}</p>
	{/if}
</div>

{#if editing}
	<ProductEditor item={{ ...editing, id: editing.name }} field="name" canRename bind:open />
{/if}
