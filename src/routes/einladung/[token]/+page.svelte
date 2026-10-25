<script lang="ts">
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	let { data } = $props();
</script>

<div class="card stack invite">
	<GroupIcon icon={data.groupIcon ?? 'users'} size={72} />
	<h1>
		{#if data.groupName}
			{data.inviterName} lädt dich in „{data.groupName}“ ein
		{:else}
			{data.inviterName} möchte mit dir Kosten teilen
		{/if}
	</h1>
	<form method="POST">
		<button class="btn primary block">Annehmen</button>
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
