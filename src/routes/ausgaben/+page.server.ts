import { recentExpenses } from '#lib/server/domain.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	expenses: await recentExpenses(locals.user!.id, undefined, 200)
});
