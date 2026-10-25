import { allocate, type Cents } from './money';

/**
 * A booking: `payerId` paid, each share is the part a person consumed.
 * Settlements are bookings too (payer = whoever pays back, single share = recipient).
 * `contextId` = group, or null for direct person-to-person expenses.
 */
export interface LedgerEntry {
	contextId: string | null;
	payerId: string;
	shares: { userId: string; cents: Cents }[];
}

/** Leaves out groups that keep their debts: those are settled inside the group, not netted. */
export const withoutKept = (entries: LedgerEntry[], kept: Set<string>) =>
	entries.filter((e) => e.contextId === null || !kept.has(e.contextId));

export interface PersonBalance {
	/** > 0: the other person owes me; < 0: I owe them. Netted across all contexts. */
	net: Cents;
	/** Same sign convention, per group or `null` for direct. */
	byContext: Map<string | null, Cents>;
}

/** Balance of `me` towards every person they share bookings with, netted across groups. */
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
	/** What is actually transferred (or null when everything cancels out). */
	transfer: { fromId: string; toId: string; cents: Cents } | null;
	/**
	 * One booking per context that zeroes each individual balance. Their sum equals `transfer`,
	 * so groups stay correct for all other members even though only the net amount is paid.
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

/**
 * Only `cents` of the net transfer are paid. The payment goes to the contexts where the payer
 * owes, in proportion to what is open there; contexts owed the other way stay untouched, so
 * nothing flips and every context keeps a balance it can still be settled with later.
 * The full amount (or more) is the full settlement.
 */
export function partialSettlement(plan: SettlementPlan, cents: Cents): SettlementPlan {
	const t = plan.transfer;
	if (!t || cents >= t.cents) return plan;
	if (cents <= 0) return { transfer: null, lines: [] };
	const owing = plan.lines.filter((l) => l.fromId === t.fromId);
	const parts = allocate(
		cents,
		owing.map((l) => l.cents)
	);
	return {
		transfer: { ...t, cents },
		lines: owing.map((l, i) => ({ ...l, cents: parts[i]! })).filter((l) => l.cents > 0)
	};
}

/** Turns a plan into ledger bookings (payer = who pays, share = recipient). */
export function settlementEntries(plan: SettlementPlan): LedgerEntry[] {
	return plan.lines.map((l) => ({
		contextId: l.contextId,
		payerId: l.fromId,
		shares: [{ userId: l.toId, cents: l.cents }]
	}));
}

/** Each member's balance within one group: paid − consumed. All zero = the group is settled. */
export function groupBalances(memberIds: string[], entries: LedgerEntry[]): Map<string, Cents> {
	const totals = new Map<string, Cents>(memberIds.map((id) => [id, 0]));
	for (const e of entries) {
		for (const s of e.shares) {
			totals.set(e.payerId, (totals.get(e.payerId) ?? 0) + s.cents);
			totals.set(s.userId, (totals.get(s.userId) ?? 0) - s.cents);
		}
	}
	return totals;
}

export const isSettled = (balances: Map<string, Cents>) =>
	[...balances.values()].every((c) => c === 0);
