/** Lokale Demo-Daten. Gibt einen Session-Token aus: als Cookie `teilchen_session` setzen. */
import { sha256, randomToken } from '../crypto.ts';
import { connect, createExpense } from '../domain.ts';
import { parseEbonText } from '../ebon/parse.ts';
import { importEbon } from '../receipts.ts';
import { client, db, schema } from './index.ts';

const mk = (sub: string, name: string, email: string) =>
	db
		.insert(schema.users)
		.values({ oidcSub: sub, name, email })
		.onConflictDoUpdate({ target: schema.users.oidcSub, set: { name } })
		.returning()
		.then((r) => r[0]!);

const me = await mk('dev-me', 'Laurenz Demo', 'me@example.de');
const ben = await mk('dev-ben', 'Ben Bauer', 'ben@example.de');
const cleo = await mk('dev-cleo', 'Cleo Clausen', 'cleo@example.de');

const [wg] = await db
	.insert(schema.groups)
	.values({ name: 'WG Südstadt', icon: 'home', createdBy: me.id })
	.returning();
await db
	.insert(schema.groupMembers)
	.values([me, ben, cleo].map((u) => ({ groupId: wg!.id, userId: u.id })));
await connect(me.id, ben.id);

// Ich lege Ben 20 € fürs Kino aus …
await createExpense({
	groupId: null,
	payerId: me.id,
	createdBy: me.id,
	title: 'Kino',
	shares: new Map([[ben.id, 2000]])
});
// … Ben zahlt in der WG 45 € Putzmittel für alle drei.
await createExpense({
	groupId: wg!.id,
	payerId: ben.id,
	createdBy: ben.id,
	title: 'Putzmittel & Klopapier',
	shares: new Map([
		[me.id, 1500],
		[ben.id, 1500],
		[cleo.id, 1500]
	])
});
await createExpense({
	groupId: wg!.id,
	payerId: cleo.id,
	createdBy: cleo.id,
	title: 'Internet Oktober',
	shares: new Map([
		[me.id, 1333],
		[ben.id, 1333],
		[cleo.id, 1334]
	])
});

const bon = parseEbonText(`REWE Markt GmbH
Musterstr. 1
12345 Musterstadt
EUR
HAFERMILCH BARISTA 1,99 B
BIO BANANEN 1,61 B
1,050 kg x 1,53 EUR/kg
SPAGHETTI 1,29 B
TOMATEN PASSIERT 0,99 B
2 Stk x 0,49
PARMIGIANO 3,49 B
ZAHNPASTA 1,95 A
MINERALWASSER 0,59 A
PFAND 0,25 EURO 0,25 A *
--------------------------------------
SUMME EUR 12,16
24.10.2026 18:42 Bon-Nr.:4711`)!;
await importEbon(me.id, 'ebon_mail', `seed:${Date.now()}`, bon);

const token = randomToken();
await db
	.insert(schema.sessions)
	.values({ id: sha256(token), userId: me.id, expiresAt: new Date(Date.now() + 864e5) });
console.log(token);
await client.end();
