<script lang="ts">
	import { formatCents } from '#lib/money.ts';
	let { cents, signed = false }: { cents: number; signed?: boolean } = $props();
</script>

<span class="num" class:plus={signed && cents > 0} class:minus={signed && cents < 0}
	>{signed && cents > 0 ? '+' : ''}{formatCents(cents)}</span
>
