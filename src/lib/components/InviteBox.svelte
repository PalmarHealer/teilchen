<script lang="ts">
	import Icon from './Icon.svelte';

	let { url, text }: { url: string; text: string } = $props();
	let copied = $state(false);

	async function share() {
		if (navigator.share) {
			await navigator.share({ title: 'Teilchen', text, url }).catch(() => {});
		} else {
			await navigator.clipboard.writeText(url);
			copied = true;
		}
	}
</script>

<div class="card stack">
	<input readonly value={url} onfocus={(e) => e.currentTarget.select()} />
	<button type="button" class="btn primary" onclick={share}>
		<Icon name="share" />
		{copied ? 'Kopiert!' : 'Link teilen'}
	</button>
	<small class="muted">Gültig für 7 Tage.</small>
</div>
