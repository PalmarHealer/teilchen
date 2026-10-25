<script lang="ts">
	import { useI18n } from '../i18n/index.ts';
	import Icon from './Icon.svelte';

	/** `value` is a local calendar date as YYYY-MM-DD (what the server expects). */
	let {
		name,
		value = $bindable(),
		label
	}: { name?: string; value: string; label?: string } = $props();

	const i = useI18n();
	let open = $state(false);
	let root: HTMLDivElement;
	const id = `date-${Math.random().toString(36).slice(2, 9)}`;

	const pad = (n: number) => String(n).padStart(2, '0');
	const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
	const parse = (s: string) => {
		const [y, m, d] = s.split('-').map(Number);
		return { y: y!, m: m! - 1, d: d! };
	};
	const today = (() => {
		const t = new Date();
		return iso(t.getFullYear(), t.getMonth(), t.getDate());
	})();

	let view = $state({ y: parse(value).y, m: parse(value).m });

	const locale = $derived(i.locale === 'de' ? 'de-DE' : 'en-GB');
	const shown = $derived(
		new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
			new Date(parse(value).y, parse(value).m, parse(value).d)
		)
	);
	const monthTitle = $derived(
		new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
			new Date(view.y, view.m, 1)
		)
	);
	const weekdays = $derived(
		// 2024-01-01 was a Monday
		Array.from({ length: 7 }, (_, k) =>
			new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + k))
		)
	);
	const cells = $derived.by(() => {
		const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday = 0
		const days = new Date(view.y, view.m + 1, 0).getDate();
		return [
			...Array.from({ length: first }, () => null),
			...Array.from({ length: days }, (_, k) => iso(view.y, view.m, k + 1))
		];
	});

	function toggle() {
		open = !open;
		if (open) view = { y: parse(value).y, m: parse(value).m };
	}
	function shift(delta: number) {
		const d = new Date(view.y, view.m + delta, 1);
		view = { y: d.getFullYear(), m: d.getMonth() };
	}
	function pick(day: string) {
		value = day;
		open = false;
	}
	function outside(e: PointerEvent) {
		if (open && !root.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window
	onpointerdown={outside}
	onkeydown={(e) => {
		if (open && e.key === 'Escape') open = false;
	}}
/>

<div class="date" bind:this={root}>
	{#if label}<span class="label" id="{id}-label">{label}</span>{/if}
	{#if name}<input type="hidden" {name} {value} />{/if}
	<button
		type="button"
		class="trigger"
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
		onclick={toggle}
	>
		<Icon name="calendar" size={20} />
		<span class="value" id="{id}-value">{shown}</span>
	</button>
	{#if open}
		<div class="popover" role="dialog" aria-label={label}>
			<div class="head">
				<button
					type="button"
					class="nav"
					aria-label={i.t('common.prevMonth')}
					onclick={() => shift(-1)}
				>
					<Icon name="back" size={18} />
				</button>
				<strong>{monthTitle}</strong>
				<button
					type="button"
					class="nav"
					aria-label={i.t('common.nextMonth')}
					onclick={() => shift(1)}
				>
					<Icon name="chevronRight" size={18} />
				</button>
			</div>
			<div class="grid">
				{#each weekdays as w (w)}<span class="wd">{w}</span>{/each}
				{#each cells as day, idx (day ?? `blank-${idx}`)}
					{#if day}
						<button
							type="button"
							class="day"
							class:today={day === today}
							class:selected={day === value}
							aria-pressed={day === value}
							onclick={() => pick(day)}>{Number(day.slice(8))}</button
						>
					{:else}
						<span></span>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.date {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.label {
		font-size: 0.9rem;
		color: var(--muted);
	}
	.trigger {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		height: var(--control-h);
		padding: 0 14px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 12px;
		cursor: pointer;
		color: var(--ink);
	}
	.trigger :global(svg) {
		color: var(--muted);
		flex: none;
	}
	.trigger:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.value {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.popover {
		position: absolute;
		z-index: 20;
		top: calc(100% + 6px);
		right: 0;
		width: min(300px, calc(100vw - 32px));
		padding: 12px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 16px;
		box-shadow: var(--shadow);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
		text-transform: capitalize;
	}
	.nav {
		all: unset;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		cursor: pointer;
	}
	.nav:hover,
	.nav:focus-visible {
		background: var(--surface-2);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
		text-align: center;
	}
	.wd {
		font-size: 0.75rem;
		color: var(--muted);
		padding: 4px 0;
	}
	.day {
		all: unset;
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		border-radius: 50%;
		cursor: pointer;
		font-variant-numeric: tabular-nums;
	}
	.day:hover,
	.day:focus-visible {
		background: var(--surface-2);
	}
	.day.today {
		color: var(--accent);
		font-weight: 700;
	}
	.day.selected {
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 700;
	}
</style>
