/** Database ids. Checked before they reach a query, where anything else would be a server error. */
export const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const isUuid = (s: unknown): s is string =>
	typeof s === 'string' && new RegExp(`^${UUID_SOURCE}$`, 'i').test(s);
