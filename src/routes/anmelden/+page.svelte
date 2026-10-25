<script lang="ts">
	let { data } = $props();
</script>

<div class="hero">
	<img src="/icon.svg" alt="" width="96" height="96" />
	<h1>Teilchen</h1>
	<p class="muted">Einkäufe swipen, Kosten teilen, fair verrechnen.</p>
	<a class="btn primary block" href="/auth/login?next={encodeURIComponent(data.next)}">Anmelden</a>
</div>

<style>
	.hero {
		min-height: 80dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 12px;
	}
	h1 {
		font-size: 2.2rem;
	}
	p {
		margin: 0 0 24px;
	}
</style>
