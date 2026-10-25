import { describe, expect, it } from 'vitest';
import { searchIcons, type IconEntry } from './icon-search';

const index: IconEntry[] = [
	{ n: 'beach', t: 'map sea sun vacation' },
	{ n: 'coffee', t: 'food cup drink' },
	{ n: 'car', t: 'vehicles vehicle drive' },
	{ n: 'car-crane', t: 'vehicles crane' },
	{ n: 'gas-station', t: 'map fuel petrol' },
	{ n: 'shopping-cart', t: 'e-commerce buy shop' },
	{ n: 'pizza', t: 'food italian' }
];

describe('searchIcons', () => {
	it('ranks the exact name first', () => {
		expect(searchIcons(index, 'car').slice(0, 2)).toEqual(['car', 'car-crane']);
	});

	it('finds icons by tag', () => {
		expect(searchIcons(index, 'fuel')).toEqual(['gas-station']);
		expect(searchIcons(index, 'food')).toEqual(['pizza', 'coffee']);
	});

	it('understands German words', () => {
		expect(searchIcons(index, 'Urlaub')).toEqual(['beach']);
		expect(searchIcons(index, 'tanken')).toEqual(['gas-station']);
		expect(searchIcons(index, 'Kaffee')).toEqual(['coffee']);
		expect(searchIcons(index, 'Einkauf')).toEqual(['shopping-cart']);
	});

	it('returns nothing for an empty query', () => {
		expect(searchIcons(index, '  ')).toEqual([]);
	});
});
