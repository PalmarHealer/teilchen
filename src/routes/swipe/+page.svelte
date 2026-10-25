<script lang="ts">
	import Amount from '#lib/components/Amount.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';

	let { data } = $props();
	const fmt = (d: Date) =>
		new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
</script>

<Header title="Einkäufe swipen" />

{#if data.open.length}
	<ul class="list">
		{#each data.open as r (r.id)}
			<li>
				<a href="/swipe/{r.id}">
					<span class="ico"><Icon name="receipt" /></span>
					<span class="grow">
						<strong>{fmt(r.purchasedAt)}</strong>
						<small class="muted">{r.market ?? 'REWE'} · {r.items} Positionen</small>
					</span>
					<strong><Amount cents={r.totalCents} /></strong>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<div class="card empty">
		<span class="party"><Icon name="party" size={40} /></span>
		<p><strong>Keine offenen Einkäufe</strong></p>
		<p class="muted">
			Verbinde dein REWE-Konto oder leite eBon-Mails weiter, dann landen neue Einkäufe automatisch
			hier.
		</p>
		<a class="btn" href="/einstellungen"><Icon name="mail" /> Import einrichten</a>
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
