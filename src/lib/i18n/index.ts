import { getContext, setContext } from 'svelte';
import type { Cents } from '../money.ts';
import { de } from './de.ts';
import { en } from './en.ts';

export const LOCALES = ['en', 'de'] as const;
/** Explicit language choice; absent = follow the browser. */
export const LANG_COOKIE = 'lang';
export type Locale = (typeof LOCALES)[number];
export const isLocale = (s: unknown): s is Locale => LOCALES.includes(s as Locale);

type Message = string | ((p: { n: number }) => string);
type Shape<T> = { [K in keyof T]: T[K] extends Message ? Message : Shape<T[K]> };
export type Dictionary = Shape<typeof en>;

type Leaves<T, P extends string = ''> = {
	[K in keyof T & string]: T[K] extends Message ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<typeof en>;

const dictionaries: Record<Locale, Dictionary> = { en, de };
const intl: Record<Locale, string> = { en: 'en-GB', de: 'de-DE' };

export function translate(
	locale: Locale,
	key: MessageKey,
	vars: Record<string, string | number> = {}
): string {
	let node: unknown = dictionaries[locale];
	for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
	const msg =
		typeof node === 'function'
			? (node as (p: { n: number }) => string)({ n: Number(vars.n) })
			: node;
	return String(msg).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Picks the first supported language from an Accept-Language header; English otherwise. */
export function negotiate(header: string | null): Locale {
	const ranked = (header ?? '')
		.split(',')
		.map((part) => {
			const [tag = '', q] = part.trim().split(';q=');
			return { lang: tag.slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 };
		})
		.sort((a, b) => b.q - a.q);
	return ranked.map((r) => r.lang).find(isLocale) ?? 'en';
}

export function formatMoney(locale: Locale, cents: Cents): string {
	return new Intl.NumberFormat(intl[locale], { style: 'currency', currency: 'EUR' }).format(
		cents / 100
	);
}

export function formatDate(
	locale: Locale,
	date: Date | string,
	opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
): string {
	return new Intl.DateTimeFormat(intl[locale], { timeZone: 'Europe/Berlin', ...opts }).format(
		new Date(date)
	);
}

export interface I18n {
	readonly locale: Locale;
	t: (key: MessageKey, vars?: Record<string, string | number>) => string;
	money: (cents: Cents) => string;
	date: (date: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
}

const KEY = Symbol('i18n');

/** Called once in the root layout; `getLocale` keeps it reactive when the language changes. */
export function provideI18n(getLocale: () => Locale): I18n {
	const i18n: I18n = {
		get locale() {
			return getLocale();
		},
		t: (key, vars) => translate(getLocale(), key, vars),
		money: (cents) => formatMoney(getLocale(), cents),
		date: (date, opts) => formatDate(getLocale(), date, opts)
	};
	return setContext(KEY, i18n);
}

export const useI18n = () => getContext<I18n>(KEY);
