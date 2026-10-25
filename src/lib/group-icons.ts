/** Selectable group icons (Tabler). The DB stores only the key. */
export const GROUP_ICONS = [
	'home',
	'users',
	'heart',
	'plane',
	'beach',
	'tent',
	'car',
	'cart',
	'kitchen',
	'beer',
	'briefcase',
	'football'
] as const;
export type GroupIcon = (typeof GROUP_ICONS)[number];
export const isGroupIcon = (s: unknown): s is GroupIcon => GROUP_ICONS.includes(s as GroupIcon);
