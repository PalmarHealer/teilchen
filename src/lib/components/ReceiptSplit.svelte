<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '../i18n/index.ts';
	import { productIcon } from '../product-icon.ts';
	import { productThumb } from '../product-image.ts';
	import type { ItemDecision } from '../split.ts';
	import { withToast } from '../toast.ts';
	import Amount from './Amount.svelte';
	import GroupIcon from './GroupIcon.svelte';
	import Icon from './Icon.svelte';
	import { Badge } from './ui/badge/index.ts';
	import { Button } from './ui/button/index.ts';
	import * as List from './ui/list/index.ts';

	/**
	 * The lines of a receipt booking: who gets what after everyone's swipes, where the swipes
	 * disagree, and (for everyone in it) who gets a line, set by hand.
	 */
	let {
		me,
		receipt
	}: {
		me: string;
		receipt: {
			canEdit: boolean;
			conflicts: number;
			pending: number;
			discountCents: number;
			people: { id: string; name: string }[];
			lines: {
				id: string;
				name: string;
				/** Product photo, when the line is linked to a shop product */
				imageUrl: string | null;
				quantity: string;
				unit: string | null;
				cents: number;
				manual: boolean;
				conflict: boolean;
				pieces: { cents: number; owners: string[] }[];
				votes: { userId: string; decision: ItemDecision }[];
			}[];
		};
	} = $props();
	const i = useI18n();
	let open = $state<string | null>(null);
	// Photos that didn't load: the icon instead
	let broken = $state<Record<string, true>>({});

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const name = (id: string) =>
		id === me ? i.t('common.you') : (receipt.people.find((p) => p.id === id)?.name ?? '?');
	const names = (ids: string[]) =>
		ids.length === receipt.people.length && ids.length > 1
			? i.t('expenses.everyone')
			: ids.map(name).join(', ');
	const decisionLabel = (d: ItemDecision) => {
		const one = (x: string) =>
			x === 'mine'
				? i.t('swipe.mine')
				: x === 'shared'
					? i.t('swipe.share')
					: i.t('expenses.notMine');
		if (!Array.isArray(d)) return one(d);
		return [...new Set(d)].map((x) => `${d.filter((y) => y === x).length}× ${one(x)}`).join(', ');
	};
	/** Owners per piece, collapsed when all pieces go to the same people */
	const ownersText = (pieces: { owners: string[] }[]) => {
		const texts = pieces.map((p) => names(p.owners));
		return texts.every((t) => t === texts[0])
			? texts[0]
			: texts.map((t, n) => `${n + 1}: ${t}`).join(' · ');
	};
	const qty = (q: string, unit: string | null) =>
		unit === 'kg' ? `${Number(q).toLocaleString(i.locale)} kg · ` : Number(q) > 1 ? `${q}× · ` : '';
</script>

{#if receipt.conflicts}
	<p class="text-destructive flex items-center gap-2 px-1 text-sm font-medium">
		<Icon name="alert" size={16} />
		{i.t('expenses.conflicts', { n: receipt.conflicts })}
	</p>
{/if}
{#if receipt.pending}
	<p class="text-muted-foreground px-1 text-xs">
		{i.t('expenses.pendingSwipes', { n: receipt.pending })}
	</p>
{/if}

<List.Root>
	{#each receipt.lines as l (l.id)}
		<li data-slot="list-item">
			<button
				class="hover:bg-accent/60 focus-visible:bg-accent/60 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none"
				onclick={() => (open = open === l.id ? null : l.id)}
				aria-expanded={open === l.id}
			>
				{#if l.imageUrl && !broken[l.imageUrl]}
					{@const url = l.imageUrl}
					<img
						src={productThumb(url, 152)}
						alt=""
						loading="lazy"
						class="size-9 flex-none object-contain"
						onerror={() => (broken[url] = true)}
					/>
				{:else}
					<GroupIcon icon={productIcon(l.name)} size={36} />
				{/if}
				<span class="flex min-w-0 flex-1 flex-col gap-0.5">
					<span class="truncate text-sm font-medium">{l.name}</span>
					<span class="text-muted-foreground truncate text-xs"
						>{qty(l.quantity, l.unit)}{cap(ownersText(l.pieces) ?? '')}</span
					>
				</span>
				{#if l.conflict}
					<Badge variant="outline" class="bg-destructive/12 text-destructive border-transparent"
						>{i.t('expenses.disagree')}</Badge
					>
				{:else if l.manual}
					<Badge variant="secondary">{i.t('expenses.setByHand')}</Badge>
				{/if}
				<Amount cents={l.cents} class="text-sm font-medium" />
			</button>
			{#if open === l.id}
				<div class="flex flex-col gap-3 px-4 pb-4">
					{#if l.votes.length}
						<ul class="text-muted-foreground flex flex-col gap-1 text-xs">
							{#each l.votes as v (v.userId)}
								<li>
									<span class="text-foreground font-medium">{cap(name(v.userId))}:</span>
									{decisionLabel(v.decision)}
								</li>
							{/each}
						</ul>
					{/if}
					{#if receipt.canEdit}
						<form
							method="POST"
							action="?/setOwners"
							class="flex flex-col gap-3"
							use:enhance={withToast(i.t, {
								reset: false,
								success: () => i.t('expenses.ownersSaved'),
								done: () => (open = null)
							})}
						>
							<input type="hidden" name="item" value={l.id} />
							<span class="text-xs font-medium">{i.t('expenses.whoGetsIt')}</span>
							<div class="flex flex-wrap gap-2">
								{#each receipt.people as p (p.id)}
									<label
										class="has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-ring/40 flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors has-focus-visible:ring-[3px]"
									>
										<input
											type="checkbox"
											name="owner"
											value={p.id}
											checked={l.pieces[0]!.owners.includes(p.id)}
											class="sr-only"
										/>
										{cap(name(p.id))}
									</label>
								{/each}
							</div>
							<div class="flex flex-wrap gap-2">
								<Button type="submit" size="sm"
									><Icon name="check" size={14} /> {i.t('expenses.saveOwners')}</Button
								>
								{#if l.manual}
									<Button type="submit" name="reset" value="1" variant="ghost" size="sm"
										><Icon name="undo" size={14} /> {i.t('expenses.followSwipes')}</Button
									>
								{/if}
							</div>
						</form>
					{/if}
				</div>
			{/if}
		</li>
	{/each}
	{#if receipt.discountCents}
		<List.Item class="text-positive text-sm">
			<Icon name="sparkles" size={18} />
			<span class="flex-1">{i.t('swipe.discountSpread')}</span>
			<Amount cents={receipt.discountCents} class="font-medium" />
		</List.Item>
	{/if}
</List.Root>
