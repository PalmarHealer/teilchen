<script lang="ts">
	import { cn } from '#lib/utils.ts';
	import Icon from './Icon.svelte';

	let {
		icon,
		size = 40,
		tone = 'primary',
		class: className
	}: { icon: string; size?: number; tone?: 'primary' | 'positive'; class?: string } = $props();
</script>

<span
	class={cn(
		'inline-grid shrink-0 place-items-center rounded-[30%]',
		tone === 'primary' ? 'bg-primary/12 text-primary' : 'bg-positive/12 text-positive',
		className
	)}
	style:width="{size}px"
	style:height="{size}px"
>
	<Icon name={icon} size={Math.round(size * 0.5)} />
</span>
