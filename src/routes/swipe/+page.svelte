<script lang="ts">
	import Amount from '#lib/components/Amount.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data } = $props();
	const i = useI18n();
	const fmt = (d: Date) => i.date(d, { weekday: 'short', day: '2-digit', month: 'short' });
</script>

<Header title={i.t('swipe.title')} />

{#if data.open.length}
	<ul class="list">
		{#each data.open as r (r.id)}
			<li>
				<a href="/swipe/{r.id}">
					<span class="ico"><Icon name="receipt" /></span>
					<span class="grow">
						<strong>{fmt(r.purchasedAt)}</strong>
						<small class="muted">{r.market ?? 'REWE'} · {i.t('swipe.items', { n: r.items })}</small>
					</span>
					<strong><Amount cents={r.totalCents} /></strong>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<div class="card empty">
		<span class="party"><Icon name="party" size={40} /></span>
		<p><strong>{i.t('swipe.emptyTitle')}</strong></p>
		<p class="muted">{i.t('swipe.emptyText')}</p>
		<a class="btn" href="/settings"><Icon name="mail" /> {i.t('swipe.setupImport')}</a>
	</div>
{/if}

<style>
	.ico {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 12px;
		background: var(--surface-2);
		color: var(--accent);
	}
	.grow {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.empty {
		text-align: center;
	}
	.party {
		color: var(--accent);
	}
	.empty p {
		margin: 0 0 8px;
	}
</style>
