import { describe, expect, it } from 'vitest';
import { canLink, isProductImage, searchTerm } from './product-image';

describe('searchTerm', () => {
	it('drops the deposit note', () => {
		expect(searchTerm('SPEZI (inkl. Pfand)')).toBe('SPEZI');
	});

	it('turns a shop link into the product id', () => {
		expect(
			searchTerm(
				'https://www.rewe.de/produkte/bad-brambacher-garten-limonade-himbeere-zitrone-0-5l/7352005'
			)
		).toBe('7352005');
		expect(searchTerm('https://www.rewe.de/shop/p/ja-h-milch-1-5-1l/3070776?foo=1')).toBe(
			'3070776'
		);
	});
});

describe('isProductImage', () => {
	it('only accepts plain links on the REWE image CDN', () => {
		expect(isProductImage('https://img.rewe-static.de/7352005/1_digital-image.png')).toBe(true);
		expect(isProductImage('https://evil.example/x.png')).toBe(false);
		expect(isProductImage('https://img.rewe-static.de.evil.example/x.png')).toBe(false);
		expect(isProductImage('https://img.rewe-static.de/x.png?track=1')).toBe(false);
	});
});

describe('canLink', () => {
	const user = { isAdmin: false, editLinks: false };
	it('lets anyone link an unlinked line', () => {
		expect(canLink(null, user)).toBe(true);
	});
	it('needs the setting to relink', () => {
		expect(canLink('user', user)).toBe(false);
		expect(canLink('user', { ...user, editLinks: true })).toBe(true);
	});
	it('leaves automatic links to admins', () => {
		expect(canLink('system', { ...user, editLinks: true })).toBe(false);
		expect(canLink('system', { isAdmin: true, editLinks: false })).toBe(false);
		expect(canLink('system', { isAdmin: true, editLinks: true })).toBe(true);
	});
});
