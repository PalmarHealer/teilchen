<script lang="ts">
	import Icon from './Icon.svelte';
	let { icon, size = 40 }: { icon: string; size?: number } = $props();
</script>

<span class="gi" style:width="{size}px" style:height="{size}px">
	<Icon name={icon} size={size * 0.55} />
</span>

<style>
	.gi {
		display: inline-grid;
		place-items: center;
		flex: none;
		border-radius: 30%;
		background: color-mix(in srgb, var(--accent) 14%, var(--surface));
		color: var(--accent);
	}
</style>
