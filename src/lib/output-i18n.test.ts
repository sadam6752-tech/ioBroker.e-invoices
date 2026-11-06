/**
 * The languages of the exports and the dunning letters: every text in all eleven languages, really translated,
 * with its placeholders, and the language picked the way the web app and the system ask for it.
 */
import { expect } from 'chai';
import {
	formatOutputAmount,
	formatOutputDate,
	OUTPUT_LANGUAGES,
	OUTPUT_TEXTS,
	outputLanguage,
	tr,
} from './output-i18n';

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('output-i18n => translations', () => {
	it('translates every text into the ten other languages, none a copy of the English one', () => {
		const missing: string[] = [];
		const copies: string[] = [];
		for (const [english, translations] of Object.entries(OUTPUT_TEXTS)) {
			for (const language of OUTPUT_LANGUAGES.filter(l => l !== 'en')) {
				const text = (translations as Record<string, string | undefined>)[language];
				if (!text) {
					missing.push(`${language}: ${english}`);
				} else if (text === english) {
					copies.push(`${language}: ${english}`);
				}
			}
		}
		expect(missing).to.deep.equal([]);
		expect(copies).to.deep.equal([]);
	});

	it('keeps every placeholder in every language', () => {
		for (const [english, translations] of Object.entries(OUTPUT_TEXTS)) {
			for (const [language, text] of Object.entries(translations)) {
				expect(placeholders(text), `${language}: ${english}`).to.deep.equal(placeholders(english));
			}
		}
	});

	it('falls back to the English text and fills the placeholders', () => {
		expect(tr('de', 'Open items as of {date}', { date: '01.08.2026' })).to.equal('Offene Posten zum 01.08.2026');
		expect(tr('en', 'Open items as of {date}', { date: '2026' })).to.equal('Open items as of 2026');
		expect(tr('fr', 'not in the table')).to.equal('not in the table');
	});
});

describe('output-i18n => language', () => {
	it('takes the first supported language, English when there is none', () => {
		expect(outputLanguage('ru', 'de')).to.equal('ru');
		expect(outputLanguage(undefined, '', 'de')).to.equal('de');
		expect(outputLanguage('de-DE')).to.equal('de');
		expect(outputLanguage('zh-CN')).to.equal('zh-cn');
		expect(outputLanguage('zh')).to.equal('zh-cn');
		expect(outputLanguage('xx', 42, null)).to.equal('en');
		expect(outputLanguage()).to.equal('en');
	});

	it('writes dates and amounts like the language', () => {
		expect(formatOutputDate('2026-07-15', 'de')).to.equal('15.07.2026');
		expect(formatOutputDate('2026-07-15', 'en')).to.equal('15/07/2026');
		expect(formatOutputDate('2026-07-15T23:59:00Z', 'de')).to.equal('15.07.2026');
		expect(formatOutputAmount(119, 'de')).to.equal('119,00 €');
		expect(formatOutputAmount(119, 'en')).to.equal('€119.00');
		expect(formatOutputAmount(1234.5, 'fr')).to.match(/1\s?234,50\s?€/);
	});
});
