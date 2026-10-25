<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import { provideI18n, type MessageKey } from '#lib/i18n/index.ts';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	const i = provideI18n(() => data.locale);
	// The server sets <html lang>; keep it right when the language changes without a reload.
	$effect(() => {
		document.documentElement.lang = data.locale;
	});

	const nav: { href: string; label: MessageKey; icon: IconName }[] = [
		{ href: '/', label: 'nav.overview', icon: 'home' },
		{ href: '/swipe', label: 'nav.swipe', icon: 'swipe' },
		{ href: '/expenses', label: 'nav.expenses', icon: 'list' },
		{ href: '/groups', label: 'nav.groups', icon: 'users' },
		{ href: '/settings', label: 'nav.profile', icon: 'user' }
	];
	const badge =
		'bg-primary text-primary-foreground grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums';
	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

{#if data.user}
	<div class="min-h-dvh md:grid md:grid-cols-[220px_480px] md:justify-center md:gap-8 md:bg-outer">
		<!-- Mobile: tab bar at the bottom. Desktop: sidebar left of the portrait content column. -->
		<nav
			aria-label={i.t('nav.main')}
			class="bg-background/90 fixed inset-x-0 bottom-0 z-10 flex h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:sticky md:top-0 md:h-dvh md:flex-col md:gap-1 md:border-0 md:bg-transparent md:px-0 md:py-7 md:backdrop-blur-none"
		>
			<a
				href="/"
				class="mb-5 hidden items-center gap-2.5 px-3 text-lg font-semibold tracking-tight md:flex"
			>
				<img src="/icon.svg" alt="" width="28" height="28" />Teilchen
			</a>
			{#each nav as item (item.href)}
				<a
					href={item.href}
					aria-current={active(item.href) ? 'page' : undefined}
					class="text-muted-foreground aria-[current=page]:text-primary md:hover:bg-accent md:aria-[current=page]:bg-card md:aria-[current=page]:text-foreground flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-md md:px-3 md:py-2 md:text-sm md:aria-[current=page]:shadow-xs"
				>
					<span class="relative grid">
						<Icon name={item.icon} size={22} />
						{#if item.href === '/swipe' && data.openReceipts > 0}
							<span class="{badge} absolute -top-1.5 -right-2.5 md:hidden">{data.openReceipts}</span
							>
						{/if}
					</span>
					<span>{i.t(item.label)}</span>
					{#if item.href === '/swipe' && data.openReceipts > 0}
						<span class="{badge} ml-auto hidden md:grid">{data.openReceipts}</span>
					{/if}
				</a>
			{/each}
		</nav>
		<main
			class="bg-background min-h-dvh overflow-x-clip px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[calc(var(--nav-h)+24px)] md:border-x md:px-6 md:pt-7 md:pb-10 md:shadow-sm"
		>
			{@render children()}
		</main>
	</div>
{:else}
	<main class="mx-auto min-h-dvh max-w-[480px] px-4 pt-[max(12px,env(safe-area-inset-top))] pb-6">
		{@render children()}
	</main>
{/if}
