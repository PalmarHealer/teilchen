<script lang="ts">
	import { GROUP_ICONS } from '../group-icons.ts';
	import Icon from './Icon.svelte';

	let { value = $bindable(), legend }: { value: string; legend: string } = $props();
</script>

<fieldset class="icons">
	<legend class="muted">{legend}</legend>
	{#each GROUP_ICONS as key (key)}
		<label class="pick" title={key}>
			<input type="radio" name="icon" value={key} bind:group={value} />
			<Icon name={key} />
		</label>
	{/each}
</fieldset>

<style>
	.icons {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 8px;
	}
	legend {
		font-size: 0.9rem;
		margin-bottom: 6px;
	}
	.pick {
		position: relative;
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 12px;
		color: var(--muted);
		cursor: pointer;
	}
	.pick:has(input:checked) {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
	}
	.pick:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.pick input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
</style>
