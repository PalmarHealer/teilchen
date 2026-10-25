import type { Cents } from './money';

/**
 * Eine Buchung: `payerId` hat bezahlt, jede Share ist der Anteil, den die Person konsumiert hat.
 * Ausgleichszahlungen sind ebenfalls Buchungen (Zahler = wer zurückzahlt, eine Share = Empfänger).
 * `contextId` = Gruppe oder null für direkte 1:1-Ausgaben.
 */
export interface LedgerEntry {
	contextId: string | null;
	payerId: string;
	shares: { userId: string; cents: Cents }[];
}

export interface PersonBalance {
	/** > 0: die andere Person schuldet mir; < 0: ich schulde ihr. Über alle Kontexte verrechnet. */
	net: Cents;
	/** Gleiche Vorzeichenlogik, pro Gruppe bzw. `null` für direkt. */
	byContext: Map<string | null, Cents>;
}

/** Saldo von `me` gegenüber jeder Person, mit der es Buchungen gibt – gruppenübergreifend gegengerechnet. */
export function personBalances(me: string, entries: LedgerEntry[]): Map<string, PersonBalance> {
	const result = new Map<string, PersonBalance>();
	const add = (other: string, ctx: string | null, cents: Cents) => {
		let b = result.get(other);
		if (!b) result.set(other, (b = { net: 0, byContext: new Map() }));
		b.net += cents;
		b.byContext.set(ctx, (b.byContext.get(ctx) ?? 0) + cents);
	};
	for (const e of entries) {
		for (const s of e.shares) {
			if (s.userId === e.payerId) continue;
			if (e.payerId === me) add(s.userId, e.contextId, s.cents);
			else if (s.userId === me) add(e.payerId, e.contextId, -s.cents);
		}
	}
	for (const [other, b] of result) {
		for (const [ctx, c] of b.byContext) if (c === 0) b.byContext.delete(ctx);
		if (b.net === 0 && b.byContext.size === 0) result.delete(other);
	}
	return result;
}

export interface SettlementLine {
	contextId: string | null;
	fromId: string;
	toId: string;
	cents: Cents;
}

export interface SettlementPlan {
	/** Was tatsächlich überwiesen wird (oder null, wenn sich alles aufhebt). */
	transfer: { fromId: string; toId: string; cents: Cents } | null;
	/**
	 * Buchungen pro Kontext, die jeden Einzelsaldo auf 0 setzen. Ihre Summe entspricht `transfer`,
	 * d.h. Gruppen bleiben für alle anderen Mitglieder korrekt, obwohl nur einmal netto gezahlt wird.
	 */
	lines: SettlementLine[];
}

export function planPersonSettlement(
	me: string,
	other: string,
	entries: LedgerEntry[]
): SettlementPlan {
	const b = personBalances(me, entries).get(other);
	if (!b) return { transfer: null, lines: [] };
	const lines: SettlementLine[] = [...b.byContext]
		.filter(([, c]) => c !== 0)
		.map(([contextId, c]) =>
			c > 0
				? { contextId, fromId: other, toId: me, cents: c }
				: { contextId, fromId: me, toId: other, cents: -c }
		);
	const transfer =
		b.net === 0
			? null
			: b.net > 0
				? { fromId: other, toId: me, cents: b.net }
				: { fromId: me, toId: other, cents: -b.net };
	return { transfer, lines };
}

/** Wandelt einen Plan in Ledger-Buchungen (Zahler = wer zahlt, Share = Empfänger). */
export function settlementEntries(plan: SettlementPlan): LedgerEntry[] {
	return plan.lines.map((l) => ({
		contextId: l.contextId,
		payerId: l.fromId,
		shares: [{ userId: l.toId, cents: l.cents }]
	}));
}
