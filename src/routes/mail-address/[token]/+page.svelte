<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data } = $props();
	const i = useI18n();
</script>

<Card.Root class="mt-[15dvh]">
	<Card.Content class="flex flex-col items-center gap-4 text-center">
		<Icon name="mail" size={48} />
		<h1 class="text-xl font-semibold">{i.t('mailAddress.title')}</h1>
		<p class="text-muted-foreground text-sm break-all">
			{i.t('mailAddress.text', { address: data.address, name: data.user!.name })}
		</p>
		<form method="POST" class="w-full">
			<Button type="submit" size="lg" class="w-full">{i.t('mailAddress.confirm')}</Button>
		</form>
	</Card.Content>
</Card.Root>
