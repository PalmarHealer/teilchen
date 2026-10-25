<script lang="ts" generics="T extends string">
	import { Select } from 'bits-ui';
	import Icon from './Icon.svelte';

	interface Option {
		value: T;
		label: string;
		icon?: string;
	}

	/** shadcn-style select on bits-ui; with `name` it posts its value like a native select. */
	let {
		name,
		value = $bindable(),
		options,
		label,
		onchange
	}: {
		name?: string;
		value: T;
		options: Option[];
		label?: string;
		onchange?: (value: T) => void;
	} = $props();

	const id = `select-${Math.random().toString(36).slice(2, 9)}`;
	const selected = $derived(options.find((o) => o.value === value) ?? options[0]);
</script>

<div class="flex flex-col gap-2">
	{#if label}<span class="text-sm leading-none font-medium" id="{id}-label">{label}</span>{/if}
	<Select.Root
		type="single"
		{name}
		bind:value={value as string}
		onValueChange={(v) => onchange?.(v as T)}
		items={options}
	>
		<Select.Trigger
			aria-labelledby={label ? `${id}-label` : undefined}
			class="bg-card dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/40 data-[state=open]:border-ring flex h-10 w-full items-center gap-2 rounded-md border px-3 text-left text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] md:text-sm"
		>
			{#if selected?.icon}
				<span class="text-muted-foreground"><Icon name={selected.icon} size={18} /></span>
			{/if}
			<span class="min-w-0 flex-1 truncate">{selected?.label}</span>
			<span class="text-muted-foreground"><Icon name="chevronDown" size={16} /></span>
		</Select.Trigger>
		<Select.Portal>
			<Select.Content
				sideOffset={4}
				class="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--bits-select-content-available-height) w-(--bits-select-anchor-width) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md"
			>
				<Select.Viewport>
					{#each options as option (option.value)}
						<Select.Item
							value={option.value}
							label={option.label}
							class="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-2 pr-8 pl-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50"
						>
							{#snippet children({ selected: isSelected })}
								{#if option.icon}
									<span class="text-muted-foreground"><Icon name={option.icon} size={18} /></span>
								{/if}
								<span class="truncate">{option.label}</span>
								{#if isSelected}
									<span class="text-primary absolute right-2 flex"
										><Icon name="check" size={16} /></span
									>
								{/if}
							{/snippet}
						</Select.Item>
					{/each}
				</Select.Viewport>
			</Select.Content>
		</Select.Portal>
	</Select.Root>
</div>
