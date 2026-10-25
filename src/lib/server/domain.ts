import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import type { LedgerEntry } from '#lib/ledger.ts';
import { planPersonSettlement, withoutKept } from '#lib/ledger.ts';
import type { Cents } from '#lib/money.ts';
import { db, schema } from './db';

const { users, groups, groupMembers, connections, expenses, expenseShares } = schema;

export type PublicUser = Pick<typeof users.$inferSelect, 'id' | 'name' | 'avatarUrl'>;
const publicUser = { id: users.id, name: users.name, avatarUrl: users.avatarUrl };

/** Everyone I am directly connected to or share a group with. */
export async function contactsOf(me: string): Promise<PublicUser[]> {
	const direct = db
		.select({
			id: sql<string>`case when ${connections.userA} = ${me} then ${connections.userB} else ${connections.userA} end`
		})
		.from(connections)
		.where(or(eq(connections.userA, me), eq(connections.userB, me)));
	const myGroups = db
		.select({ id: groupMembers.groupId })
		.from(groupMembers)
		.where(eq(groupMembers.userId, me));
	const viaGroups = db
		.select({ id: groupMembers.userId })
		.from(groupMembers)
		.where(inArray(groupMembers.groupId, myGroups));
	return db
		.select(publicUser)
		.from(users)
		.where(and(ne(users.id, me), or(inArray(users.id, direct), inArray(users.id, viaGroups))))
		.orderBy(users.name);
}

export async function groupsOf(me: string) {
	return db
		.select({ id: groups.id, name: groups.name, icon: groups.icon, keepDebts: groups.keepDebts })
		.from(groups)
		.innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
		.where(eq(groupMembers.userId, me))
		.orderBy(groups.name);
}

export async function groupMemberIds(groupId: string): Promise<string[]> {
	const rows = await db
		.select({ id: groupMembers.userId })
		.from(groupMembers)
		.where(eq(groupMembers.groupId, groupId))
		.orderBy(groupMembers.joinedAt);
	return rows.map((r) => r.id);
}

export async function isMember(groupId: string, userId: string) {
	return (await groupMemberIds(groupId)).includes(userId);
}

export async function connect(a: string, b: string) {
	if (a === b) return;
	const [userA, userB] = a < b ? [a, b] : [b, a];
	await db.insert(connections).values({ userA, userB }).onConflictDoNothing();
}

/** All bookings `me` is part of (as payer or with a share). */
export async function entriesFor(me: string): Promise<LedgerEntry[]> {
	const involved = db
		.select({ id: expenseShares.expenseId })
		.from(expenseShares)
		.where(eq(expenseShares.userId, me));
	const rows = await db
		.select({
			id: expenses.id,
			groupId: expenses.groupId,
			payerId: expenses.payerId,
			userId: expenseShares.userId,
			cents: expenseShares.cents
		})
		.from(expenses)
		.innerJoin(expenseShares, eq(expenseShares.expenseId, expenses.id))
		.where(or(eq(expenses.payerId, me), inArray(expenses.id, involved)));
	const byId = new Map<string, LedgerEntry>();
	for (const r of rows) {
		let e = byId.get(r.id);
		if (!e) byId.set(r.id, (e = { contextId: r.groupId, payerId: r.payerId, shares: [] }));
		e.shares.push({ userId: r.userId, cents: r.cents });
	}
	return [...byId.values()];
}

/** All bookings of a group (for group balances). */
export async function entriesForGroup(groupId: string): Promise<LedgerEntry[]> {
	const rows = await db
		.select({
			id: expenses.id,
			payerId: expenses.payerId,
			userId: expenseShares.userId,
			cents: expenseShares.cents
		})
		.from(expenses)
		.innerJoin(expenseShares, eq(expenseShares.expenseId, expenses.id))
		.where(eq(expenses.groupId, groupId));
	const byId = new Map<string, LedgerEntry>();
	for (const r of rows) {
		let e = byId.get(r.id);
		if (!e) byId.set(r.id, (e = { contextId: groupId, payerId: r.payerId, shares: [] }));
		e.shares.push({ userId: r.userId, cents: r.cents });
	}
	return [...byId.values()];
}

export interface NewExpense {
	kind?: 'expense' | 'settlement';
	groupId: string | null;
	payerId: string;
	createdBy: string;
	title: string;
	icon?: string | null;
	shares: Map<string, Cents>;
	spentAt?: Date;
	settlementBatch?: string;
}

export async function createExpense(
	e: NewExpense,
	tx: Pick<typeof db, 'insert'> = db
): Promise<string> {
	const shares = [...e.shares].filter(([, c]) => c !== 0);
	const amountCents = shares.reduce((a, [, c]) => a + c, 0);
	const [row] = await tx
		.insert(expenses)
		.values({
			kind: e.kind ?? 'expense',
			groupId: e.groupId,
			payerId: e.payerId,
			createdBy: e.createdBy,
			title: e.title,
			icon: e.icon ?? null,
			amountCents,
			spentAt: e.spentAt ?? new Date(),
			settlementBatch: e.settlementBatch
		})
		.returning({ id: expenses.id });
	if (shares.length) {
		await tx
			.insert(expenseShares)
			.values(shares.map(([userId, cents]) => ({ expenseId: row!.id, userId, cents })));
	}
	return row!.id;
}

/** Groups of `me` that keep their debts inside the group instead of netting them per person. */
export async function keptGroupIds(me: string): Promise<Set<string>> {
	return new Set((await groupsOf(me)).filter((g) => g.keepDebts).map((g) => g.id));
}

/**
 * Person-based settlement: one net payment, but one settlement booking per context (group/direct)
 * so that every group stays consistent for all its other members. Groups that keep their debts
 * are left out; pass `entries` of just such a group to settle inside it.
 */
export async function settleWith(
	me: string,
	other: string,
	title: string,
	entries?: LedgerEntry[]
) {
	entries ??= withoutKept(await entriesFor(me), await keptGroupIds(me));
	const plan = planPersonSettlement(me, other, entries);
	if (!plan.lines.length) return plan;
	const batch = randomUUID();
	await db.transaction(async (tx) => {
		for (const l of plan.lines) {
			await createExpense(
				{
					kind: 'settlement',
					groupId: l.contextId,
					payerId: l.fromId,
					createdBy: me,
					title,
					shares: new Map([[l.toId, l.cents]]),
					settlementBatch: batch
				},
				tx
			);
		}
	});
	return plan;
}

export async function recentExpenses(me: string, groupId?: string, limit = 50) {
	const involved = db
		.select({ id: expenseShares.expenseId })
		.from(expenseShares)
		.where(eq(expenseShares.userId, me));
	const scope = groupId
		? eq(expenses.groupId, groupId)
		: or(eq(expenses.payerId, me), inArray(expenses.id, involved));
	const rows = await db
		.select({
			id: expenses.id,
			kind: expenses.kind,
			title: expenses.title,
			icon: expenses.icon,
			fromReceipt: sql<boolean>`exists (select 1 from ${schema.receipts} where ${schema.receipts.expenseId} = ${expenses.id})`,
			amountCents: expenses.amountCents,
			spentAt: expenses.spentAt,
			groupId: expenses.groupId,
			payerId: expenses.payerId,
			payerName: users.name,
			myShare:
				sql<number>`coalesce((select ${expenseShares.cents} from ${expenseShares} where ${expenseShares.expenseId} = ${expenses.id} and ${expenseShares.userId} = ${me}), 0)`.mapWith(
					Number
				)
		})
		.from(expenses)
		.innerJoin(users, eq(users.id, expenses.payerId))
		.where(scope)
		.orderBy(desc(expenses.spentAt))
		.limit(limit);
	return rows;
}

export async function usersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
	if (!ids.length) return new Map();
	const rows = await db.select(publicUser).from(users).where(inArray(users.id, ids));
	return new Map(rows.map((u) => [u.id, u]));
}

/** One expense with its shares, its group's creator and the receipt it was booked from. */
export async function getExpense(id: string) {
	const [row] = await db
		.select({ expense: expenses, groupCreatedBy: groups.createdBy })
		.from(expenses)
		.leftJoin(groups, eq(groups.id, expenses.groupId))
		.where(eq(expenses.id, id));
	if (!row) return null;
	const shares = await db
		.select({ userId: expenseShares.userId, cents: expenseShares.cents })
		.from(expenseShares)
		.where(eq(expenseShares.expenseId, id));
	const [receipt] = await db
		.select({ id: schema.receipts.id })
		.from(schema.receipts)
		.where(eq(schema.receipts.expenseId, id));
	return {
		...row.expense,
		groupCreatedBy: row.groupCreatedBy,
		shares,
		receiptId: receipt?.id ?? null
	};
}

export async function updateExpense(id: string, e: Omit<NewExpense, 'kind' | 'createdBy'>) {
	const shares = [...e.shares].filter(([, c]) => c !== 0);
	await db.transaction(async (tx) => {
		await tx
			.update(expenses)
			.set({
				groupId: e.groupId,
				payerId: e.payerId,
				title: e.title,
				icon: e.icon ?? null,
				amountCents: shares.reduce((a, [, c]) => a + c, 0),
				...(e.spentAt ? { spentAt: e.spentAt } : {})
			})
			.where(eq(expenses.id, id));
		await tx.delete(expenseShares).where(eq(expenseShares.expenseId, id));
		if (shares.length) {
			await tx
				.insert(expenseShares)
				.values(shares.map(([userId, cents]) => ({ expenseId: id, userId, cents })));
		}
	});
}

/**
 * Deletes an expense. A settlement goes as a whole batch (its lines only add up together);
 * an expense booked from a receipt sends the receipt back to the swipe queue.
 */
export async function deleteExpense(expense: { id: string; settlementBatch: string | null }) {
	await db.transaction(async (tx) => {
		const [receipt] = await tx
			.select({ id: schema.receipts.id })
			.from(schema.receipts)
			.where(eq(schema.receipts.expenseId, expense.id));
		if (receipt) {
			await tx
				.update(schema.receiptItems)
				.set({ decision: null })
				.where(eq(schema.receiptItems.receiptId, receipt.id));
			await tx
				.update(schema.receipts)
				.set({ expenseId: null, dismissed: false })
				.where(eq(schema.receipts.id, receipt.id));
		}
		await tx
			.delete(expenses)
			.where(
				expense.settlementBatch
					? eq(expenses.settlementBatch, expense.settlementBatch)
					: eq(expenses.id, expense.id)
			);
	});
	return expense;
}
