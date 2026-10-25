import { error } from '@sveltejs/kit';
import { iconSvg } from '#lib/server/tabler.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const svg = iconSvg(params.name);
	if (!svg) error(404);
	return new Response(svg, {
		headers: {
			'content-type': 'image/svg+xml',
			// Icon shapes never change for a given package version.
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
