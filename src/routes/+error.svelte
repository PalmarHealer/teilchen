<script lang="ts">
	import { page } from '$app/state';
	import { translate, useI18n, type MessageKey } from '#lib/i18n/index.ts';

	const i = useI18n();
	// Server code raises errors with message keys (e.g. error(404, 'errors.groupNotFound')).
	const message = $derived.by(() => {
		const raw = page.error?.message ?? '';
		const translated = raw.startsWith('errors.') ? translate(i.locale, raw as MessageKey) : raw;
		return translated === 'undefined' || !translated ? i.t('errors.generic') : translated;
	});
</script>

<div class="card stack err">
	<h1>{page.status}</h1>
	<p>{message}</p>
	<a class="btn" href="/">Teilchen</a>
</div>

<style>
	.err {
		margin-top: 15dvh;
		text-align: center;
	}
	p {
		margin: 0;
	}
</style>
