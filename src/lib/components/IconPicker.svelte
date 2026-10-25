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
	import { Input } from './ui/input/index.ts';

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

<fieldset class="flex flex-col gap-2">
	<legend class="mb-2 text-sm leading-none font-medium">{legend}</legend>
	<div class="relative">
		<span
			class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
		>
			<Icon name="search" size={16} />
		</span>
		<Input
			type="search"
			bind:value={query}
			placeholder={i.t('common.iconSearch')}
			aria-label={i.t('common.iconSearch')}
			autocomplete="off"
			class="pl-9"
		/>
	</div>
	{#if shown.length}
		<div class="-m-1 grid max-h-56 grid-cols-6 gap-2 overflow-y-auto p-1 [scrollbar-width:thin]">
			{#each shown as key (key)}
				<label
					class="text-muted-foreground hover:bg-accent has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-ring/50 relative grid aspect-square cursor-pointer place-items-center rounded-md border transition-colors has-focus-visible:ring-[3px]"
					title={key}
				>
					<input type="radio" {name} value={key} bind:group={value} class="sr-only" />
					<Icon name={key} size={20} />
				</label>
			{/each}
		</div>
	{:else}
		<p class="text-muted-foreground text-sm">{i.t('common.iconNoResults')}</p>
	{/if}
	{#if value && results && !results.includes(value)}
		<input type="hidden" {name} {value} />
	{/if}
</fieldset>
