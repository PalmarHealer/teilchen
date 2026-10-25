<script lang="ts">
	import { parseDate, type DateValue } from '@internationalized/date';
	import { Calendar, Popover } from 'bits-ui';
	import { useI18n } from '../i18n/index.ts';
	import Icon from './Icon.svelte';

	/** `value` is a local calendar date as YYYY-MM-DD (what the server expects). */
	let {
		name,
		value = $bindable(),
		label
	}: { name?: string; value: string; label?: string } = $props();

	const i = useI18n();
	let open = $state(false);
	const id = `date-${Math.random().toString(36).slice(2, 9)}`;
	const locale = $derived(i.locale === 'de' ? 'de-DE' : 'en-GB');
	const date = $derived(parseDate(value));
	const shown = $derived(
		new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
			new Date(date.year, date.month - 1, date.day)
		)
	);

	function pick(d: DateValue | undefined) {
		if (!d) return;
		value = d.toString();
		open = false;
	}

	const nav =
		'hover:bg-accent focus-visible:ring-ring/50 inline-flex size-8 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]';
</script>

<div class="flex flex-col gap-2">
	{#if label}<span class="text-sm leading-none font-medium" id="{id}-label">{label}</span>{/if}
	{#if name}<input type="hidden" {name} {value} />{/if}
	<Popover.Root bind:open>
		<Popover.Trigger
			aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
			class="bg-card dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/40 data-[state=open]:border-ring flex h-10 w-full items-center gap-2 rounded-md border px-3 text-left text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] md:text-sm"
		>
			<span class="text-muted-foreground"><Icon name="calendar" size={18} /></span>
			<span class="min-w-0 flex-1 truncate" id="{id}-value">{shown}</span>
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content
				sideOffset={4}
				align="end"
				class="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 w-auto rounded-md border p-3 shadow-md outline-none"
			>
				<Calendar.Root
					type="single"
					value={date}
					onValueChange={pick}
					{locale}
					weekStartsOn={1}
					calendarLabel={label}
					weekdayFormat="short"
					fixedWeeks
				>
					{#snippet children({ months, weekdays })}
						<Calendar.Header class="flex items-center justify-between pb-2">
							<Calendar.PrevButton class={nav} aria-label={i.t('common.prevMonth')}>
								<Icon name="back" size={16} />
							</Calendar.PrevButton>
							<Calendar.Heading class="text-sm font-medium capitalize" />
							<Calendar.NextButton class={nav} aria-label={i.t('common.nextMonth')}>
								<Icon name="chevronRight" size={16} />
							</Calendar.NextButton>
						</Calendar.Header>
						{#each months as month (month.value.toString())}
							<Calendar.Grid class="w-full border-collapse select-none">
								<Calendar.GridHead>
									<Calendar.GridRow class="flex">
										{#each weekdays as day (day)}
											<Calendar.HeadCell
												class="text-muted-foreground w-9 text-[0.8rem] font-normal"
											>
												{day.slice(0, 2)}
											</Calendar.HeadCell>
										{/each}
									</Calendar.GridRow>
								</Calendar.GridHead>
								<Calendar.GridBody>
									{#each month.weeks as week (week[0]?.toString())}
										<Calendar.GridRow class="mt-1 flex w-full">
											{#each week as day (day.toString())}
												<Calendar.Cell date={day} month={month.value} class="p-0 text-center">
													<Calendar.Day
														class="hover:bg-accent focus-visible:ring-ring/50 data-selected:bg-primary data-selected:text-primary-foreground data-today:not-data-selected:text-primary data-outside-month:text-muted-foreground/50 inline-flex size-9 items-center justify-center rounded-md text-sm tabular-nums outline-none focus-visible:ring-[3px] data-today:font-semibold"
													/>
												</Calendar.Cell>
											{/each}
										</Calendar.GridRow>
									{/each}
								</Calendar.GridBody>
							</Calendar.Grid>
						{/each}
					{/snippet}
				</Calendar.Root>
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
</div>
