<script lang="ts">
	import ExpenseForm from '#lib/components/ExpenseForm.svelte';
	import Header from '#lib/components/Header.svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const i = useI18n();

	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	// Initial values come from the URL (?person=, ?group=); the form owns them afterwards.
	// svelte-ignore state_referenced_locally
	const initial = {
		title: '',
		amount: '',
		date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
		context: data.preset.group ? `group:${data.preset.group}` : 'direct',
		payer: data.user!.id,
		participants: data.preset.group
			? (data.groups.find((g) => g.id === data.preset.group)?.memberIds ?? [data.user!.id])
			: data.preset.person
				? [data.user!.id, data.preset.person]
				: [data.user!.id],
		mode: 'equal' as const,
		exact: {},
		icon: null
	};
</script>

<Header title={i.t('expenses.new')} back="/expenses" />

<ExpenseForm
	me={data.user!}
	contacts={data.contacts}
	groups={data.groups}
	{initial}
	submitLabel={i.t('expenses.save')}
	error={form?.message}
/>
