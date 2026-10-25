<script lang="ts" module>
	import type { IconEntry } from '../icon-search.ts';

	// Loaded once per page session, only when someone actually searches.
	let indexPromise: Promise<IconEntry[]> | undefined;
	const loadIndex = () =>
		(indexPromise ??= fetch('/icons/index.json').then((r) => r.json() as Promise<IconEntry[]>));
</script>

<script lang="ts">
	import { useI18n } from '../i18n/index.ts';
	import { searchIcons } from '../icon-search.ts';
	import Icon from './Icon.svelte';

	/** Suggestions plus search over all Tabler icons; submits the chosen name as `name`. */
	let {
		value = $bindable(),
		suggestions,
		legend,
		name = 'icon'
	}: { value: string | null; suggestions: string[]; legend: string; name?: string } = $props();

	const i = useI18n();
	let query = $state('');
	let results = $state<string[] | null>(null);
	let token = 0;

	$effect(() => {
		const q = query.trim();
		const mine = ++token;
		if (!q) {
			results = null;
			return;
		}
		void loadIndex().then((index) => {
			if (mine === token) results = searchIcons(index, q);
		});
	});

	// Keep a chosen icon visible even when it isn't one of the suggestions.
	const shown = $derived(
		results ?? (value && !suggestions.includes(value) ? [value, ...suggestions] : suggestions)
	);
</script>

<fieldset class="picker">
	<legend class="muted">{legend}</legend>
	<label class="search">
		<Icon name="search" size={18} />
		<input
			type="search"
			bind:value={query}
			placeholder={i.t('common.iconSearch')}
			aria-label={i.t('common.iconSearch')}
			autocomplete="off"
		/>
	</label>
	{#if shown.length}
		<div class="grid">
			{#each shown as key (key)}
				<label class="pick" title={key}>
					<input type="radio" {name} value={key} bind:group={value} />
					<Icon name={key} />
				</label>
			{/each}
		</div>
	{:else}
		<p class="muted none">{i.t('common.iconNoResults')}</p>
	{/if}
	{#if value && results && !results.includes(value)}
		<input type="hidden" {name} {value} />
	{/if}
</fieldset>

<style>
	.picker {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	legend {
		font-size: 0.9rem;
		margin-bottom: 6px;
	}
	.search {
		position: relative;
		display: flex;
		align-items: center;
		color: var(--muted);
	}
	.search :global(svg) {
		position: absolute;
		left: 14px;
		pointer-events: none;
	}
	.search input {
		padding-left: 42px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 8px;
		max-height: 224px;
		overflow-y: auto;
		scrollbar-width: thin;
		/* room for the focus outline, which overflow would otherwise clip */
		padding: 3px;
		margin: -3px;
	}
	.pick {
		position: relative;
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 12px;
		color: var(--muted);
		cursor: pointer;
	}
	.pick:has(input:checked) {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
	}
	.pick:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.pick input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.none {
		margin: 0;
		font-size: 0.9rem;
	}
</style>
