import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
	id: id(),
	oidcSub: text('oidc_sub').notNull().unique(),
	email: text('email').notNull(),
	name: text('name').notNull(),
	avatarUrl: text('avatar_url'),
	/** Personal part of the eBon forwarding address: teilchen+<token>@… */
	inboxToken: text('inbox_token')
		.notNull()
		.unique()
		.default(sql`substr(md5(random()::text), 1, 10)`),
	createdAt: createdAt()
});

export const sessions = pgTable('sessions', {
	/** sha256 of the cookie token */
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

/** Acquaintance between two people (userA < userB), created via invite links or groups. */
export const connections = pgTable(
	'connections',
	{
		userA: uuid('user_a')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		userB: uuid('user_b')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.userA, t.userB] })]
);

export const groups = pgTable('groups', {
	id: id(),
	name: text('name').notNull(),
	/** Tabler icon name */
	icon: text('icon').notNull().default('users'),
	createdBy: uuid('created_by')
		.notNull()
		.references(() => users.id),
	createdAt: createdAt()
});

export const groupMembers = pgTable(
	'group_members',
	{
		groupId: uuid('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		joinedAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.groupId, t.userId] })]
);

export const invites = pgTable('invites', {
	token: text('token').primaryKey(),
	inviterId: uuid('inviter_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const receiptSource = pgEnum('receipt_source', ['ebon_mail', 'manual']);

export const receipts = pgTable(
	'receipts',
	{
		id: id(),
		ownerId: uuid('owner_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		source: receiptSource('source').notNull(),
		/** Receipt number or mail Message-ID – prevents duplicate imports */
		externalId: text('external_id').notNull(),
		market: text('market'),
		purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
		totalCents: integer('total_cents').notNull(),
		/** Only set once all items are swiped and the expense is booked */
		expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'set null' }),
		dismissed: boolean('dismissed').notNull().default(false),
		raw: jsonb('raw'),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('receipts_owner_external').on(t.ownerId, t.externalId)]
);

export const itemDecision = pgEnum('item_decision', ['mine', 'shared', 'theirs']);

export const receiptItems = pgTable(
	'receipt_items',
	{
		id: id(),
		receiptId: uuid('receipt_id')
			.notNull()
			.references(() => receipts.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		name: text('name').notNull(),
		quantity: numeric('quantity').notNull().default('1'),
		unit: text('unit'),
		totalCents: integer('total_cents').notNull(),
		/** 'discount' lines aren't swiped but spread over the products (see #lib/split) */
		kind: text('kind', { enum: ['product', 'discount'] })
			.notNull()
			.default('product'),
		/** False for lines marked "*" on the receipt: discounts don't apply to them */
		discountable: boolean('discountable').notNull().default(true),
		/** Null until swiped, and for lines whose pieces were swiped differently */
		decision: itemDecision('decision')
	},
	(t) => [index('receipt_items_receipt').on(t.receiptId)]
);

export const expenseKind = pgEnum('expense_kind', ['expense', 'settlement']);

export const expenses = pgTable(
	'expenses',
	{
		id: id(),
		kind: expenseKind('kind').notNull().default('expense'),
		/** null = direct expense between people */
		groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
		payerId: uuid('payer_id')
			.notNull()
			.references(() => users.id),
		createdBy: uuid('created_by')
			.notNull()
			.references(() => users.id),
		title: text('title').notNull(),
		/** Tabler icon name; null = default */
		icon: text('icon'),
		amountCents: integer('amount_cents').notNull(),
		/** Links the per-context lines of one netted settlement */
		settlementBatch: uuid('settlement_batch'),
		spentAt: timestamp('spent_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [index('expenses_group').on(t.groupId)]
);

export const expenseShares = pgTable(
	'expense_shares',
	{
		expenseId: uuid('expense_id')
			.notNull()
			.references(() => expenses.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		cents: integer('cents').notNull()
	},
	(t) => [primaryKey({ columns: [t.expenseId, t.userId] }), index('shares_user').on(t.userId)]
);

export const inboundMails = pgTable('inbound_mails', {
	messageId: text('message_id').primaryKey(),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
	status: text('status').notNull(),
	detail: text('detail'),
	receivedAt: createdAt()
});
