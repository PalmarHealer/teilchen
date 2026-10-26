<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { clearPageCaches } from '#lib/page-cache.ts';

	let { data } = $props();
	const i = useI18n();
	// Logged out (or the session ended): the previous user's pages must not stay readable offline.
	$effect(() => {
		void clearPageCaches();
	});
</script>

<div class="flex min-h-[85dvh] flex-col items-center justify-center gap-3 text-center">
	<img src="/icon.svg" alt="" width="72" height="72" />
	<h1 class="text-3xl font-semibold">Teilchen</h1>
	<p class="text-muted-foreground mb-6 text-sm">{i.t('app.tagline')}</p>
	<Button href="/auth/login?next={encodeURIComponent(data.next)}" size="lg" class="w-full">
		{i.t('login.button')}
	</Button>
</div>
