import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FALLBACK_PRODUCT_ICON, PRODUCT_ICONS, productIcon } from './product-icon';

describe('productIcon', () => {
	it('only returns icons that exist in @tabler/icons', () => {
		const missing = PRODUCT_ICONS.filter(
			(n) => !existsSync(`node_modules/@tabler/icons/icons/outline/${n}.svg`)
		);
		expect(missing).toEqual([]);
	});

	it.each([
		['HAFERMILCH BARISTA', 'milk'],
		['MILCHSCHOKOLADE', 'candy'],
		['BIO BANANEN', 'banana'],
		['SPAGHETTI', 'bowl-chopsticks'],
		['BASMATI REIS', 'bowl-chopsticks'],
		['VANILLE EIS', 'ice-cream'],
		['TOMATEN PASSIERT', 'salad'],
		['PARMIGIANO', 'cheese'],
		['Käse gerieben', 'cheese'],
		['ZAHNPASTA', 'dental'],
		['MINERALWASSER (inkl. Pfand)', 'bottle'],
		['PFAND 0,25 EURO', 'recycle'],
		['KAFFEEBOHNEN', 'coffee'],
		['SALZSTANGEN', 'cookie-man'],
		['ROSENKOHL', 'salad'],
		['LACHSFILET', 'fish'],
		['XYZ 123', FALLBACK_PRODUCT_ICON]
	])('%s → %s', (name, icon) => {
		expect(productIcon(name)).toBe(icon);
	});
});
