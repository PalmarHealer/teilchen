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
	<img {src} alt="" width={size} height={size} class="shrink-0 rounded-full object-cover" />
{:else}
	<span
		class="inline-grid shrink-0 place-items-center rounded-full font-semibold"
		style:width="{size}px"
		style:height="{size}px"
		style:font-size="{Math.round(size * 0.38)}px"
		style:background="light-dark(hsl({hue} 45% 90%), hsl({hue} 25% 22%))"
		style:color="light-dark(hsl({hue} 40% 30%), hsl({hue} 45% 78%))">{initials}</span
	>
{/if}
