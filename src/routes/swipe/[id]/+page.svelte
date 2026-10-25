<script lang="ts">
	import { enhance } from '$app/forms';
	import Amount from '#lib/components/Amount.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Header from '#lib/components/Header.svelte';
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { sharesFromItems, type Decision } from '#lib/split.ts';

	let { data, form } = $props();

	let target = $state<string | null>(null);
	let decisions = $state<Record<string, Decision>>({});
	let history = $state<string[]>([]);

	const queue = $derived(data.items.filter((i) => !decisions[i.id]));
	const current = $derived(queue[0]);
	const me = $derived(data.user!.id);

	const targetInfo = $derived.by(() => {
		if (!target) return null;
		const [kind, id] = target.split(':');
		if (kind === 'group') {
			const g = data.groups.find((g) => g.id === id)!;
			return { label: g.name, icon: g.icon, participants: g.memberIds, theirs: 'Gruppe' };
		}
		const c = data.contacts.find((c) => c.id === id)!;
		return { label: c.name, icon: null, participants: [me, c.id], theirs: c.name.split(' ')[0] };
	});

	const preview = $derived.by(() => {
		if (!targetInfo || queue.length) return [];
		const items = data.items.map((i) => ({ totalCents: i.totalCents, decision: decisions[i.id]! }));
		const shares = sharesFromItems(me, targetInfo.participants, items);
		const names = new Map(data.contacts.map((c) => [c.id, c.name]));
		return [...shares]
			.filter(([, c]) => c !== 0)
			.map(([id, cents]) => ({
				id,
				cents,
				name: id === me ? 'Du' : (names.get(id) ?? 'Mitglied')
			}));
	});

	function decide(d: Decision) {
		if (!current) return;
		decisions[current.id] = d;
		history.push(current.id);
		dx = dy = 0;
	}
	function undo() {
		const id = history.pop();
		if (id) delete decisions[id];
	}

	// --- Gesten ---
	let dx = $state(0);
	let dy = $state(0);
	let dragging = $state(false);
	let start = { x: 0, y: 0 };
	const THRESHOLD = 90;
	const hint = $derived<Decision | null>(
		dy < -THRESHOLD && Math.abs(dy) > Math.abs(dx)
			? 'theirs'
			: dx > THRESHOLD
				? 'shared'
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
		dy = e.clientY - start.y;
	}
	function up() {
		dragging = false;
		if (hint) decide(hint);
		else dx = dy = 0;
	}
	function key(e: KeyboardEvent) {
		if (!target || !current) return;
		if (e.key === 'ArrowLeft') decide('mine');
		else if (e.key === 'ArrowRight') decide('shared');
		else if (e.key === 'ArrowUp') decide('theirs');
		else if (e.key === 'Backspace') undo();
	}

	const labels: Record<Decision, string> = { mine: 'Meins', shared: 'Teilen', theirs: '' };
	const fmtQty = (q: string, unit: string | null) =>
		unit === 'kg' ? `${q.replace('.', ',')} kg` : Number(q) > 1 ? `${q}×` : '';
</script>

<svelte:window onkeydown={key} />

<Header
	title={new Date(data.receipt.purchasedAt).toLocaleDateString('de-DE', {
		weekday: 'long',
		day: '2-digit',
		month: 'long'
	})}
	back="/swipe"
/>

{#if !target}
	<div class="stack">
		<p class="muted intro">
			{data.receipt.market ?? 'REWE'} · <Amount cents={data.receipt.totalCents} /> ·
			{data.items.length} Positionen. Mit wem teilst du diesen Einkauf?
		</p>
		{#if data.groups.length}
			<h2 class="section-title">Gruppen</h2>
			<ul class="list">
				{#each data.groups as g (g.id)}
					<li>
						<button class="pick" onclick={() => (target = `group:${g.id}`)}>
							<GroupIcon icon={g.icon} size={32} />
							<span class="grow">{g.name}</span>
							<small class="muted">{g.memberIds.length} Personen</small>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		{#if data.contacts.length}
			<h2 class="section-title">Personen</h2>
			<ul class="list">
				{#each data.contacts as c (c.id)}
					<li>
						<button class="pick" onclick={() => (target = `user:${c.id}`)}>
							<Avatar name={c.name} src={c.avatarUrl} size={32} />
							<span class="grow">{c.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else if !data.groups.length}
			<p class="card muted">
				Du hast noch niemanden zum Teilen. <a href="/einstellungen">Lade jemanden ein</a> oder
				<a href="/gruppen">erstelle eine Gruppe</a>.
			</p>
		{/if}
		<form method="POST" action="?/dismiss" use:enhance>
			<button class="btn block">Nicht teilen, alles meins</button>
		</form>
	</div>
{:else if current}
	<div class="progress" aria-label="Fortschritt">
		<span style:width="{(history.length / data.items.length) * 100}%"></span>
	</div>
	<p class="muted status">
		{history.length + 1} / {data.items.length} · mit <strong>{targetInfo?.label}</strong>
		<button class="link" onclick={() => (target = null)}>ändern</button>
	</p>

	<div class="deck">
		{#each queue.slice(1, 3).reverse() as next, i (next.id)}
			<div class="card swipe behind" style:--depth={queue.slice(1, 3).length - i}></div>
		{/each}
		{#key current.id}
			<div
				class="card swipe top"
				class:dragging
				role="button"
				tabindex="0"
				aria-label="{current.name}, wischen zum Zuordnen"
				style:transform="translate({dx}px, {dy}px) rotate({dx / 18}deg)"
				onpointerdown={down}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={up}
			>
				{#if hint}
					<span class="stamp {hint}">{hint === 'theirs' ? targetInfo?.theirs : labels[hint]}</span>
				{/if}
				<span class="qty muted">{fmtQty(current.quantity, current.unit)}</span>
				<h2 class="name">{current.name}</h2>
				<strong class="price" class:minus={current.totalCents < 0}
					><Amount cents={current.totalCents} /></strong
				>
			</div>
		{/key}
	</div>

	<div class="actions">
		<button class="round mine" onclick={() => decide('mine')} aria-label="Meins (Pfeil links)">
			<Icon name="user" />
			<small>Meins</small>
		</button>
		<button class="round undo" onclick={undo} disabled={!history.length} aria-label="Rückgängig">
			<Icon name="undo" size={18} />
		</button>
		<button
			class="round theirs"
			onclick={() => decide('theirs')}
			aria-label="Gehört {targetInfo?.theirs} (Pfeil hoch)"
		>
			<Icon name="arrowUp" />
			<small>{targetInfo?.theirs}</small>
		</button>
		<button
			class="round shared"
			onclick={() => decide('shared')}
			aria-label="Teilen (Pfeil rechts)"
		>
			<Icon name="share" />
			<small>Teilen</small>
		</button>
	</div>
	<p class="muted legend">← meins · ↑ {targetInfo?.theirs} · teilen →</p>
{:else}
	<div class="stack">
		<h2 class="row done"><Icon name="party" size={28} /> Fertig geswiped</h2>
		<ul class="list">
			{#each preview as p (p.id)}
				<li class="item">
					<span class="grow">{p.name}</span>
					<strong><Amount cents={p.cents} /></strong>
				</li>
			{/each}
		</ul>
		<p class="muted">Du hast bezahlt. Die anderen Anteile werden dir gutgeschrieben.</p>
		{#if form?.message}<p class="error">{form.message}</p>{/if}
		<form method="POST" action="?/book" use:enhance>
			<input type="hidden" name="target" value={target} />
			<input type="hidden" name="decisions" value={JSON.stringify(decisions)} />
			<button class="btn primary block"><Icon name="check" /> Buchen</button>
		</form>
		<button class="btn block" onclick={undo}><Icon name="undo" /> Letzte zurück</button>
	</div>
{/if}

<style>
	.intro {
		margin: 0;
	}
	.pick {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 16px;
		min-height: 56px;
		cursor: pointer;
	}
	.pick:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	.done {
		color: var(--accent);
		gap: 8px;
	}
	.grow {
		flex: 1;
	}
	.progress {
		height: 4px;
		background: var(--surface-2);
		border-radius: 2px;
		overflow: hidden;
	}
	.progress span {
		display: block;
		height: 100%;
		background: var(--accent);
		transition: width 0.2s;
	}
	.status {
		font-size: 0.9rem;
	}
	.link {
		all: unset;
		color: var(--accent);
		cursor: pointer;
		text-decoration: underline;
	}

	.deck {
		position: relative;
		height: min(52dvh, 420px);
		margin: 8px 0 20px;
	}
	.swipe {
		position: absolute;
		inset: 0;
		box-shadow: var(--shadow);
		border-radius: 24px;
	}
	.behind {
		transform: translateY(calc(var(--depth) * 10px)) scale(calc(1 - var(--depth) * 0.04));
		opacity: calc(1 - var(--depth) * 0.25);
	}
	.top {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		gap: 16px;
		padding: 32px 24px;
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
	.name {
		font-size: 1.6rem;
		word-break: break-word;
	}
	.price {
		font-size: 2.6rem;
		letter-spacing: -0.02em;
	}
	.stamp {
		position: absolute;
		top: 24px;
		padding: 6px 14px;
		border: 3px solid;
		border-radius: 10px;
		font-weight: 800;
		text-transform: uppercase;
		font-size: 1.2rem;
	}
	.stamp.mine {
		right: 24px;
		color: var(--muted);
		transform: rotate(12deg);
	}
	.stamp.shared {
		left: 24px;
		color: var(--shared);
		transform: rotate(-12deg);
	}
	.stamp.theirs {
		left: 50%;
		transform: translateX(-50%);
		color: var(--accent);
	}

	.actions {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 16px;
	}
	.round {
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		width: 68px;
		height: 68px;
		border-radius: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		cursor: pointer;
		box-shadow: var(--shadow);
		font: inherit;
	}
	.round small {
		font-size: 0.65rem;
		font-weight: 600;
		max-width: 60px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.round.undo {
		width: 44px;
		height: 44px;
		color: var(--muted);
	}
	.round.shared {
		color: var(--shared);
	}
	.round.theirs {
		color: var(--accent);
	}
	.round:disabled {
		opacity: 0.4;
	}
	.legend {
		text-align: center;
		font-size: 0.8rem;
	}
</style>
