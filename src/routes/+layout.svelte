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
	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

{#if data.user}
	<div class="shell">
		<nav aria-label={i.t('nav.main')}>
			<a class="brand" href="/">
				<img src="/icon.svg" alt="" width="32" height="32" /><span>Teilchen</span>
			</a>
			{#each nav as item (item.href)}
				<a href={item.href} aria-current={active(item.href) ? 'page' : undefined}>
					<span class="icon">
						<Icon name={item.icon} />
						{#if item.href === '/swipe' && data.openReceipts > 0}
							<span class="badge">{data.openReceipts}</span>
						{/if}
					</span>
					<span class="label">{i.t(item.label)}</span>
				</a>
			{/each}
		</nav>
		<main>{@render children()}</main>
	</div>
{:else}
	<main class="bare">{@render children()}</main>
{/if}

<style>
	main {
		padding: max(12px, env(safe-area-inset-top)) 16px calc(var(--nav-h) + 24px);
		min-height: 100dvh;
	}
	main.bare {
		padding-bottom: 24px;
	}

	/* Mobile: tab bar at the bottom */
	nav {
		position: fixed;
		z-index: 10;
		inset: auto 0 0 0;
		height: calc(var(--nav-h) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		display: flex;
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--line);
	}
	nav a {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		text-decoration: none;
		color: var(--muted);
		font-size: 0.7rem;
		font-weight: 600;
	}
	nav a[aria-current='page'] {
		color: var(--accent);
	}
	.brand {
		display: none;
	}
	.icon {
		position: relative;
		display: grid;
	}
	.badge {
		position: absolute;
		top: -6px;
		right: -10px;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 9px;
		background: var(--accent);
		color: var(--accent-ink);
		font-size: 0.68rem;
		display: grid;
		place-items: center;
	}

	/* Desktop: content stays portrait, navigation moves to the left of it */
	@media (min-width: 860px) {
		:global(body) {
			background: var(--outer);
		}
		.shell {
			display: grid;
			grid-template-columns: 220px 460px;
			justify-content: center;
			gap: 32px;
			min-height: 100dvh;
		}
		nav {
			position: sticky;
			top: 0;
			inset: auto;
			height: 100dvh;
			flex-direction: column;
			gap: 4px;
			padding: 28px 0;
			background: none;
			backdrop-filter: none;
			border: 0;
		}
		nav a {
			flex: none;
			flex-direction: row;
			justify-content: flex-start;
			gap: 12px;
			padding: 10px 14px;
			border-radius: 12px;
			font-size: 0.95rem;
		}
		nav a:hover {
			background: var(--surface-2);
		}
		nav a[aria-current='page'] {
			background: var(--surface);
		}
		.brand {
			display: flex;
			color: var(--ink);
			font-size: 1.15rem;
			font-weight: 800;
			margin-bottom: 16px;
		}
		main {
			background: var(--bg);
			padding: 28px 24px 40px;
			box-shadow: var(--shadow);
			border-left: 1px solid var(--line);
			border-right: 1px solid var(--line);
		}
		main.bare {
			max-width: 460px;
			margin: 0 auto;
		}
	}
</style>
