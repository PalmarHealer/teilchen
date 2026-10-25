<script lang="ts">
	import GroupIcon from '#lib/components/GroupIcon.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data } = $props();
	const i = useI18n();
</script>

<Card.Root class="mt-[15dvh]">
	<Card.Content class="flex flex-col items-center gap-4 text-center">
		<GroupIcon icon={data.groupIcon ?? 'users'} size={64} />
		<h1 class="text-xl font-semibold">
			{#if data.groupName}
				{i.t('invite.group', { inviter: data.inviterName, group: data.groupName })}
			{:else}
				{i.t('invite.direct', { inviter: data.inviterName })}
			{/if}
		</h1>
		<form method="POST" class="w-full">
			<Button type="submit" size="lg" class="w-full">{i.t('invite.accept')}</Button>
		</form>
	</Card.Content>
</Card.Root>
