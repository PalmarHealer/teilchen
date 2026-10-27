<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { useI18n } from '../i18n/index.ts';
	import { productThumb } from '../product-image.ts';
	import { withToast } from '../toast.ts';
	import Icon from './Icon.svelte';
	import { Button } from './ui/button/index.ts';
	import { Input } from './ui/input/index.ts';
	import { Label } from './ui/label/index.ts';

	type Item = {
		id: string;
		name: string;
		title: string | null;
		label: string | null;
		imageUrl: string | null;
	};
	type Hit = { title: string; imageUrl: string };

	/**
	 * Links a receipt line to a product of the REWE shop search, which gives it a readable name
	 * and a photo on every receipt. Admins (with "edit links" on) can also name it by hand.
	 */
	let {
		item,
		canRename = false,
		open = $bindable(false)
	}: { item: Item; canRename?: boolean; open?: boolean } = $props();
	const i = useI18n();

	let query = $state('');
	// The query the hits belong to: the server checks the pick against the same search
	let searched = $state('');
	let hits = $state<Hit[] | null>(null);
	let searching = $state(false);
	// Seconds until the shop may be asked again, or null; 0 = unreachable for another reason
	let unavailable = $state<number | null>(null);
	let picked = $state<Hit | null>(null);
	let label = $state('');

	// Fresh each time it opens, searching right away for what the receipt says. Only `open` and
	// the item are dependencies: typing must not start over.
	$effect(() => {
		if (!open) return;
		const name = item.name;
		const current = item.label;
		untrack(() => {
			label = current ?? '';
			query = name;
			hits = null;
			picked = null;
			search();
		});
	});

	let seq = 0;
	async function search() {
		const q = query.trim();
		if (!q) return;
		const mine = ++seq;
		searching = true;
		try {
			const res = await fetch(`/swipe/images?q=${encodeURIComponent(q)}`);
			const body = await res.json().catch(() => null);
			if (mine === seq) {
				unavailable = res.ok ? null : Number(body?.retryIn ?? 0);
				hits = res.ok ? body : [];
				searched = q;
				picked = null;
			}
		} finally {
			if (mine === seq) searching = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
		/>
		<Dialog.Content
			class="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border p-6 shadow-lg"
		>
			<Dialog.Title class="text-lg font-semibold">
				{item.imageUrl ? i.t('product.relink') : i.t('product.findPhoto')}
			</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{i.t('product.onReceipt')} <span class="text-foreground font-mono">{item.name}</span>.
				{i.t('product.learns')}
			</Dialog.Description>

			{#if canRename}
				<form
					method="POST"
					action="?/rename"
					class="grid gap-2 border-b pb-4"
					use:enhance={withToast(i.t, {
						reset: false,
						success: () => i.t('product.nameSaved'),
						done: () => (open = false)
					})}
				>
					<input type="hidden" name="item" value={item.id} />
					<Label for="product-label">{i.t('product.adminName')}</Label>
					<div class="flex gap-2">
						<Input
							id="product-label"
							name="label"
							bind:value={label}
							placeholder={item.title ?? item.name}
							maxlength={120}
						/>
						<Button type="submit" variant="outline">{i.t('common.save')}</Button>
					</div>
					<span class="text-muted-foreground text-xs">{i.t('product.adminNameHint')}</span>
				</form>
			{/if}

			<form
				class="grid gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					search();
				}}
			>
				<Label for="product-search">{i.t('product.search')}</Label>
				<div class="flex gap-2">
					<Input
						id="product-search"
						type="search"
						bind:value={query}
						placeholder={i.t('product.searchHint')}
					/>
					<Button type="submit" variant="outline" size="icon" aria-label={i.t('product.search')}>
						<Icon name="search" size={18} />
					</Button>
				</div>
			</form>

			{#if searching && !hits}
				<p class="text-muted-foreground text-sm">{i.t('product.searching')}</p>
			{:else if unavailable !== null}
				<p class="text-destructive text-sm">
					{unavailable ? i.t('product.retryIn', { s: unavailable }) : i.t('errors.shopUnavailable')}
				</p>
			{:else if hits && !hits.length}
				<p class="text-muted-foreground text-sm">{i.t('product.noHits')}</p>
			{:else if hits}
				<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3" class:opacity-60={searching}>
					{#each hits as hit (hit.imageUrl)}
						<li>
							<button
								type="button"
								aria-pressed={picked === hit}
								class="hover:bg-accent focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:ring-primary/30 flex h-full w-full flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs transition-colors outline-none focus-visible:ring-[3px] aria-pressed:ring-2"
								onclick={() => (picked = hit)}
							>
								<img
									src={productThumb(hit.imageUrl, 152)}
									alt=""
									loading="lazy"
									class="size-20 object-contain"
								/>
								<span class="line-clamp-3">{hit.title}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<form
				method="POST"
				action="?/link"
				use:enhance={withToast(i.t, { done: () => (open = false) })}
			>
				<input type="hidden" name="item" value={item.id} />
				<input type="hidden" name="query" value={searched} />
				<input type="hidden" name="url" value={picked?.imageUrl ?? ''} />
				<Button type="submit" class="w-full" disabled={!picked || searching}>
					<Icon name="check" size={16} />
					{i.t('product.link')}
				</Button>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
