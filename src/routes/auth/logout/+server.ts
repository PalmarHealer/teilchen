import { redirect } from '@sveltejs/kit';
import { destroySession } from '#lib/server/auth/session.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	redirect(303, '/login');
};
