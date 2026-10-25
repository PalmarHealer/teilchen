<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useI18n } from '../i18n/index.ts';
	import Icon from './Icon.svelte';
	import { Button } from './ui/button/index.ts';
	let { title, back, actions }: { title: string; back?: string; actions?: Snippet } = $props();
	const i = useI18n();
</script>

<header class="flex items-center gap-2 pt-1 pb-5">
	{#if back}
		<Button href={back} variant="ghost" size="icon" class="-ml-2" aria-label={i.t('common.back')}>
			<Icon name="back" size={20} />
		</Button>
	{/if}
	<h1 class="min-w-0 flex-1 truncate text-2xl font-semibold">{title}</h1>
	<div class="flex gap-2">{@render actions?.()}</div>
</header>
