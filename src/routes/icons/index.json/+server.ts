import { json } from '@sveltejs/kit';
import { iconIndex } from '#lib/server/tabler.ts';
import type { RequestHandler } from './$types';

// Built once at build time, so it is served as a precompressed static file (~0.5 MB raw).
export const prerender = true;

export const GET: RequestHandler = () => json(iconIndex());
