<script lang="ts">
	import { Toaster as Sonner, type ToasterProps } from 'svelte-sonner';

	/** shadcn's toaster: sonner in the app's popover colours, above the content. */
	let { ...restProps }: ToasterProps = $props();
</script>

<Sonner
	theme="system"
	position="top-center"
	offset={{ top: 'max(16px, env(safe-area-inset-top))' }}
	mobileOffset={{ top: 'max(12px, env(safe-area-inset-top))' }}
	class="toaster group"
	style="--normal-bg: var(--popover); --normal-text: var(--popover-foreground); --normal-border: var(--border); --border-radius: var(--radius);"
	toastOptions={{
		class: 'font-sans shadow-md',
		classes: {
			error: '[&_[data-icon]]:text-destructive',
			success: '[&_[data-icon]]:text-positive'
		}
	}}
	{...restProps}
/>
