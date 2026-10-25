import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// postgres() only connects on the first query. The build imports this module without env,
// so don't throw on import – a missing DATABASE_URL surfaces on first use.
export const client = postgres(
	process.env.DATABASE_URL ?? 'postgres://DATABASE_URL-missing@invalid.invalid/none'
);
export const db = drizzle(client, { schema });
export { schema };
