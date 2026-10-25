<script lang="ts">
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLLabelAttributes> = $props();
</script>

<label
	bind:this={ref}
	data-slot="label"
	class={cn('flex flex-col gap-2 text-sm leading-none font-medium select-none', className)}
	{...restProps}
>
	{@render children?.()}
</label>
