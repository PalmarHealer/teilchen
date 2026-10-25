<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { translate, useI18n, type MessageKey } from '#lib/i18n/index.ts';

	const i = useI18n();
	// Server code raises errors with message keys (e.g. error(404, 'errors.groupNotFound')).
	const message = $derived.by(() => {
		const raw = page.error?.message ?? '';
		const translated = raw.startsWith('errors.') ? translate(i.locale, raw as MessageKey) : raw;
		return translated === 'undefined' || !translated ? i.t('errors.generic') : translated;
	});
</script>

<Card.Root class="mt-[15dvh]">
	<Card.Content class="flex flex-col items-center gap-3 text-center">
		<h1 class="text-4xl font-semibold tabular-nums">{page.status}</h1>
		<p class="text-muted-foreground text-sm">{message}</p>
		<Button href="/" variant="outline">Teilchen</Button>
	</Card.Content>
</Card.Root>
