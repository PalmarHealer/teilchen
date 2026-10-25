import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// postgres() verbindet erst bei der ersten Query. Der Build importiert dieses Modul ohne Env,
// daher kein Throw beim Import – ein fehlendes DATABASE_URL fällt beim ersten Zugriff auf.
export const client = postgres(
	process.env.DATABASE_URL ?? 'postgres://DATABASE_URL-fehlt@invalid.invalid/none'
);
export const db = drizzle(client, { schema });
export { schema };
