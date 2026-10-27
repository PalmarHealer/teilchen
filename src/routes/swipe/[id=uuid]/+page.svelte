<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Header from '#lib/components/Header.svelte';
	import SwipeHelp from '#lib/components/SwipeHelp.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ProductEditor from '#lib/components/ProductEditor.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as List from '#lib/components/ui/list/index.ts';
	import { SectionTitle } from '#lib/components/ui/section/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { withToast } from '#lib/toast.ts';
	import { splitEqually } from '#lib/money.ts';
	import { productIcon } from '#lib/product-icon.ts';
	import { productThumb } from '#lib/product-image.ts';
	import {
		expandUnits,
		sharesFromItems,
		swipeTotals,
		unitCount,
		type Decision,
		type ItemDecision
	} from '#lib/split.ts';

	let { data } = $props();
	const i = useI18n();

	// Fixed when swiping someone else's booking
	// svelte-ignore state_referenced_locally
	let target = $state<string | null>(data.fixedTarget);
	// Keyed by card: the item id, or `<item id>#<piece>` for lines swiped piece by piece
	let decisions = $state<Record<string, Decision>>({});
	let split = $state<Record<string, boolean>>({});
	// Card keys in the order they were decided, or `split:<item id>` for a split
	let history = $state<string[]>([]);

	// Only products are swiped; discounts/coupons are spread over them when booking.
	const products = $derived(data.items.filter((it) => it.kind === 'product'));
	const cards = $derived(
		products.flatMap((it) => {
			const n = unitCount(it.quantity, it.unit);
			if (!split[it.id])
				return [{ key: it.id, item: it, piece: 0, of: 1, cents: it.totalCents, n }];
			return splitEqually(it.totalCents, n).map((cents, piece) => ({
				key: `${it.id}#${piece}`,
				item: it,
				piece,
				of: n,
				cents,
				n
			}));
		})
	);
	const queue = $derived(cards.filter((c) => !decisions[c.key]));
	const current = $derived(queue[0]);
	const me = $derived(data.user!.id);

	const itemDecision = (id: string): ItemDecision | null => {
		if (!split[id]) return decisions[id] ?? null;
		const pieces = cards.filter((c) => c.item.id === id).map((c) => decisions[c.key]);
		return pieces.every((d) => d) ? (pieces as Decision[]) : null;
	};
	const booked = $derived(Object.fromEntries(products.map((it) => [it.id, itemDecision(it.id)])));

	const targetInfo = $derived.by(() => {
		if (!target) return null;
		const [kind, id] = target.split(':');
		if (kind === 'group') {
			const g = data.groups.find((g) => g.id === id)!;
			return {
				label: g.name,
				icon: g.icon,
				participants: g.memberIds,
				theirs: i.t('swipe.theirsGroup')
			};
		}
		const c = data.contacts.find((c) => c.id === id)!;
		return {
			label: c.name,
			icon: null,
			participants: [me, c.id],
			theirs: c.name.split(' ')[0] ?? c.name
		};
	});

	const splitItems = $derived(
		expandUnits(
			data.items.map((it) => ({
				totalCents: it.totalCents,
				kind: it.kind,
				discountable: it.discountable,
				decision: it.kind === 'product' ? booked[it.id]! : null
			}))
		)
	);
	const totals = $derived(swipeTotals(splitItems));

	const preview = $derived.by(() => {
		if (!targetInfo || queue.length) return [];
		const shares = sharesFromItems(me, targetInfo.participants, splitItems);
		const names = new Map([
			...Object.entries(data.names),
			...data.contacts.map((c) => [c.id, c.name] as const)
		]);
		return [...shares]
			.filter(([, c]) => c !== 0)
			.map(([id, cents]) => ({
				id,
				cents,
				name: id === me ? i.t('common.you') : (names.get(id) ?? i.t('common.member'))
			}));
	});

	function decide(d: Decision) {
		if (!current) return;
		// Capture the key first: `current` is derived and moves on as soon as the decision is set.
		const key = current.key;
		decisions[key] = d;
		history.push(key);
		dx = dy = 0;
	}
	function splitCurrent() {
		if (!current || current.n < 2) return;
		split[current.item.id] = true;
		history.push(`split:${current.item.id}`);
	}
	function undo() {
		const key = history.pop();
		if (key?.startsWith('split:')) delete split[key.slice(6)];
		else if (key) delete decisions[key];
	}

	// --- Gestures ---
	let dx = $state(0);
	let dy = $state(0);
	let dragging = $state(false);
	let start = { x: 0, y: 0 };
	const THRESHOLD = 90;
	const hint = $derived<Decision | null>(
		dy < -THRESHOLD && Math.abs(dy) > Math.abs(dx)
			? 'shared'
			: dx > THRESHOLD
				? 'theirs'
				: dx < -THRESHOLD
					? 'mine'
					: null
	);

	function down(e: PointerEvent) {
		dragging = true;
		start = { x: e.clientX, y: e.clientY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!dragging) return;
		dx = e.clientX - start.x;
		// Down means nothing, so it only gives a little, like a rubber band
		const y = e.clientY - start.y;
		dy = y > 0 ? Math.sqrt(y) * 3 : y;
	}
	function up() {
		dragging = false;
		if (hint) decide(hint);
		else dx = dy = 0;
	}
	function key(e: KeyboardEvent) {
		if (!target || !current) return;
		// Not while the help dialog is open or a field has the keyboard
		if (document.querySelector('[role="dialog"][data-state="open"]')) return;
		if ((e.target as Element | null)?.closest?.('input, textarea')) return;
		if (e.key === 'ArrowLeft') decide('mine');
		else if (e.key === 'ArrowRight') decide('theirs');
		else if (e.key === 'ArrowUp') decide('shared');
		else if (e.key === 'Backspace') undo();
	}

	const pick =
		'hover:bg-accent/60 focus-visible:bg-accent/60 flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none';
	const round =
		'bg-card hover:bg-accent focus-visible:ring-ring/50 flex size-[68px] flex-col items-center justify-center gap-0.5 rounded-full border shadow-sm transition-colors outline-none focus-visible:ring-[3px] disabled:opacity-40 [&_small]:max-w-[60px] [&_small]:truncate [&_small]:text-[11px] [&_small]:font-medium';

	// Photos that didn't load (REWE moved them): the icon again, until a new one is picked
	let broken = $state<Record<string, true>>({});
	let editing = $state(false);
	const hasPhoto = $derived(!!current?.item.imageUrl && !broken[current.item.imageUrl]);

	const fmtQty = (q: string, unit: string | null) =>
		unit === 'kg' ? `${Number(q).toLocaleString(i.locale)} kg` : Number(q) > 1 ? `${q}×` : '';
</script>

<svelte:window onkeydown={key} />

{#snippet face(card: (typeof cards)[number])}
	{@const url = card.item.imageUrl}
	{#if url && !broken[url]}
		<img
			src={productThumb(url, 320)}
			alt=""
			draggable="false"
			class="pointer-events-none size-40 object-contain"
			onerror={() => (broken[url] = true)}
		/>
	{:else}
		<GroupIcon icon={productIcon(card.item.name)} size={80} />
	{/if}
	<span class="text-muted-foreground min-h-5 text-sm">
		{card.of > 1
			? i.t('swipe.piece', { n: card.piece + 1, of: card.of })
			: fmtQty(card.item.quantity, card.item.unit)}
	</span>
	<h2 class="text-2xl font-semibold break-words">{card.item.title ?? card.item.name}</h2>
	{#if card.item.title && card.item.title !== card.item.name}
		<span class="text-muted-foreground -mt-2 font-mono text-xs">{card.item.name}</span>
	{/if}
	<Amount
		cents={card.cents}
		class="text-5xl font-semibold tracking-tight {card.cents < 0 ? 'text-destructive' : ''}"
	/>
{/snippet}

<Header
	title={i.date(data.receipt.purchasedAt, { weekday: 'long', day: '2-digit', month: 'long' })}
	back="/swipe"
>
	{#snippet actions()}
		<SwipeHelp theirs={targetInfo?.theirs ?? i.t('swipe.theirsGroup')} />
	{/snippet}
</Header>

{#if !target}
	<div class="flex flex-col gap-4">
		<p class="text-muted-foreground text-sm">
			{data.receipt.market ?? 'REWE'} · <Amount cents={data.receipt.totalCents} /> ·
			{i.t('swipe.items', { n: products.length })}. {i.t('swipe.whoWith')}
		</p>
		{#if data.groups.length}
			<SectionTitle>{i.t('swipe.groups')}</SectionTitle>
			<List.Root>
				{#each data.groups as g (g.id)}
					<li>
						<button class={pick} onclick={() => (target = `group:${g.id}`)}>
							<GroupIcon icon={g.icon} size={32} />
							<span class="flex-1 text-sm font-medium">{g.name}</span>
							<span class="text-muted-foreground text-xs"
								>{i.t('swipe.members', { n: g.memberIds.length })}</span
							>
							<span class="text-muted-foreground"><Icon name="chevronRight" size={16} /></span>
						</button>
					</li>
				{/each}
			</List.Root>
		{/if}
		{#if data.contacts.length}
			<SectionTitle>{i.t('swipe.people')}</SectionTitle>
			<List.Root>
				{#each data.contacts as c (c.id)}
					<li>
						<button class={pick} onclick={() => (target = `user:${c.id}`)}>
							<Avatar name={c.name} src={c.avatarUrl} size={32} />
							<span class="flex-1 text-sm font-medium">{c.name}</span>
							<span class="text-muted-foreground"><Icon name="chevronRight" size={16} /></span>
						</button>
					</li>
				{/each}
			</List.Root>
		{:else if !data.groups.length}
			<Card.Root>
				<Card.Content class="text-muted-foreground text-sm">
					{i.t('swipe.nobody')}
					<a href="/settings" class="text-primary underline-offset-4 hover:underline"
						>{i.t('swipe.inviteSomeone')}</a
					>
					<a href="/groups" class="text-primary underline-offset-4 hover:underline"
						>{i.t('swipe.orCreateGroup')}</a
					>.
				</Card.Content>
			</Card.Root>
		{/if}
		<form method="POST" action="?/dismiss" use:enhance>
			<Button type="submit" variant="outline" class="w-full">{i.t('swipe.notSharing')}</Button>
		</form>
	</div>
{:else if current}
	{@const done = cards.length - queue.length}
	<div class="swiping">
		<div class="bg-muted h-1 overflow-hidden rounded-full" aria-label={i.t('swipe.progress')}>
			<span
				class="bg-primary block h-full rounded-full transition-[width] duration-200"
				style:width="{(done / cards.length) * 100}%"
			></span>
		</div>
		<p class="text-muted-foreground mt-3 text-sm">
			<span class="tabular">{done + 1} / {cards.length}</span> · {i.t('swipe.with')}
			<strong class="text-foreground font-medium">{targetInfo?.label}</strong>
			{#if !data.fixedTarget}
				<Button variant="link" class="h-auto p-0" onclick={() => (target = null)}
					>{i.t('swipe.change')}</Button
				>
			{/if}
		</p>

		<div class="deck">
			{#each queue.slice(1, 3).reverse() as next, idx (next.key)}
				{@const depth = queue.slice(1, 3).length - idx}
				<div class="swipe face behind" style:--depth={depth} aria-hidden="true">
					<!-- The next card is already readable while the top one is dragged away -->
					{#if depth === 1}{@render face(next)}{/if}
				</div>
			{/each}
			{#key current.key}
				<div
					class="swipe face top"
					class:dragging
					role="button"
					tabindex="0"
					aria-label={i.t('swipe.cardLabel', { name: current.item.title ?? current.item.name })}
					style:transform="translate({dx}px, {dy}px) rotate({dx / 18}deg)"
					onpointerdown={down}
					onpointermove={move}
					onpointerup={up}
					onpointercancel={up}
				>
					{#if current.item.canLink}
						<Button
							variant={hasPhoto ? 'ghost' : 'outline'}
							size={hasPhoto ? 'icon' : 'sm'}
							class="absolute top-3 right-3"
							aria-label={hasPhoto ? i.t('product.relink') : undefined}
							title={hasPhoto ? i.t('product.relink') : undefined}
							onpointerdown={(e: PointerEvent) => e.stopPropagation()}
							onclick={() => (editing = true)}
						>
							{#if hasPhoto}
								<Icon name="photoSearch" size={18} />
							{:else}
								<Icon name="photoSearch" size={16} />
								{i.t('product.findPhoto')}
							{/if}
						</Button>
					{/if}
					{#if hint}
						<span class="stamp {hint}"
							>{hint === 'theirs'
								? targetInfo?.theirs
								: hint === 'mine'
									? i.t('swipe.mine')
									: i.t('swipe.share')}</span
						>
					{/if}
					{@render face(current)}
					{#if current.of === 1 && current.n > 1}
						<Button
							variant="outline"
							size="sm"
							class="absolute bottom-5"
							onpointerdown={(e: PointerEvent) => e.stopPropagation()}
							onclick={splitCurrent}
						>
							<Icon name="split" size={14} />
							{i.t('swipe.splitPieces', { n: current.n })}
						</Button>
					{/if}
				</div>
			{/key}
		</div>
		<ProductEditor item={current.item} canRename={data.canRename} bind:open={editing} />

		<div class="flex items-center justify-center gap-4">
			<button
				class="{round} text-foreground"
				onclick={() => decide('mine')}
				aria-label={i.t('swipe.mineAria')}
			>
				<Icon name="user" size={22} />
				<small>{i.t('swipe.mine')}</small>
			</button>
			<button
				class="{round} text-muted-foreground"
				onclick={undo}
				disabled={!history.length}
				aria-label={i.t('swipe.undo')}
			>
				<Icon name="undo" size={22} />
				<small>{i.t('swipe.undoShort')}</small>
			</button>
			<button
				class="{round} text-shared"
				onclick={() => decide('shared')}
				aria-label={i.t('swipe.shareAria')}
			>
				<Icon name="share" size={22} />
				<small>{i.t('swipe.share')}</small>
			</button>
			<button
				class="{round} text-primary"
				onclick={() => decide('theirs')}
				aria-label={i.t('swipe.theirsAria', { name: targetInfo?.theirs ?? '' })}
			>
				<Icon name="arrowRight" size={22} />
				<small>{targetInfo?.theirs}</small>
			</button>
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<h2 class="text-primary flex items-center gap-2 text-xl font-semibold">
			<Icon name="party" size={24} />
			{i.t('swipe.finished')}
		</h2>
		<List.Root>
			<List.Item class="text-sm">
				<span class="text-muted-foreground"><Icon name="user" size={18} /></span>
				<span class="flex-1">{i.t('swipe.pileMine')}</span>
				<Amount cents={totals.mine} class="font-medium" />
			</List.Item>
			<List.Item class="text-sm">
				<span class="text-muted-foreground"><Icon name="arrowRight" size={18} /></span>
				<span class="flex-1">{i.t('swipe.pileTheirs', { name: targetInfo?.theirs ?? '' })}</span>
				<Amount cents={totals.theirs} class="font-medium" />
			</List.Item>
			<List.Item class="text-sm">
				<span class="text-muted-foreground"><Icon name="share" size={18} /></span>
				<span class="flex-1">{i.t('swipe.pileShared')}</span>
				<Amount cents={totals.shared} class="font-medium" />
			</List.Item>
			{#if totals.discount}
				<List.Item class="text-positive text-sm">
					<Icon name="sparkles" size={18} />
					<span class="flex-1">{i.t('swipe.discountSpread')}</span>
					<Amount cents={totals.discount} class="font-medium" />
				</List.Item>
			{/if}
		</List.Root>
		<SectionTitle>{i.t('swipe.perPerson')}</SectionTitle>
		<List.Root>
			{#each preview as p (p.id)}
				<List.Item class="text-sm">
					<span class="flex-1">{p.name}</span>
					<Amount cents={p.cents} class="font-semibold" />
				</List.Item>
			{/each}
		</List.Root>
		<p class="text-muted-foreground px-1 text-xs">
			{data.payerName ? i.t('swipe.theyPaid', { name: data.payerName }) : i.t('swipe.youPaid')}
		</p>
		<form method="POST" action="?/book" use:enhance={withToast(i.t)}>
			<input type="hidden" name="target" value={target} />
			<input type="hidden" name="decisions" value={JSON.stringify(booked)} />
			<Button type="submit" size="lg" class="w-full"
				><Icon name="check" size={18} /> {i.t('swipe.book')}</Button
			>
		</form>
		<Button variant="outline" onclick={undo}
			><Icon name="undo" size={16} /> {i.t('swipe.undoLast')}</Button
		>
	</div>
{/if}

<style>
	/* Fill the screen between header and tab bar, so the card gets as tall as it can */
	.swiping {
		display: flex;
		flex-direction: column;
		height: calc(
			100dvh - max(12px, env(safe-area-inset-top)) - 64px - var(--nav-h) - 24px -
				env(safe-area-inset-bottom)
		);
		min-height: 440px;
	}
	@media (min-width: 768px) {
		.swiping {
			height: calc(100dvh - 28px - 64px - 40px);
		}
	}
	.deck {
		position: relative;
		/* The dragged card stays above all action buttons (the disabled one is translucent,
		   which would otherwise paint it on top) */
		z-index: 1;
		flex: 1;
		margin: 12px 0 24px;
	}
	.swipe {
		position: absolute;
		inset: 0;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) + 12px);
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.04),
			0 12px 32px -12px rgb(0 0 0 / 0.18);
	}
	.behind {
		transform: translateY(calc(var(--depth) * 10px)) scale(calc(1 - var(--depth) * 0.04));
		opacity: calc(1.35 - var(--depth) * 0.35);
	}
	.face {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		gap: 14px;
		padding: 32px 24px;
	}
	.top {
		touch-action: none;
		user-select: none;
		cursor: grab;
		transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
		animation: enter 0.2s ease-out;
	}
	.top.dragging {
		transition: none;
		cursor: grabbing;
	}
	@keyframes enter {
		from {
			transform: scale(0.95);
			opacity: 0.6;
		}
	}
	.stamp {
		position: absolute;
		top: 24px;
		padding: 4px 12px;
		border: 2px solid;
		border-radius: var(--radius);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 1.1rem;
		background: var(--card);
	}
	.stamp.mine {
		right: 24px;
		color: var(--muted-foreground);
		transform: rotate(10deg);
	}
	.stamp.theirs {
		left: 24px;
		color: var(--primary);
		transform: rotate(-10deg);
	}
	.stamp.shared {
		left: 50%;
		transform: translateX(-50%);
		color: var(--shared);
	}
</style>
