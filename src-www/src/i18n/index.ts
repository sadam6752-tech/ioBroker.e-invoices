/**
 * Languages of the web app (R7.2).
 *
 * The source language is German: the German sentence is the key of `t()`, so a
 * missing English entry shows the German text instead of a hole. `en.ts` carries
 * the English wording; `test/i18n-pwa.test.ts` makes sure that every sentence
 * used in the sources has an entry there and that no placeholder gets lost.
 */
import { en } from './en';

/** Languages the web app ships. */
export type Lang = 'de' | 'en';

/** All shipped languages (the admin select offers exactly these plus `auto`). */
export const LANGUAGES: readonly Lang[] = ['de', 'en'];

/** localStorage key of the language chosen on this device. */
const STORAGE_KEY = 'einv-lang';

/** Values placed into `{name}` slots of a sentence. */
export type Vars = Record<string, string | number>;

let current: Lang = 'de';

/**
 * Narrows a raw language tag (`en-GB`, `de_AT`, `EN`) to a shipped language.
 *
 * @param raw - Any value that may name a language.
 * @returns The shipped language, or `undefined` when it names none.
 */
export function toLang(raw: unknown): Lang | undefined {
	const base = (typeof raw === 'string' ? raw : '').trim().toLowerCase().split(/[-_]/)[0];
	return base === 'de' || base === 'en' ? base : undefined;
}

/** Sources of the start language, strongest first. */
export interface LanguageSources {
	/** `?lang=` of the address bar. */
	query?: string | null;
	/** Choice stored on this device. */
	stored?: string | null;
	/** Value of the admin setting `pwaLanguage` (`auto`, `de`, `en`). */
	admin?: string | null;
	/** `navigator.language`. */
	browser?: string | null;
}

/**
 * Start language: address bar → choice of this device → admin setting →
 * browser → English. `auto` in the admin means "ask the browser".
 *
 * @param sources - The places a language may come from.
 */
export function resolveLanguage(sources: LanguageSources): Lang {
	return toLang(sources.query) ?? toLang(sources.stored) ?? toLang(sources.admin) ?? toLang(sources.browser) ?? 'en';
}

/**
 * Reads a localStorage value without ever throwing (private mode, blocked storage).
 *
 * @param key - Storage key.
 */
function readStored(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Sets the language of the page: dictionary, `<html lang>` and the choice of
 * this device (only when it was asked for explicitly).
 *
 * @param lang - Language to use.
 * @param remember - Store it as the choice of this device.
 */
export function setLanguage(lang: Lang, remember = false): void {
	current = lang;
	if (typeof document !== 'undefined') {
		document.documentElement.lang = lang;
	}
	if (remember) {
		try {
			localStorage.setItem(STORAGE_KEY, lang);
		} catch {
			// storage blocked: the language still applies for this page view
		}
	}
}

/** The language in use. */
export function getLanguage(): Lang {
	return current;
}

/**
 * Picks the start language and applies it. `?lang=xx` is remembered for this
 * device, so a later visit without the parameter keeps the choice.
 *
 * @param admin - Admin setting `pwaLanguage`, when it is known.
 * @returns The language now in use.
 */
export function initLanguage(admin?: string | null): Lang {
	const query = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
	const asked = toLang(query);
	const lang = resolveLanguage({
		query,
		stored: readStored(STORAGE_KEY),
		admin,
		browser: typeof navigator === 'undefined' ? null : navigator.language,
	});
	setLanguage(lang, asked !== undefined);
	return lang;
}

/**
 * Translates a sentence. German is the key and the source language; a sentence
 * without an English entry stays German (the tests keep that from happening).
 *
 * @param key - The German sentence, `{name}` marks a value slot.
 * @param vars - Values for the slots.
 */
export function t(key: string, vars?: Vars): string {
	const text = current === 'de' ? key : (en[key] ?? key);
	if (!vars) {
		return text;
	}
	return text.replace(/\{(\w+)\}/g, (slot: string, name: string) => (name in vars ? String(vars[name]) : slot));
}

/** BCP-47 tag for `Intl` and `localeCompare` in the language in use. */
export function locale(): string {
	return current === 'de' ? 'de-DE' : 'en-GB';
}
