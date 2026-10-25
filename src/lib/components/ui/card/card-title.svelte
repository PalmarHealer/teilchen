<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLHeadingElement>> = $props();
</script>

<h2
	bind:this={ref}
	data-slot="card-title"
	class={cn('text-base leading-none font-semibold', className)}
	{...restProps}
>
	{@render children?.()}
</h2>
