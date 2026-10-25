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

<label class="picker">
	<input
		type="file"
		{name}
		{accept}
		{multiple}
		required
		onchange={(e) => (files = [...(e.currentTarget.files ?? [])].map((f) => f.name))}
	/>
	<span class="icon"><Icon name="pdf" size={26} /></span>
	<span class="text">
		<strong>{label}</strong>
		<small class="muted">{files.length ? files.join(', ') : emptyText}</small>
	</span>
</label>

<style>
	.picker {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px;
		border: 1.5px dashed var(--line);
		border-radius: 14px;
		cursor: pointer;
	}
	.picker:hover,
	.picker:has(input:focus-visible) {
		border-color: var(--accent);
	}
	.picker:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		width: 100%;
		min-height: 0;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--accent) 14%, var(--surface));
		color: var(--accent);
		flex: none;
	}
	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.text small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
