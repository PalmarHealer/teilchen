import { allocate, type Cents } from './money.ts';

/** "33,3", "33.3 %", "50" → number between 0 and 100; null for anything else. */
export function parsePercent(input: string): number | null {
	const m = input
		.trim()
		.replace(/\s|%/g, '')
		.match(/^\d+(?:[.,]\d+)?$/);
	if (!m) return null;
	const p = Number(m[0].replace(',', '.'));
	return p <= 100 ? p : null;
}

/** Share of `total` in percent; null when there is no total to relate to. */
export const percentOf = (part: Cents, total: Cents): number | null =>
	total > 0 ? (part * 100) / total : null;

/**
 * Cents for each percentage of `total`. Percentages that add up to 100 split the total exactly
 * (leftover cents by largest remainder); otherwise each one is simply rounded.
 */
export function centsForPercents(total: Cents, percents: number[]): Cents[] {
	const sum = percents.reduce((a, b) => a + b, 0);
	if (Math.abs(sum - 100) < 1e-9) return allocate(total, percents);
	return percents.map((p) => Math.round((total * p) / 100));
}
