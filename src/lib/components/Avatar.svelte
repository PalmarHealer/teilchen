<script lang="ts">
	let {
		name,
		src = null,
		size = 40
	}: { name: string; src?: string | null; size?: number } = $props();
	const initials = $derived(
		name
			.split(/\s+/)
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);
	const hue = $derived([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360);
</script>

{#if src}
	<img {src} alt="" width={size} height={size} style:border-radius="50%" />
{:else}
	<span
		class="avatar"
		style:width="{size}px"
		style:height="{size}px"
		style:font-size="{size * 0.4}px"
		style:background="hsl({hue} 55% 88%)"
		style:color="hsl({hue} 45% 28%)">{initials}</span
	>
{/if}

<style>
	.avatar {
		display: inline-grid;
		place-items: center;
		border-radius: 50%;
		font-weight: 700;
		flex: none;
	}
</style>
