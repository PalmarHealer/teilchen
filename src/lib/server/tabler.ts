import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * User-chosen icons (groups, expenses) can be any Tabler outline icon. They are served one by one
 * from /icons/<name>.svg instead of bundling all ~5000. The package's `exports` hide its data
 * files, so they are read from node_modules (present in dev and in the production image).
 */
type IconNode = [string, Record<string, string>];

const dir = () => join(process.cwd(), 'node_modules', '@tabler', 'icons');
let nodes: Record<string, IconNode[]> | undefined;
let index: { n: string; t: string }[] | undefined;

function allNodes() {
	nodes ??= JSON.parse(readFileSync(join(dir(), 'tabler-nodes-outline.json'), 'utf8'));
	return nodes!;
}

export const isIcon = (name: unknown): name is string =>
	typeof name === 'string' && /^[a-z0-9-]{1,60}$/.test(name) && name in allNodes();

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function iconSvg(name: string): string | null {
	const icon = allNodes()[name];
	if (!icon) return null;
	const body = icon
		.map(
			([tag, attrs]) =>
				`<${tag} ${Object.entries(attrs)
					.filter(([k]) => k !== 'key')
					.map(([k, v]) => `${k}="${escape(v)}"`)
					.join(' ')}/>`
		)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/** Compact search index: name + tags + category, outline icons only. */
export function iconIndex() {
	if (!index) {
		const meta = JSON.parse(readFileSync(join(dir(), 'icons.json'), 'utf8')) as Record<
			string,
			{
				name: string;
				category?: string;
				tags?: (string | number)[];
				styles?: { outline?: unknown };
			}
		>;
		const available = allNodes();
		index = Object.values(meta)
			.filter((m) => m.styles?.outline && m.name in available)
			.map((m) => ({
				n: m.name,
				t: [m.category ?? '', ...(m.tags ?? [])].join(' ').toLowerCase()
			}));
	}
	return index;
}
