<script lang="ts">
	import Icon from './Icon.svelte';

	/** A styled picker; the native input stays (invisible) so the form posts the files. */
	let {
		name,
		accept,
		multiple = false,
		label,
		emptyText
	}: {
		name: string;
		accept?: string;
		multiple?: boolean;
		label: string;
		emptyText: string;
	} = $props();

	let files = $state<string[]>([]);
</script>

<label
	class="hover:border-primary/60 hover:bg-accent/40 has-focus-visible:border-ring has-focus-visible:ring-ring/40 relative flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 transition-colors has-focus-visible:ring-[3px]"
>
	<input
		type="file"
		{name}
		{accept}
		{multiple}
		required
		class="absolute inset-0 cursor-pointer opacity-0"
		onchange={(e) => (files = [...(e.currentTarget.files ?? [])].map((f) => f.name))}
	/>
	<span class="bg-primary/12 text-primary grid size-10 shrink-0 place-items-center rounded-md">
		<Icon name="pdf" size={20} />
	</span>
	<span class="flex min-w-0 flex-col">
		<span class="text-sm font-medium">{label}</span>
		<span class="text-muted-foreground truncate text-xs"
			>{files.length ? files.join(', ') : emptyText}</span
		>
	</span>
</label>
