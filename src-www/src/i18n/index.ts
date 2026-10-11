/**
 * Languages of the web app (R7.2): the eleven languages of ioBroker.
 *
 * The source language is German: the German sentence is the key of `t()`, so a
 * missing entry shows the German text instead of a hole. `en.ts` carries the
 * English wording and is part of the first load; the other nine dictionaries
 * (`ru.ts`, `pt.ts`, …) are loaded on demand, only the one that is needed.
 * `test/i18n-pwa.test.ts` makes sure that every sentence used in the sources
 * has an entry in every dictionary and that no placeholder gets lost.
 */
import { en } from './en';

/** Languages the web app ships. */
export type Lang = 'de' | 'en' | 'ru' | 'pt' | 'nl' | 'fr' | 'it' | 'es' | 'pl' | 'uk' | 'zh-cn';

/** All shipped languages (the admin select offers exactly these plus `auto`). */
export const LANGUAGES: readonly Lang[] = ['de', 'en', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];

/** A dictionary: the German sentence is the key. */
export type Dictionary = Record<string, string>;

/** How to load the dictionaries that are not part of the first load. */
const LOADERS: Record<Exclude<Lang, 'de' | 'en'>, () => Promise<Dictionary>> = {
	ru: () => import('./ru').then(module => module.ru),
	pt: () => import('./pt').then(module => module.pt),
	nl: () => import('./nl').then(module => module.nl),
	fr: () => import('./fr').then(module => module.fr),
	it: () => import('./it').then(module => module.it),
	es: () => import('./es').then(module => module.es),
	pl: () => import('./pl').then(module => module.pl),
	uk: () => import('./uk').then(module => module.uk),
	'zh-cn': () => import('./zh-cn').then(module => module.zhCn),
};

/** Dictionaries loaded so far; English is always there. */
const dictionaries: Partial<Record<Lang, Dictionary>> = { en };

/** BCP-47 tags for `Intl` and `localeCompare`. */
const LOCALES: Record<Lang, string> = {
	de: 'de-DE',
	en: 'en-GB',
	ru: 'ru-RU',
	pt: 'pt-PT',
	nl: 'nl-NL',
	fr: 'fr-FR',
	it: 'it-IT',
	es: 'es-ES',
	pl: 'pl-PL',
	uk: 'uk-UA',
	'zh-cn': 'zh-CN',
};

/** localStorage key of the language chosen on this device. */
const STORAGE_KEY = 'einv-lang';

/** Values placed into `{name}` slots of a sentence. */
export type Vars = Record<string, string | number>;

let current: Lang = 'de';

/**
 * Narrows a raw language tag (`en-GB`, `de_AT`, `EN`, `zh-TW`) to a shipped language.
 * Chinese in any script or region ends up in `zh-cn`, the one Chinese dictionary.
 *
 * @param raw - Any value that may name a language.
 * @returns The shipped language, or `undefined` when it names none.
 */
export function toLang(raw: unknown): Lang | undefined {
	const base = (typeof raw === 'string' ? raw : '').trim().toLowerCase().split(/[-_]/)[0];
	if (base === 'zh') {
		return 'zh-cn';
	}
	return LANGUAGES.find(lang => lang === base);
}

/** Sources of the start language, strongest first. */
export interface LanguageSources {
	/** `?lang=` of the address bar. */
	query?: string | null;
	/** Choice stored on this device. */
	stored?: string | null;
	/** Value of the admin setting `pwaLanguage` (`auto` or one of the eleven languages). */
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
 * Makes sure the dictionary of a language is there. German is the source and needs none; English is part
 * of the first load. A dictionary that cannot be fetched (offline, a blocked file) leaves the language on
 * its English fallback instead of failing the page.
 *
 * @param lang - Language to prepare.
 */
export async function loadDictionary(lang: Lang): Promise<void> {
	if (lang === 'de' || dictionaries[lang]) {
		return;
	}
	try {
		dictionaries[lang] = await LOADERS[lang as Exclude<Lang, 'de' | 'en'>]();
	} catch {
		// the text of this language falls back to English
	}
}

/**
 * Sets the language of the page: dictionary, `<html lang>` and the choice of
 * this device (only when it was asked for explicitly). The dictionary has to be loaded
 * (`loadDictionary`), otherwise the texts show in English.
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
 * Picks the start language, loads its dictionary and applies it. `?lang=xx` is remembered for
 * this device, so a later visit without the parameter keeps the choice.
 *
 * @param admin - Admin setting `pwaLanguage`, when it is known.
 * @returns The language now in use.
 */
export async function initLanguage(admin?: string | null): Promise<Lang> {
	const query = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
	const asked = toLang(query);
	const lang = resolveLanguage({
		query,
		stored: readStored(STORAGE_KEY),
		admin,
		browser: typeof navigator === 'undefined' ? null : navigator.language,
	});
	await loadDictionary(lang);
	setLanguage(lang, asked !== undefined);
	return lang;
}

/**
 * Translates a sentence. German is the key and the source language; a sentence
 * without an entry in the language in use shows in English, and without an English entry it stays
 * German (the tests keep both from happening).
 *
 * @param key - The German sentence, `{name}` marks a value slot.
 * @param vars - Values for the slots.
 */
export function t(key: string, vars?: Vars): string {
	const text = current === 'de' ? key : (dictionaries[current]?.[key] ?? en[key] ?? key);
	if (!vars) {
		return text;
	}
	return text.replace(/\{(\w+)\}/g, (slot: string, name: string) => (name in vars ? String(vars[name]) : slot));
}

/** BCP-47 tag for `Intl` and `localeCompare` in the language in use. */
export function locale(): string {
	return LOCALES[current];
}
