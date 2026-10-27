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

export interface Transfer {
	fromId: string;
	toId: string;
	cents: Cents;
}

export interface SettlementPlan {
	/** What is actually transferred (or null when everything cancels out). */
	transfer: Transfer | null;
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

/**
 * Few transfers that settle a group (at most members − 1): the biggest debtor pays the biggest
 * creditor, again and again. Ties go by id, so every member sees the same plan.
 */
export function simplifyDebts(balances: Map<string, Cents>): Transfer[] {
	const side = (sign: 1 | -1) =>
		[...balances].filter(([, c]) => c * sign > 0).map(([id, c]) => ({ id, left: Math.abs(c) }));
	const debtors = side(-1);
	const creditors = side(1);
	const biggest = (xs: { id: string; left: Cents }[]) =>
		xs.filter((x) => x.left > 0).sort((a, b) => b.left - a.left || (a.id < b.id ? -1 : 1))[0];
	const transfers: Transfer[] = [];
	for (;;) {
		const d = biggest(debtors);
		const c = biggest(creditors);
		if (!d || !c) return transfers;
		const cents = Math.min(d.left, c.left);
		transfers.push({ fromId: d.id, toId: c.id, cents });
		d.left -= cents;
		c.left -= cents;
	}
}

/**
 * Balance of `me` towards the other members of groups that keep their debts, from each group's
 * simplified plan (same sign convention as personBalances). There the group balance is what
 * counts: who consumed what from whom no longer matters once someone paid for someone else.
 * `entries` must hold all bookings of these groups, not just mine.
 */
export function simplifiedBalances(me: string, entries: LedgerEntry[]): Map<string, PersonBalance> {
	const byGroup = new Map<string, LedgerEntry[]>();
	for (const e of entries) {
		if (e.contextId === null) continue;
		byGroup.set(e.contextId, [...(byGroup.get(e.contextId) ?? []), e]);
	}
	const result = new Map<string, PersonBalance>();
	for (const [groupId, groupEntries] of byGroup) {
		for (const t of simplifyDebts(groupBalances([], groupEntries))) {
			if (t.toId !== me && t.fromId !== me) continue;
			const [other, cents] = t.toId === me ? [t.fromId, t.cents] : [t.toId, -t.cents];
			let b = result.get(other);
			if (!b) result.set(other, (b = { net: 0, byContext: new Map() }));
			b.net += cents;
			b.byContext.set(groupId, cents);
		}
	}
	return result;
}

/**
 * Settlement lines that zero what is left between each pair once a group's totals are all zero.
 * After simplified payments that is a circle (A owes B owes C owes A), which would turn into
 * debts again if the group's bookings were netted per person.
 */
export function pairResidue(groupId: string, entries: LedgerEntry[]): SettlementLine[] {
	const pairs = new Map<string, Cents>();
	for (const e of entries) {
		for (const s of e.shares) {
			if (s.userId === e.payerId) continue;
			// > 0: the first id (sorted) is owed by the second.
			const [a, b, sign] =
				e.payerId < s.userId ? [e.payerId, s.userId, 1] : [s.userId, e.payerId, -1];
			const key = `${a} ${b}`;
			pairs.set(key, (pairs.get(key) ?? 0) + sign * s.cents);
		}
	}
	return [...pairs]
		.filter(([, c]) => c !== 0)
		.map(([key, c]) => {
			const [a, b] = key.split(' ') as [string, string];
			return c > 0
				? { contextId: groupId, fromId: b, toId: a, cents: c }
				: { contextId: groupId, fromId: a, toId: b, cents: -c };
		});
}
