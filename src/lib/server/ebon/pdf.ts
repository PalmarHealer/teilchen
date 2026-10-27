import { extractTextItems } from 'unpdf';
import { parseReceiptText } from './parse';

/** PDF → text lines. Fragments are joined into lines by their y coordinate. */
export async function pdfToText(pdf: Uint8Array): Promise<string> {
	// A copy: pdf.js takes over (detaches) the buffer it gets, which would leave `pdf` empty.
	const { items } = await extractTextItems(pdf.slice());
	const out: string[] = [];
	for (const page of items) {
		const rows = new Map<number, { x: number; s: string }[]>();
		for (const it of page) {
			if (!it.str.trim()) continue;
			const y = Math.round(it.y);
			const row = rows.get(y) ?? rows.set(y, []).get(y)!;
			row.push({ x: it.x, s: it.str });
		}
		for (const [, row] of [...rows].sort((a, b) => b[0] - a[0])) {
			out.push(
				row
					.sort((a, b) => a.x - b.x)
					.map((r) => r.s)
					.join(' ')
			);
		}
	}
	return out.join('\n');
}

/** Store eBon or online order invoice → items; null if it is neither. */
export async function parseReceiptPdf(pdf: Uint8Array) {
	return parseReceiptText(await pdfToText(pdf));
}
