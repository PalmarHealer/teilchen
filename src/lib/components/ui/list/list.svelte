<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLUListElement>> = $props();
</script>

<ul
	bind:this={ref}
	data-slot="list"
	class={cn('bg-card divide-y overflow-hidden rounded-xl border shadow-xs', className)}
	{...restProps}
>
	{@render children?.()}
</ul>
