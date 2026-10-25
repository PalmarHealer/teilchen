/** All amounts are integer cents. Formatting lives in #lib/i18n (locale-dependent). */
export type Cents = number;

/** Parses "12,34", "12.34", "-1,5", "3" into cents. Returns null for invalid input. */
export function parseCents(input: string): Cents | null {
	const m = input
		.trim()
		.replace(/\s|€/g, '')
		.match(/^(-?)(\d+)(?:[.,](\d{1,2}))?$/);
	if (!m) return null;
	const [, sign, euros, frac = ''] = m;
	const cents = Number(euros) * 100 + Number(frac.padEnd(2, '0'));
	return sign ? -cents : cents;
}

/**
 * Distributes `total` across weights so that the sum is exact.
 * Leftover cents go to the entries with the largest fractional remainder (largest remainder method).
 */
export function allocate(total: Cents, weights: number[]): Cents[] {
	const sum = weights.reduce((a, b) => a + b, 0);
	if (weights.length === 0) return [];
	if (sum <= 0) throw new Error('allocate: weights must be positive');
	const sign = total < 0 ? -1 : 1;
	const abs = Math.abs(total);
	const raw = weights.map((w) => (abs * w) / sum);
	const result = raw.map(Math.floor);
	let rest = abs - result.reduce((a, b) => a + b, 0);
	const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
	for (const { i } of order) {
		if (rest <= 0) break;
		result[i]! += 1;
		rest -= 1;
	}
	return result.map((c) => c * sign);
}

export function splitEqually(total: Cents, count: number): Cents[] {
	return allocate(
		total,
		Array.from({ length: count }, () => 1)
	);
}

/** Cents → form input text ("12,34" / "12.34"), the inverse of parseCents. */
export function centsToInput(cents: Cents, decimal: ',' | '.' = ','): string {
	const sign = cents < 0 ? '-' : '';
	const abs = Math.abs(cents);
	return `${sign}${Math.floor(abs / 100)}${decimal}${String(abs % 100).padStart(2, '0')}`;
}
