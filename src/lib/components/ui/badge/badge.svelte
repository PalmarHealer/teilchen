<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground border-transparent',
				secondary: 'bg-secondary text-secondary-foreground border-transparent',
				outline: 'text-foreground',
				positive: 'bg-positive/12 text-positive border-transparent'
			}
		},
		defaultVariants: { variant: 'default' }
	});
	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.ts';

	let {
		class: className,
		variant = 'default',
		children,
		...restProps
	}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant } = $props();
</script>

<span data-slot="badge" class={cn(badgeVariants({ variant }), className)} {...restProps}>
	{@render children?.()}
</span>
