<script lang="ts">
	import { useI18n } from '#lib/i18n/index.ts';

	let { cents, signed = false }: { cents: number; signed?: boolean } = $props();
	const i = useI18n();
</script>

<span class="num" class:plus={signed && cents > 0} class:minus={signed && cents < 0}
	>{signed && cents > 0 ? '+' : ''}{i.money(cents)}</span
>
