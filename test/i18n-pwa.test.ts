/**
 * R7.2 tests: the web app speaks German and English and starts in the language
 * the admin chose.
 *
 * The German sentence is the key of `t()`. These tests keep the two languages in
 * step: every sentence the sources use has an English entry, no entry is left
 * over, no `{slot}` gets lost in translation and no German is left in the
 * English dictionary.
 */
import { expect } from 'chai';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';

/**
 * Loads a TypeScript file of the web app. `src-www` is an ES-module package
 * (`"type": "module"`), which `ts-node` refuses to require, so the file is
 * transpiled here and evaluated with a tiny CommonJS shim.
 *
 * @param file - Path of the `.ts` file.
 * @param cache - Modules loaded so far.
 */
function loadTs(file: string, cache: Map<string, Record<string, unknown>> = new Map()): Record<string, unknown> {
	const known = cache.get(file);
	if (known) {
		return known;
	}
	const output = ts.transpileModule(readFileSync(file, 'utf8'), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	}).outputText;
	const mod = { exports: {} as Record<string, unknown> };
	cache.set(file, mod.exports);
	const requireRelative = (spec: string): unknown => {
		if (!spec.startsWith('.')) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			return require(spec);
		}
		const base = resolve(dirname(file), spec);
		const target = existsSync(`${base}.ts`) ? `${base}.ts` : join(base, 'index.ts');
		return loadTs(target, cache);
	};

	new Function('exports', 'require', 'module', output)(mod.exports, requireRelative, mod);
	return mod.exports;
}

interface I18nModule {
	getLanguage(): string;
	locale(): string;
	resolveLanguage(sources: Record<string, string | null | undefined>): string;
	setLanguage(lang: 'de' | 'en'): void;
	t(key: string, vars?: Record<string, string | number>): string;
	toLang(raw: unknown): string | undefined;
}

const i18n = loadTs(resolve('src-www/src/i18n/index.ts')) as unknown as I18nModule;
const en = (loadTs(resolve('src-www/src/i18n/en.ts')) as { en: Record<string, string> }).en;
const labelsModule = loadTs(resolve('src-www/src/labels.ts')) as { INVOICE_TITLES: string[]; QUOTE_TITLES: string[] };
const { getLanguage, locale, resolveLanguage, setLanguage, t, toLang } = i18n;
const { INVOICE_TITLES, QUOTE_TITLES } = labelsModule;

const SOURCE_ROOT = 'src-www/src';

/** Sentences that are looked up dynamically, so no `t('…')` literal shows them. */
const DYNAMIC_KEYS = [
	...INVOICE_TITLES,
	...QUOTE_TITLES,
	// payment-term presets of the wizard: document content in German, label translated
	'Der Rechnungsbetrag ist sofort ohne Abzug fällig.',
	'Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.',
	'Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.',
];

/**
 * All `.ts` files below a directory.
 *
 * @param dir - Directory to walk.
 */
function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
		entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : [],
	);
}

/** Every sentence passed to `t('…')` / `t("…")` in the sources. */
function usedKeys(): Set<string> {
	const keys = new Set<string>();
	const patterns = [/(?<![\w.$])t\(\s*'((?:\\.|[^'\\])*)'/g, /(?<![\w.$])t\(\s*"((?:\\.|[^"\\])*)"/g];
	for (const file of walk(SOURCE_ROOT)) {
		if (file.includes(`${join(SOURCE_ROOT, 'i18n')}`)) {
			continue;
		}
		const source = readFileSync(file, 'utf8');
		for (const pattern of patterns) {
			for (const match of source.matchAll(pattern)) {
				keys.add(match[1].replace(/\\(.)/g, '$1'));
			}
		}
	}
	return keys;
}

/**
 * The `{name}` slots of a sentence.
 *
 * @param text - Sentence with slots.
 */
function slotsOf(text: string): string[] {
	return [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
}

describe('pwa => i18n (R7.2)', () => {
	afterEach(() => setLanguage('de'));

	it('has an English entry for every sentence the sources use', () => {
		const missing = [...usedKeys()].filter(key => !(key in en));
		expect(missing, 'sentences without an English entry').to.deep.equal([]);
	});

	it('keeps no English entry that nothing uses', () => {
		const used = usedKeys();
		const dynamic = new Set(DYNAMIC_KEYS);
		const stale = Object.keys(en).filter(key => !used.has(key) && !dynamic.has(key));
		expect(stale, 'English entries nobody asks for').to.deep.equal([]);
	});

	it('has English entries for the dynamic sentences (titles and payment presets)', () => {
		for (const key of DYNAMIC_KEYS) {
			expect(en[key], key).to.be.a('string');
		}
	});

	it('keeps the {slots} of every sentence in its translation', () => {
		const broken = Object.entries(en).filter(([key, value]) => slotsOf(key).join() !== slotsOf(value).join());
		expect(broken.map(([key]) => key)).to.deep.equal([]);
	});

	it('leaves no German in the English dictionary', () => {
		const german =
			/[äöüßÄÖÜ]|\b(und|nicht|keine|keinen|der|die|das|dem|ein|eine|wird|werden|für|mit|oder|ist|sind)\b/;
		const offenders = Object.entries(en).filter(([, value]) => german.test(value));
		expect(offenders.map(([, value]) => value)).to.deep.equal([]);
	});

	it('translates, falls back to German and fills the slots', () => {
		setLanguage('en');
		expect(t('Speichern')).to.equal('Save');
		expect(t('{n} Kunden', { n: 3 })).to.equal('3 customers');
		// a sentence without an entry stays readable instead of turning into a hole
		expect(t('Gibt es nicht {n}', { n: 1 })).to.equal('Gibt es nicht 1');
		setLanguage('de');
		expect(t('Speichern')).to.equal('Speichern');
		expect(t('{n} Kunden', { n: 3 })).to.equal('3 Kunden');
	});

	it('follows the language through locale() and getLanguage()', () => {
		setLanguage('en');
		expect(getLanguage()).to.equal('en');
		expect(locale()).to.equal('en-GB');
		setLanguage('de');
		expect(locale()).to.equal('de-DE');
	});

	it('resolves the start language: address bar, device, admin, browser, English', () => {
		expect(toLang('de-AT')).to.equal('de');
		expect(toLang('EN')).to.equal('en');
		expect(toLang('fr')).to.equal(undefined);
		expect(toLang('auto')).to.equal(undefined);
		// strongest first
		expect(resolveLanguage({ query: 'en', stored: 'de', admin: 'de', browser: 'de-DE' })).to.equal('en');
		expect(resolveLanguage({ stored: 'en', admin: 'de', browser: 'de-DE' })).to.equal('en');
		expect(resolveLanguage({ admin: 'en', browser: 'de-DE' })).to.equal('en');
		// `auto` (or anything unknown) in the admin hands the decision to the browser
		expect(resolveLanguage({ admin: 'auto', browser: 'de-DE' })).to.equal('de');
		expect(resolveLanguage({ admin: 'fr', browser: 'en-US' })).to.equal('en');
		// a browser in a language we do not ship ends up in English
		expect(resolveLanguage({ admin: 'auto', browser: 'fr-FR' })).to.equal('en');
		expect(resolveLanguage({})).to.equal('en');
	});

	it('shows no hard-wired German status words in the list views', () => {
		for (const file of ['views/dashboard.ts', 'views/offers.ts', 'views/detail.ts']) {
			const source = readFileSync(join(SOURCE_ROOT, file), 'utf8');
			// the raw API status must go through statusLabel()
			expect(source, file).to.not.match(/>\$\{(i|inv)\.status\}</);
		}
	});

	it('lets the admin pick auto, German or English', () => {
		const config = JSON.parse(readFileSync('admin/jsonConfig.json', 'utf8')) as {
			items: { server: { items: Record<string, { type?: string; options?: { value: string }[] }> } };
		};
		const select = config.items.server.items.pwaLanguage;
		expect(select.type).to.equal('select');
		expect(select.options?.map(option => option.value)).to.deep.equal(['auto', 'de', 'en']);
		const ioPackage = JSON.parse(readFileSync('io-package.json', 'utf8')) as { native: Record<string, unknown> };
		expect(ioPackage.native.pwaLanguage).to.equal('auto');
	});
});
