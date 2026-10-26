import { defineParams } from '@sveltejs/kit/params';
import { isUuid } from '#lib/uuid.ts';

export const params = defineParams({
	/** Database ids: anything else is a 404 instead of a failing query. */
	uuid: (param) => (isUuid(param) ? param : undefined)
});
