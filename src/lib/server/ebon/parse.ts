import { parseCents, type Cents } from '#lib/money.ts';

export interface EbonItem {
	name: string;
	quantity: number;
	unit: 'Stk' | 'kg' | null;
	totalCents: Cents;
}

export interface Ebon {
	market: string | null;
	bonNr: string | null;
	purchasedAt: Date;
	totalCents: Cents;
	items: EbonItem[];
	/** Sum of items ≠ SUMME – the parser probably missed something */
	mismatch: boolean;
}

const ITEM = /^(.+?)\s+(-?\d+,\d\d)\s+[ABC](?:\s*\*)?$/;
const QTY = /^(\d+(?:,\d+)?)\s*(Stk|kg)\s*x\s*-?\d+,\d\d/;
const TOTAL = /^SUMME\s+EUR\s+(-?\d+,\d\d)/;
const DATE = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::\d{2})?\s+Bon-Nr\.?:?\s*(\d+)/;
const PFAND = /^(PFAND|EINWEG|MEHRWEG)/i;

/** Parses the text of a REWE eBon PDF (one line per receipt line). The receipt itself is German. */
export function parseEbonText(text: string): Ebon | null {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.replace(/\s+/g, ' ').trim())
		.filter(Boolean);

	const start = lines.indexOf('EUR');
	const totalIdx = lines.findIndex((l) => TOTAL.test(l));
	if (start < 0 || totalIdx < 0) return null;

	const items: EbonItem[] = [];
	for (const line of lines.slice(start + 1, totalIdx)) {
		const prev = items.at(-1);
		const qty = line.match(QTY);
		if (qty && prev) {
			prev.quantity = Number(qty[1]!.replace(',', '.'));
			prev.unit = qty[2] as 'Stk' | 'kg';
			continue;
		}
		const m = line.match(ITEM);
		if (!m) continue;
		const cents = parseCents(m[2]!)!;
		// A deposit (Pfand) belongs to the drink above it – nobody should have to swipe it separately.
		if (PFAND.test(m[1]!) && cents > 0 && prev && prev.totalCents > 0) {
			prev.totalCents += cents;
			if (!prev.name.endsWith('(inkl. Pfand)')) prev.name += ' (inkl. Pfand)';
			continue;
		}
		items.push({ name: m[1]!, quantity: 1, unit: null, totalCents: cents });
	}

	const totalCents = parseCents(lines[totalIdx]!.match(TOTAL)![1]!)!;
	const date = lines.map((l) => l.match(DATE)).find(Boolean);
	const sum = items.reduce((a, i) => a + i.totalCents, 0);
	return {
		market: lines.slice(0, Math.min(start, 3)).join(', ') || null,
		bonNr: date?.[6] ?? null,
		purchasedAt: date
			? berlinTime(+date[3]!, +date[2]!, +date[1]!, +date[4]!, +date[5]!)
			: new Date(),
		totalCents,
		items,
		mismatch: sum !== totalCents
	};
}

/** Local Berlin wall-clock time → Date (handles daylight saving time). */
export function berlinTime(y: number, mo: number, d: number, h: number, mi: number): Date {
	const asUtc = Date.UTC(y, mo - 1, d, h, mi);
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Europe/Berlin',
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric'
	}).formatToParts(new Date(asUtc));
	const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
	const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
	return new Date(asUtc - (shown - asUtc));
}
