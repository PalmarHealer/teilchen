<script lang="ts">
	import { useI18n } from '#lib/i18n/index.ts';
	import { cn } from '#lib/utils.ts';

	let {
		cents,
		signed = false,
		class: className
	}: { cents: number; signed?: boolean; class?: string } = $props();
	const i = useI18n();
</script>

<span
	class={cn(
		'tabular',
		signed && cents > 0 && 'text-positive',
		signed && cents < 0 && 'text-destructive',
		className
	)}>{signed && cents > 0 ? '+' : ''}{i.money(cents)}</span
>
