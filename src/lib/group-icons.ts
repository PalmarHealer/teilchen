/** Wählbare Gruppen-Symbole (Tabler). In der DB steht nur der Schlüssel. */
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
