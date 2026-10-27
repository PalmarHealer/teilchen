<script lang="ts">
	import { APK_PATH } from '../android.ts';
	import { useI18n } from '../i18n/index.ts';
	import Icon from './Icon.svelte';
	import { Button } from './ui/button/index.ts';

	/** Offers the Android app on Android phones, until it's dismissed or opened inside the app. */
	const i = useI18n();
	const DISMISSED = 'teilchen-app-banner-dismissed';
	// The app opens the site with an android-app:// referrer; later full reloads don't keep it.
	const IN_APP = 'teilchen-in-app';
	let show = $state(false);

	$effect(() => {
		try {
			if (document.referrer.startsWith('android-app://')) sessionStorage.setItem(IN_APP, '1');
			const inApp =
				sessionStorage.getItem(IN_APP) === '1' || matchMedia('(display-mode: standalone)').matches;
			show = /Android/i.test(navigator.userAgent) && !inApp && !localStorage.getItem(DISMISSED);
		} catch {
			show = false;
		}
	});

	function dismiss() {
		show = false;
		try {
			localStorage.setItem(DISMISSED, '1');
		} catch {
			// Shown again next time, that's all
		}
	}
</script>

{#if show}
	<div class="bg-card mb-4 flex items-center gap-3 rounded-xl border p-3 shadow-xs">
		<span class="text-primary flex-none"><Icon name="android" size={26} /></span>
		<span class="flex min-w-0 flex-1 flex-col">
			<span class="text-sm font-medium">{i.t('android.bannerTitle')}</span>
			<span class="text-muted-foreground text-xs">{i.t('android.bannerText')}</span>
		</span>
		<Button href={APK_PATH} download size="sm" onclick={dismiss}>
			<Icon name="download" size={16} />
			{i.t('android.get')}
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="text-muted-foreground size-8"
			aria-label={i.t('common.close')}
			onclick={dismiss}><Icon name="x" size={18} /></Button
		>
	</div>
{/if}
