<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.ts';

	let { class: className, children }: { class?: string; children?: Snippet } = $props();
</script>

<h2 class={cn('text-muted-foreground mt-3 px-1 text-sm font-medium', className)}>
	{@render children?.()}
</h2>
