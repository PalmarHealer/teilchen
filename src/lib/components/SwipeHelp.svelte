<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { useI18n } from '../i18n/index.ts';
	import Icon from './Icon.svelte';
	import { buttonVariants } from './ui/button/index.ts';

	/** The "?" in the swipe header: what each direction means. */
	let { theirs }: { theirs: string } = $props();
	const i = useI18n();

	const directions = $derived([
		{ icon: 'arrowLeft', tone: 'text-foreground', text: i.t('swipe.helpMine') },
		{ icon: 'arrowUp', tone: 'text-primary', text: i.t('swipe.helpTheirs', { name: theirs }) },
		{ icon: 'arrowRight', tone: 'text-shared', text: i.t('swipe.helpShared') }
	]);
	const notes = $derived([
		{ icon: 'undo', text: i.t('swipe.helpUndo') },
		{ icon: 'split', text: i.t('swipe.helpPieces') },
		{ icon: 'sparkles', text: i.t('swipe.helpDiscount') },
		{ icon: 'keyboard', text: i.t('swipe.helpKeys') }
	]);
</script>

<Dialog.Root>
	<Dialog.Trigger
		class={buttonVariants({ variant: 'ghost', size: 'icon' })}
		aria-label={i.t('swipe.help')}
	>
		<Icon name="help" size={24} />
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
		/>
		<Dialog.Content
			class="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border p-6 shadow-lg"
		>
			<Dialog.Title class="text-lg font-semibold">{i.t('swipe.help')}</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{i.t('swipe.helpIntro')}
			</Dialog.Description>
			<ul class="grid gap-2">
				{#each directions as d (d.icon)}
					<li class="flex items-center gap-3 rounded-lg border p-3 text-sm">
						<span class="bg-muted grid size-9 shrink-0 place-items-center rounded-full {d.tone}">
							<Icon name={d.icon} size={18} />
						</span>
						{d.text}
					</li>
				{/each}
			</ul>
			<ul class="text-muted-foreground grid gap-2.5 text-sm">
				{#each notes as n (n.icon)}
					<li class="flex gap-3">
						<span class="mt-0.5 shrink-0"><Icon name={n.icon} size={16} /></span>
						{n.text}
					</li>
				{/each}
			</ul>
			<Dialog.Close class={buttonVariants({ class: 'mt-1' })}>{i.t('swipe.helpClose')}</Dialog.Close
			>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
