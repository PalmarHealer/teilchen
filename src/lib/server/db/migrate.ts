import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { client, db } from './index';

await migrate(db, { migrationsFolder: './drizzle' });
await client.end();
console.log('Migrations applied');
