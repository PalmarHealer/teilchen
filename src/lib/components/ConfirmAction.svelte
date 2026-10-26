<script lang="ts">
	import { enhance } from '$app/forms';
	import { AlertDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { useI18n } from '../i18n/index.ts';
	import { withToast } from '../toast.ts';
	import Icon from './Icon.svelte';
	import { Button, buttonVariants } from './ui/button/index.ts';

	/** A form action behind a confirmation dialog (instead of the browser's confirm()). */
	let {
		action,
		icon,
		label,
		question,
		confirmLabel,
		cancelLabel,
		danger = false,
		disabled = false,
		children
	}: {
		action: string;
		icon: string;
		label: string;
		question: string;
		confirmLabel: string;
		cancelLabel: string;
		danger?: boolean;
		disabled?: boolean;
		/** Extra fields submitted with the confirmation */
		children?: Snippet;
	} = $props();

	let open = $state(false);
	const i = useI18n();
	const report = withToast(i.t, { done: () => (open = false) });
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Trigger
		{disabled}
		class={buttonVariants({
			variant: danger ? 'destructive-outline' : 'outline',
			class: 'w-full'
		})}
	>
		<Icon name={icon} size={16} />
		{label}
	</AlertDialog.Trigger>
	<AlertDialog.Portal>
		<AlertDialog.Overlay
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
		/>
		<AlertDialog.Content
			class="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border p-6 shadow-lg"
		>
			<form method="POST" {action} use:enhance={report} class="grid gap-4">
				<AlertDialog.Title class="text-lg font-semibold">{label}</AlertDialog.Title>
				<AlertDialog.Description class="text-muted-foreground text-sm">
					{question}
				</AlertDialog.Description>
				{@render children?.()}
				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<AlertDialog.Cancel class={buttonVariants({ variant: 'outline' })}>
						{cancelLabel}
					</AlertDialog.Cancel>
					<Button type="submit" variant={danger ? 'destructive' : 'default'}>
						<Icon name={icon} size={16} />
						{confirmLabel}
					</Button>
				</div>
			</form>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
