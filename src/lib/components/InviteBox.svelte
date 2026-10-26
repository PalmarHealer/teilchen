<script lang="ts">
	import { useI18n } from '../i18n/index.ts';
	import { toast } from '../toast.ts';
	import Icon from './Icon.svelte';
	import { Button } from './ui/button/index.ts';
	import * as Card from './ui/card/index.ts';
	import { Input } from './ui/input/index.ts';

	let { url, text }: { url: string; text: string } = $props();
	const i = useI18n();

	async function share() {
		if (navigator.share) {
			await navigator.share({ title: 'Teilchen', text, url }).catch(() => {});
		} else {
			await navigator.clipboard.writeText(url);
			toast.success(i.t('common.copied'));
		}
	}
</script>

<Card.Root>
	<Card.Content class="flex flex-col gap-3">
		<div class="flex gap-2">
			<Input readonly value={url} onfocus={(e) => e.currentTarget.select()} class="tabular" />
			<Button onclick={share}>
				<Icon name="share" size={16} />
				{i.t('invite.share')}
			</Button>
		</div>
		<p class="text-muted-foreground text-xs">{i.t('invite.validFor')}</p>
	</Card.Content>
</Card.Root>
