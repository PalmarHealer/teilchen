/**
 * Live formatting of money inputs while typing: "1234,5" → "1.234,5" (de) or "1,234.5" (en).
 * Grouping separators are inserted automatically, so a separator typed by hand starts the
 * decimals. In pasted text the last separator before 1–2 final digits is the decimal one, so
 * "12.50" and "1,234.5" keep their cents in German too.
 */
type Sep = ',' | '.';
const groupOf = (decimal: Sep): Sep => (decimal === ',' ? '.' : ',');

interface Options {
	/** Index of a separator the user just typed */
	typedAt?: number;
	pasted?: boolean;
}

/** Digits plus 'D' for the decimal separator. */
function significant(raw: string, decimal: Sep, opts: Options, pastedDecimalAt: number): string {
	let out = '';
	for (let k = 0; k < raw.length; k++) {
		const c = raw[k]!;
		if (c >= '0' && c <= '9') out += c;
		else if (
			opts.pasted
				? k === pastedDecimalAt
				: c === decimal || ((c === '.' || c === ',') && k === opts.typedAt)
		)
			out += 'D';
	}
	return out;
}

function layout(sig: string, decimal: Sep): string {
	const d = sig.indexOf('D');
	let int = (d < 0 ? sig : sig.slice(0, d)).replace(/^0+(?=\d)/, '');
	const frac =
		d < 0
			? null
			: sig
					.slice(d + 1)
					.replaceAll('D', '')
					.slice(0, 2);
	if (frac !== null && !int) int = '0';
	int = int.replace(/\B(?=(\d{3})+(?!\d))/g, groupOf(decimal));
	return frac === null ? int : `${int}${decimal}${frac}`;
}

/** Digits and the decimal separator (not the grouping ones). */
const isSignificant = (c: string, decimal: Sep) => (c >= '0' && c <= '9') || c === decimal;

/** The formatted text and where the caret (`caret` in `raw`) ends up in it. */
export function formatAmountInput(
	raw: string,
	caret: number,
	decimal: Sep,
	opts: Options = {}
): { text: string; caret: number } {
	// Pasted text: only a separator before 1–2 final digits is the decimal one
	const m = opts.pasted ? raw.match(/[.,]\d{1,2}\D*$/) : null;
	const pastedDecimalAt = m?.index ?? -1;
	const text = layout(significant(raw, decimal, opts, pastedDecimalAt), decimal);
	// Same number of digits and separators before the caret as in the formatted prefix
	const prefix = layout(significant(raw.slice(0, caret), decimal, opts, pastedDecimalAt), decimal);
	const before = [...prefix].filter((c) => isSignificant(c, decimal)).length;
	let pos = 0;
	for (let seen = 0; pos < text.length && seen < before; pos++)
		if (isSignificant(text[pos]!, decimal)) seen++;
	return { text, caret: pos };
}

/** Formats the input of an `input` event in place, keeping the caret; returns the new value. */
export function reformatInput(e: Event, decimal: Sep): string {
	const el = e.currentTarget as HTMLInputElement;
	const ie = e as InputEvent;
	const caret = el.selectionStart ?? el.value.length;
	const typedAt =
		ie.inputType === 'insertText' && (ie.data === '.' || ie.data === ',') ? caret - 1 : undefined;
	const pasted = ie.inputType === 'insertFromPaste' || ie.inputType === 'insertFromDrop';
	const out = formatAmountInput(el.value, caret, decimal, { typedAt, pasted });
	if (out.text !== el.value) {
		el.value = out.text;
		el.setSelectionRange(out.caret, out.caret);
	}
	return out.text;
}
