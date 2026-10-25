<script lang="ts">
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data } = $props();
	const i = useI18n();
</script>

<div class="card stack invite">
	<GroupIcon icon={data.groupIcon ?? 'users'} size={72} />
	<h1>
		{#if data.groupName}
			{i.t('invite.group', { inviter: data.inviterName, group: data.groupName })}
		{:else}
			{i.t('invite.direct', { inviter: data.inviterName })}
		{/if}
	</h1>
	<form method="POST">
		<button class="btn primary block">{i.t('invite.accept')}</button>
	</form>
</div>

<style>
	.invite {
		text-align: center;
		margin-top: 15dvh;
		align-items: center;
	}
	h1 {
		font-size: 1.3rem;
	}
	form {
		width: 100%;
	}
</style>
