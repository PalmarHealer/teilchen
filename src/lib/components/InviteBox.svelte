<script lang="ts">
	import { useI18n } from '../i18n/index.ts';
	import Icon from './Icon.svelte';

	let { url, text }: { url: string; text: string } = $props();
	let copied = $state(false);
	const i = useI18n();

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
		{copied ? i.t('common.copied') : i.t('invite.share')}
	</button>
	<small class="muted">{i.t('invite.validFor')}</small>
</div>
