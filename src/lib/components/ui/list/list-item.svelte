<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.ts';

	/** One row of a List; with `href` the whole row is a link. */
	let {
		href,
		class: className,
		children
	}: { href?: string; class?: string; children?: Snippet } = $props();
	const row = 'flex min-h-14 items-center gap-3 px-4 py-3';
</script>

<li data-slot="list-item">
	{#if href}
		<a
			{href}
			class={cn(
				row,
				'hover:bg-accent/60 focus-visible:bg-accent/60 transition-colors outline-none',
				className
			)}
		>
			{@render children?.()}
		</a>
	{:else}
		<div class={cn(row, className)}>{@render children?.()}</div>
	{/if}
</li>
