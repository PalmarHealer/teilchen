<script lang="ts" generics="T extends string">
	import Icon from './Icon.svelte';

	interface Option {
		value: T;
		label: string;
		icon?: string;
	}

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

	let open = $state(false);
	let active = $state(0);
	let root: HTMLDivElement;
	let button: HTMLButtonElement;
	const id = `select-${Math.random().toString(36).slice(2, 9)}`;
	const selected = $derived(options.find((o) => o.value === value) ?? options[0]);

	function toggle(force?: boolean) {
		open = force ?? !open;
		if (open)
			active = Math.max(
				0,
				options.findIndex((o) => o.value === value)
			);
	}

	function choose(option: Option) {
		value = option.value;
		open = false;
		button.focus();
		onchange?.(option.value);
	}

	function keydown(e: KeyboardEvent) {
		if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
			e.preventDefault();
			toggle(true);
			return;
		}
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			toggle(false);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = Math.min(options.length - 1, active + 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(0, active - 1);
		} else if (e.key === 'Home') {
			e.preventDefault();
			active = 0;
		} else if (e.key === 'End') {
			e.preventDefault();
			active = options.length - 1;
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const option = options[active];
			if (option) choose(option);
		} else if (e.key === 'Tab') {
			toggle(false);
		}
	}

	function outside(e: PointerEvent) {
		if (open && !root.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window onpointerdown={outside} />

<div class="select" bind:this={root}>
	{#if label}<span class="label" id="{id}-label">{label}</span>{/if}
	{#if name}<input type="hidden" {name} {value} />{/if}
	<button
		bind:this={button}
		type="button"
		class="trigger"
		role="combobox"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-labelledby={label ? `${id}-label` : undefined}
		aria-activedescendant={open ? `${id}-${active}` : undefined}
		onclick={() => toggle()}
		onkeydown={keydown}
	>
		{#if selected?.icon}<Icon name={selected.icon} size={20} />{/if}
		<span class="value">{selected?.label}</span>
		<span class="chevron" class:open><Icon name="chevronDown" size={18} /></span>
	</button>
	{#if open}
		<ul
			class="menu"
			role="listbox"
			id="{id}-list"
			aria-labelledby={label ? `${id}-label` : undefined}
		>
			{#each options as option, idx (option.value)}
				<li
					id="{id}-{idx}"
					role="option"
					aria-selected={option.value === value}
					class:active={idx === active}
					onpointerenter={() => (active = idx)}
					onclick={() => choose(option)}
					onkeydown={() => {}}
				>
					{#if option.icon}<Icon name={option.icon} size={20} />{/if}
					<span class="value">{option.label}</span>
					{#if option.value === value}<span class="tick"><Icon name="check" size={18} /></span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.select {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.label {
		font-size: 0.9rem;
		color: var(--muted);
	}
	.trigger {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		height: var(--control-h);
		padding: 0 14px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 12px;
		cursor: pointer;
		color: var(--ink);
	}
	.trigger:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.value {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.chevron {
		display: grid;
		color: var(--muted);
		transition: transform 0.15s;
	}
	.chevron.open {
		transform: rotate(180deg);
	}
	.menu {
		position: absolute;
		z-index: 20;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 6px;
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 14px;
		box-shadow: var(--shadow);
		max-height: 280px;
		overflow-y: auto;
	}
	.menu li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 10px;
		cursor: pointer;
	}
	.menu li.active {
		background: var(--surface-2);
	}
	.menu li[aria-selected='true'] {
		font-weight: 600;
	}
	.tick {
		display: grid;
		color: var(--accent);
	}
</style>
