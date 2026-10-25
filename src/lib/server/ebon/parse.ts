import { parseCents, type Cents } from '#lib/money.ts';

export interface ReceiptItem {
	name: string;
	quantity: number;
	unit: 'Stk' | 'kg' | null;
	totalCents: Cents;
	/** Discounts and redeemed coupons aren't swiped; they are spread over the products. */
	kind: 'product' | 'discount';
	/** False for lines marked "*" on the receipt (deposit etc.): no discount applies to them. */
	discountable: boolean;
}

export interface ParsedReceipt {
	market: string | null;
	/** Bon-Nr. of a store receipt, order number of an online invoice */
	number: string | null;
	purchasedAt: Date;
	totalCents: Cents;
	items: ReceiptItem[];
	/** Sum of items ≠ total – the parser probably missed something */
	mismatch: boolean;
}

/** Both REWE formats (store eBon and online order invoice); the documents themselves are German. */
export function parseReceiptText(text: string): ParsedReceipt | null {
	return parseEbonText(text) ?? parseInvoiceText(text);
}

const DISCOUNT = /rabatt|coupon|gutschein|nachlass|bonus|aktion|guthaben/i;
const lines = (text: string) =>
	text
		.split(/\r?\n/)
		.map((l) => l.replace(/\s+/g, ' ').trim())
		.filter(Boolean);
const finish = (receipt: Omit<ParsedReceipt, 'mismatch'>): ParsedReceipt => ({
	...receipt,
	mismatch: receipt.items.reduce((a, i) => a + i.totalCents, 0) !== receipt.totalCents
});

// --- Store eBon ---------------------------------------------------------------------------

const ITEM = /^(.+?)\s+(-?\d+,\d\d)\s+[ABC](\s*\*)?$/;
const QTY = /^(\d+(?:,\d+)?)\s*(Stk|kg)\s*x\s*-?\d+,\d\d/;
const TOTAL = /^SUMME\s+EUR\s+(-?\d+,\d\d)/;
const DATE = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::\d{2})?\s+Bon-Nr\.?:?\s*(\d+)/;
const PFAND = /^(PFAND|EINWEG|MEHRWEG)/i;

/** A store eBon: one line per receipt line, items between "EUR" and "SUMME EUR". */
export function parseEbonText(text: string): ParsedReceipt | null {
	const all = lines(text);
	const start = all.indexOf('EUR');
	const totalIdx = all.findIndex((l) => TOTAL.test(l));
	if (start < 0 || totalIdx < 0) return null;

	const items: ReceiptItem[] = [];
	for (const line of all.slice(start + 1, totalIdx)) {
		const prev = items.at(-1);
		const qty = line.match(QTY);
		if (qty && prev) {
			prev.quantity = Number(qty[1]!.replace(',', '.'));
			prev.unit = qty[2] as 'Stk' | 'kg';
			continue;
		}
		const m = line.match(ITEM);
		if (!m) continue;
		const name = m[1]!;
		const cents = parseCents(m[2]!)!;
		// A deposit (Pfand) belongs to the drink above it – nobody should have to swipe it separately.
		if (PFAND.test(name) && cents > 0 && prev?.kind === 'product' && prev.totalCents > 0) {
			prev.totalCents += cents;
			if (!prev.name.endsWith('(inkl. Pfand)')) prev.name += ' (inkl. Pfand)';
			continue;
		}
		items.push({
			name,
			quantity: 1,
			unit: null,
			totalCents: cents,
			kind: cents < 0 && DISCOUNT.test(name) ? 'discount' : 'product',
			discountable: !m[3]
		});
	}

	const date = all.map((l) => l.match(DATE)).find(Boolean);
	return finish({
		market: all.slice(0, Math.min(start, 3)).join(', ') || null,
		number: date?.[6] ?? null,
		purchasedAt: date
			? berlinTime(+date[3]!, +date[2]!, +date[1]!, +date[4]!, +date[5]!)
			: new Date(),
		totalCents: parseCents(all[totalIdx]!.match(TOTAL)![1]!)!,
		items
	});
}

// --- Online order invoice ("Rechnung" from the REWE delivery service) -------------------------

// "<name> <quantity|weight> <A|B|A/B> <unit price> € [/kg] <total> €"
const ROW =
	/^(.+?)\s+(-?\d+(?:,\d+)?)(g|kg)?\s+(?:A\/B|A|B)\s+-?\d+,\d\d\s€(?:\/kg)?\s+(-?\d+,\d\d)\s€$/;
const GRAND_TOTAL = /^Gesamtsumme\s+(-?\d+,\d\d)\s€/;
const ORDER = /^Bestellnummer\s+(\S+)/;
const INVOICE_DATE = /^(?:Rechnungsdatum|Liefertermin)\s+(\d{2})\.(\d{2})\.(\d{4})/;

/** A REWE online order invoice: a product table spread over several pages, then "Gesamtsumme". */
export function parseInvoiceText(text: string): ParsedReceipt | null {
	const all = lines(text);
	const totalLine = all.find((l) => GRAND_TOTAL.test(l));
	if (!all.includes('Rechnung') || !totalLine) return null;

	const rows: ReceiptItem[] = [];
	for (const line of all) {
		const m = line.match(ROW);
		if (!m) continue;
		const cents = parseCents(m[4]!)!;
		if (cents === 0) continue; // e.g. free delivery
		const marked = /\*+$/.test(m[1]!);
		const name = m[1]!.replace(/\*+$/, '').trim();
		const weight = m[3] ? Number(m[2]!.replace(',', '.')) / (m[3] === 'g' ? 1000 : 1) : null;
		rows.push({
			name,
			quantity: weight ?? Math.abs(Number(m[2]!.replace(',', '.'))),
			unit: weight !== null ? 'kg' : 'Stk',
			totalCents: cents,
			kind: cents < 0 && DISCOUNT.test(name) ? 'discount' : 'product',
			discountable: !marked
		});
	}

	// Lines that cancel each other out (deposit bags handed out and taken back) aren't purchases.
	const net = new Map<string, Cents>();
	for (const r of rows) net.set(r.name, (net.get(r.name) ?? 0) + r.totalCents);
	const items = rows.filter((r) => r.kind === 'discount' || net.get(r.name) !== 0);

	const date = all.map((l) => l.match(INVOICE_DATE)).find(Boolean);
	return finish({
		market: 'REWE Lieferservice',
		number: all.map((l) => l.match(ORDER)?.[1]).find(Boolean) ?? null,
		purchasedAt: date ? berlinTime(+date[3]!, +date[2]!, +date[1]!, 12, 0) : new Date(),
		totalCents: parseCents(totalLine.match(GRAND_TOTAL)![1]!)!,
		items
	});
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
