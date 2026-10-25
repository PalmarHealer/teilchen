<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import Header from '#lib/components/Header.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import InviteBox from '#lib/components/InviteBox.svelte';

	let { data, form } = $props();
	let copied = $state(false);

	async function copyInbox() {
		if (!data.inboxAddress) return;
		await navigator.clipboard.writeText(data.inboxAddress);
		copied = true;
	}
</script>

<Header title="Profil" />

<div class="stack">
	<section class="card row">
		<Avatar name={data.user!.name} src={data.user!.avatarUrl} size={56} />
		<span class="grow">
			<strong>{data.user!.name}</strong>
			<small class="muted">{data.email}</small>
		</span>
	</section>

	<h2 class="section-title">Jemanden einladen</h2>
	<form method="POST" action="?/invite" use:enhance>
		<button class="btn block"><Icon name="user" /> Einladungslink erstellen</button>
	</form>
	{#if form?.inviteUrl}
		<InviteBox url={form.inviteUrl} text="Lass uns Kosten auf Teilchen teilen" />
	{/if}

	<h2 class="section-title">eBons per Mail</h2>
	<section class="card stack">
		{#if data.inboxAddress}
			<p>
				Leite deine REWE-eBon-Mails an diese Adresse weiter. Am besten richtest du dafür eine
				automatische Weiterleitung für <code>ebon@mailing.rewe.de</code> ein.
			</p>
			<button class="btn" onclick={copyInbox}>
				<Icon name="mail" /> <span class="addr">{data.inboxAddress}</span>
			</button>
			{#if copied}<small class="muted">Kopiert</small>{/if}
			<small class="muted">
				Weiterleitungen von <strong>{data.email}</strong> werden auch ohne den +-Teil erkannt.
			</small>
		{:else}
			<p class="muted">Kein eBon-Postfach konfiguriert (INBOX_ADDRESS).</p>
		{/if}
	</section>

	<h2 class="section-title">REWE-Konto</h2>
	<section class="card stack">
		{#if data.rewe}
			<p class="row connected">
				<Icon name="done" /> Verbunden.
				{#if data.rewe.lastSyncAt}
					Zuletzt synchronisiert {new Date(data.rewe.lastSyncAt).toLocaleString('de-DE')}.
				{:else}
					Der erste Abgleich läuft in Kürze.
				{/if}
			</p>
			{#if data.rewe.lastError}<p class="error">{data.rewe.lastError}</p>{/if}
			<form method="POST" action="?/reweDisconnect" use:enhance>
				<button class="btn block">Trennen</button>
			</form>
		{:else if form?.reweAuthUrl}
			<ol>
				<li>
					<a href={form.reweAuthUrl} target="_blank" rel="noreferrer">Bei REWE anmelden ↗</a>
					(am besten in Chrome).
				</li>
				<li>
					Nach dem Login lädt die Seite nicht weiter. Das ist normal. Kopiere die Adresse, die mit <code
						>de.rewe.app://redirect?code=</code
					> beginnt. Du findest sie in der Adresszeile oder in den DevTools unter „Netzwerk“.
				</li>
				<li>Füge sie hier ein:</li>
			</ol>
			<form method="POST" action="?/reweFinish" use:enhance class="stack">
				<input name="redirect" placeholder="de.rewe.app://redirect?code=…" required />
				<button class="btn primary">Verbinden</button>
			</form>
		{:else}
			<p class="muted">
				Lädt deine Einkäufe automatisch. Das läuft über die inoffizielle Schnittstelle der REWE-App
				und kann daher jederzeit ausfallen. Die eBon-Mail ist der robuste Weg.
			</p>
			<form method="POST" action="?/reweStart" use:enhance>
				<button class="btn block">REWE-Konto verbinden</button>
			</form>
		{/if}
		{#if form?.reweError}<p class="error">{form.reweError}</p>{/if}
	</section>

	<h2 class="section-title">eBon-PDF hochladen</h2>
	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance
		class="card stack"
	>
		<input type="file" name="pdf" accept="application/pdf" multiple required />
		<button class="btn"><Icon name="receipt" /> Importieren</button>
		{#if form?.imported}<small class="plus">{form.imported} Einkauf(e) importiert</small>{/if}
		{#if form?.uploadError}<small class="error">{form.uploadError}</small>{/if}
	</form>

	<form method="POST" action="/auth/logout">
		<button class="btn block">Abmelden</button>
	</form>
</div>

<style>
	.grow {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	p {
		margin: 0;
	}
	.connected {
		gap: 8px;
		color: var(--plus);
	}
	ol {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	code {
		font-size: 0.85em;
		word-break: break-all;
	}
	.addr {
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
