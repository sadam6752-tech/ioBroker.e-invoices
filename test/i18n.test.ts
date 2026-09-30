/**
 * Admin i18n regression tests (run without js-controller).
 *
 * Found in the live instance on 30.09.2026: the tab "Firmenstammdaten" showed
 * "StraÃŸe" instead of "Straße", and the hint above it stayed English although
 * a German translation existed. Cause: the eleven `admin/i18n/*.json` files had
 * been rewritten with the Windows code page 1252 while they were stored as
 * UTF-8, so every multi-byte character was double encoded — and the key of the
 * hint no longer matched the source text in `admin/jsonConfig.json` (the
 * typographic quotes had been mangled as well), so the admin never used it.
 */
import { expect } from 'chai';
import { readdirSync, readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';

const DIRECTORY = 'admin/i18n';

const LANGUAGES = [
	'de.json',
	'en.json',
	'es.json',
	'fr.json',
	'it.json',
	'nl.json',
	'pl.json',
	'pt.json',
	'ru.json',
	'uk.json',
	'zh-cn.json',
];

/**
 * windows-1252 slots 0x80..0x9F that differ from ISO-8859-1. The slots 0x81,
 * 0x8D, 0x8F, 0x90 and 0x9D are undefined in windows-1252 and keep their code
 * point, which the plain loop below already covers.
 */
const WINDOWS_1252_HIGH: [number, string][] = [
	[0x80, '\u20ac'],
	[0x82, '\u201a'],
	[0x83, '\u0192'],
	[0x84, '\u201e'],
	[0x85, '\u2026'],
	[0x86, '\u2020'],
	[0x87, '\u2021'],
	[0x88, '\u02c6'],
	[0x89, '\u2030'],
	[0x8a, '\u0160'],
	[0x8b, '\u2039'],
	[0x8c, '\u0152'],
	[0x8e, '\u017d'],
	[0x91, '\u2018'],
	[0x92, '\u2019'],
	[0x93, '\u201c'],
	[0x94, '\u201d'],
	[0x95, '\u2022'],
	[0x96, '\u2013'],
	[0x97, '\u2014'],
	[0x98, '\u02dc'],
	[0x99, '\u2122'],
	[0x9a, '\u0161'],
	[0x9b, '\u203a'],
	[0x9c, '\u0153'],
	[0x9e, '\u017e'],
	[0x9f, '\u0178'],
];

/** Byte for every character a text can be decoded from as windows-1252. */
const BYTE_OF = new Map<string, number>();
for (let byte = 0; byte <= 0xff; byte++) {
	BYTE_OF.set(String.fromCharCode(byte), byte);
}
for (const [byte, char] of WINDOWS_1252_HIGH) {
	BYTE_OF.set(char, byte);
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

/**
 * Reverses the classic "UTF-8 read as windows-1252" double encoding by turning
 * the characters back into their bytes and reading those as UTF-8.
 * Returns `null` when the text cannot be such a double encoding, which is the
 * normal case for a healthy file: the byte sequence of properly encoded text
 * (`Stra\u00dfe`) is not valid UTF-8.
 *
 * @param text - Text of a language file.
 * @returns Repaired text or `null`.
 */
function repairDoubleEncoding(text: string): string | null {
	const bytes: number[] = [];
	for (const char of text) {
		const byte = BYTE_OF.get(char);
		if (byte === undefined) {
			return null;
		}
		bytes.push(byte);
	}
	try {
		return utf8.decode(Buffer.from(bytes));
	} catch {
		return null;
	}
}

/**
 * Key/value pairs of one language file.
 *
 * @param file - File name inside `admin/i18n`.
 * @returns Entries of the JSON object.
 */
function entriesOf(file: string): [string, string][] {
	const parsed = JSON.parse(readFileSync(`${DIRECTORY}/${file}`, 'utf8')) as Record<string, string>;
	return Object.entries(parsed);
}

/**
 * All strings the admin looks up in the i18n files (`label`, `help`, `text`).
 * Select options are skipped: their labels are the values sent to the adapter
 * (e.g. "19 %" or a payment term), not translated UI text.
 *
 * @param node - Part of the parsed jsonConfig.
 * @param collected - Runs the found strings together.
 * @returns Source strings of `admin/jsonConfig.json`.
 */
function collectJsonConfigStrings(node: unknown, collected: string[] = []): string[] {
	if (Array.isArray(node)) {
		for (const item of node) {
			collectJsonConfigStrings(item, collected);
		}
		return collected;
	}
	if (node === null || typeof node !== 'object') {
		return collected;
	}
	for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
		if (key === 'options') {
			continue;
		}
		if (['label', 'help', 'text'].includes(key) && typeof value === 'string') {
			collected.push(value);
		}
		collectJsonConfigStrings(value, collected);
	}
	return collected;
}

/**
 * All translated UI strings of `admin/jsonConfig.json`.
 *
 * @returns Source strings of the adapter configuration.
 */
function jsonConfigStrings(): string[] {
	return collectJsonConfigStrings(JSON.parse(readFileSync('admin/jsonConfig.json', 'utf8')));
}

describe('admin => i18n', function () {
	it('ships all eleven languages as plain UTF-8', () => {
		const shipped = readdirSync(DIRECTORY)
			.filter(file => file.endsWith('.json'))
			.sort();
		expect(shipped).to.deep.equal(LANGUAGES);
		for (const file of LANGUAGES) {
			const bytes = readFileSync(`${DIRECTORY}/${file}`);
			expect(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), `${file} starts with a BOM`).to.equal(
				false,
			);
			expect(() => utf8.decode(bytes), `${file} is not valid UTF-8`).to.not.throw();
			expect(Object.keys(JSON.parse(bytes.toString('utf8')))).to.have.length.greaterThan(0);
		}
	});

	it('has no double encoded text in any language', () => {
		// Regression 30.09.2026: a code-page rewrite turned "Straße" into "StraÃŸe"
		// and "„Firma\"" into "â€žFirma\"" in all eleven files.
		const offenders: string[] = [];
		for (const file of LANGUAGES) {
			for (const [key, value] of entriesOf(file)) {
				for (const text of [key, value]) {
					const repaired = repairDoubleEncoding(text);
					if (repaired !== null && repaired !== text) {
						offenders.push(`${file}: ${text} -> ${repaired}`);
					}
				}
			}
		}
		expect(offenders).to.deep.equal([]);
	});

	it('translates the street label as "Straße"', () => {
		const german = Object.fromEntries(entriesOf('de.json'));
		expect(german['Company street']).to.equal('Stra\u00dfe');
	});

	it('keeps the same keys in every language', () => {
		const keySets = LANGUAGES.map(file =>
			Object.keys(Object.fromEntries(entriesOf(file)))
				.sort()
				.join('\n'),
		);
		expect(new Set(keySets).size, 'the language files carry different keys').to.equal(1);
	});

	it('uses the exact jsonConfig strings as keys so every translation applies', () => {
		// The mangled quotes of the company hint broke this match silently: the key
		// in the i18n files was "â€œFirmaâ€" while jsonConfig said "“Firma”".
		const configStrings = jsonConfigStrings();
		expect(configStrings.length).to.be.greaterThan(20);
		for (const file of LANGUAGES) {
			const keys = Object.keys(Object.fromEntries(entriesOf(file)));
			const missing = configStrings.filter(text => !keys.includes(text));
			expect(missing, `jsonConfig strings missing as keys in ${file}`).to.deep.equal([]);
		}
	});
});
