import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import type { LedgerEntry } from '#lib/ledger.ts';
import { planPersonSettlement } from '#lib/ledger.ts';
import type { Cents } from '#lib/money.ts';
import { db, schema } from './db';

const { users, groups, groupMembers, connections, expenses, expenseShares } = schema;

export type PublicUser = Pick<typeof users.$inferSelect, 'id' | 'name' | 'avatarUrl'>;
const publicUser = { id: users.id, name: users.name, avatarUrl: users.avatarUrl };

/** Alle Personen, mit denen ich direkt verbunden bin oder eine Gruppe teile. */
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
		.select({ id: groups.id, name: groups.name, icon: groups.icon })
		.from(groups)
		.innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
		.where(eq(groupMembers.userId, me))
		.orderBy(groups.name);
}

export async function groupMemberIds(groupId: string): Promise<string[]> {
	const rows = await db
		.select({ id: groupMembers.userId })
		.from(groupMembers)
		.where(eq(groupMembers.groupId, groupId));
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

/** Alle Buchungen, an denen `me` beteiligt ist (als Zahler oder mit Anteil). */
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

/** Alle Buchungen einer Gruppe (für Gruppensalden). */
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

/**
 * Personenbezogener Ausgleich: eine Netto-Zahlung, aber pro Kontext (Gruppe/direkt) eine
 * Ausgleichsbuchung, damit jede Gruppe für alle anderen Mitglieder stimmig bleibt.
 */
export async function settleWith(me: string, other: string) {
	const plan = planPersonSettlement(me, other, await entriesFor(me));
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
					title: 'Ausgleich',
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
