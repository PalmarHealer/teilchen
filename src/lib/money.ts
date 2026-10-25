/** Alle Beträge sind Integer-Cent. */
export type Cents = number;

const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: Cents): string {
	return formatter.format(cents / 100);
}

/** Parst "12,34", "12.34", "-1,5", "3" zu Cent. Gibt null bei ungültiger Eingabe. */
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
 * Verteilt `total` auf Gewichte, sodass die Summe exakt stimmt.
 * Rest-Cent gehen an die Einträge mit dem größten Nachkommarest (Largest-Remainder).
 */
export function allocate(total: Cents, weights: number[]): Cents[] {
	const sum = weights.reduce((a, b) => a + b, 0);
	if (weights.length === 0) return [];
	if (sum <= 0) throw new Error('allocate: Gewichte müssen positiv sein');
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
