<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils.ts';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...restProps
	}: WithElementRef<HTMLInputAttributes> = $props();
</script>

<input
	bind:this={ref}
	bind:value
	data-slot="input"
	class={cn(
		'bg-card dark:bg-input/30 border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-10 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
		'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
		'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
		className
	)}
	{...restProps}
/>
