/**
 * Header position tests: the two template settings `logoTopMm` and `textTopMm`
 * move the logo and the header text on the sheet, in millimetres from the top
 * edge, and leave everything as it was when they are not set.
 *
 * The geometry is read back from the content stream of the rendered PDF: the
 * logo is the `… cm /I1 Do` image placement, the header text starts with the
 * first `Tm` text matrix. pdfkit flips the page (`1 0 0 -1 0 841.89 cm`), so a
 * distance from the top is the page height minus the y of the matrix.
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { expect } from 'chai';
import { InvoiceDatabase, type StoredInvoice } from './db';
import type { InvoiceDraftInput } from './invoice-model';
import { headerTops, renderInvoicePdf } from './pdf';
import { DEFAULT_TEMPLATE, validateTemplate, type LayoutTemplate } from './templates';

const MM = 72 / 25.4;
const PAGE_HEIGHT = 841.89;

/** The real adapter logo: a 512 × 512 PNG, drawn 51 pt wide at 30 mm. */
const logoData = readFileSync('admin/e-invoices.png');

const seller = {
	name: 'Muster GmbH',
	street: 'B 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
};
const buyer = { name: 'Kunde AG', street: 'K 5', zip: '80331', city: 'München', country: 'DE', customerNumber: 'K-42' };

/**
 * An issued invoice with the given number of lines.
 *
 * @param lines - Number of positions (a long list runs over several pages).
 */
function issued(lines = 1): StoredInvoice {
	const db = new InvoiceDatabase(':memory:');
	db.migrate();
	try {
		const input: InvoiceDraftInput = {
			seller,
			buyer,
			lines: Array.from({ length: lines }, (_, i) => ({
				description: `Leistung ${i + 1}`,
				quantity: 1,
				unit: 'Stk',
				unitPriceNet: 10,
				vatRate: 19,
			})),
			issueDate: '2026-09-28',
			deliveryDate: '2026-09-28',
			currency: 'EUR',
		};
		return db.issueDraft(db.createDraft(input).id);
	} finally {
		db.close();
	}
}

/**
 * Template with a logo and the given header settings.
 *
 * @param extra - Settings to add on top of the default template.
 */
function withLogo(extra: Partial<LayoutTemplate> = {}): LayoutTemplate {
	return { ...DEFAULT_TEMPLATE, logo: { path: 'logos/x.png', position: 'left', widthMm: 30 }, ...extra };
}

/** What the content streams of a PDF say about the header. */
interface Geometry {
	/** Top edge of every drawn image in pt from the top of the sheet, page by page. */
	imageTops: number[];
	/** Top of the first text of the first page, baseline minus the ascent of its 7 pt font. */
	firstTextBaseline: number;
}

/**
 * Reads the geometry out of a rendered PDF.
 *
 * @param pdf - PDF bytes.
 */
function geometry(pdf: Buffer): Geometry {
	const raw = pdf.toString('latin1');
	const imageTops: number[] = [];
	let firstTextBaseline: number | undefined;
	for (const match of raw.matchAll(/stream\r?\n/g)) {
		const start = (match.index ?? 0) + match[0].length;
		const end = raw.indexOf('endstream', start);
		let body: string;
		try {
			body = inflateSync(pdf.subarray(start, end)).toString('latin1');
		} catch {
			continue;
		}
		for (const image of body.matchAll(/([\d.]+) 0 0 -([\d.]+) ([\d.]+) ([\d.]+) cm\s*\/I\d+ Do/g)) {
			// the matrix carries the bottom edge in flipped coordinates: top = y - height
			imageTops.push(Number(image[4]) - Number(image[2]));
		}
		if (firstTextBaseline === undefined) {
			const text = /1 0 0 1 [\d.]+ ([\d.]+) Tm/.exec(body);
			if (text) {
				firstTextBaseline = PAGE_HEIGHT - Number(text[1]);
			}
		}
	}
	return { imageTops, firstTextBaseline: firstTextBaseline ?? Number.NaN };
}

describe('header position => anchors (pure)', () => {
	it('keeps the old layout when nothing is set', () => {
		expect(headerTops({}, 0)).to.deep.equal({ logoTopPt: 36, textTopPt: 50 });
		// the text follows the logo: 36 + 100 + 10
		expect(headerTops({}, 100)).to.deep.equal({ logoTopPt: 36, textTopPt: 146 });
	});

	it('moves the logo on its own and lets the text follow it', () => {
		const tops = headerTops({ logoTopMm: 30 }, 100);
		expect(tops.logoTopPt).to.be.closeTo(30 * MM, 0.001);
		expect(tops.textTopPt).to.be.closeTo(30 * MM + 110, 0.001);
	});

	it('pins the text whatever the logo does', () => {
		for (const logoTopMm of [undefined, 5, 40]) {
			const tops = headerTops({ logoTopMm, textTopMm: 60 }, 100);
			expect(tops.textTopPt, `logo at ${String(logoTopMm)}`).to.be.closeTo(60 * MM, 0.001);
		}
		// 0 is a valid position (the very edge of the sheet), not "unset"
		expect(headerTops({ textTopMm: 0 }, 100).textTopPt).to.equal(0);
		expect(headerTops({ logoTopMm: 0 }, 0).logoTopPt).to.equal(0);
	});

	it('falls back to the old layout for values that are no distance', () => {
		for (const bad of [-5, 151, Number.NaN, Infinity, '12' as unknown as number]) {
			expect(headerTops({ logoTopMm: bad, textTopMm: bad }, 100), String(bad)).to.deep.equal({
				logoTopPt: 36,
				textTopPt: 146,
			});
		}
	});
});

describe('header position => rendered PDF', function () {
	this.timeout(60000);

	it('draws the logo and the text where the old layout put them when nothing is set', async () => {
		const pdf = await renderInvoicePdf(issued(), withLogo(), { data: logoData });
		const g = geometry(pdf);
		expect(g.imageTops).to.have.lengthOf(1);
		expect(g.imageTops[0], 'logo top at 36 pt').to.be.closeTo(36, 0.01);
		// the text follows the logo: 36 + 51 + 10 pt, plus the 7 pt font's ascent
		expect(g.firstTextBaseline).to.be.closeTo(36 + 51.02 + 10 + 6.33, 0.1);
	});

	it('moves the logo by the distance entered, and the text with it while the text has no setting', async () => {
		const base = geometry(await renderInvoicePdf(issued(), withLogo(), { data: logoData }));
		const moved = geometry(await renderInvoicePdf(issued(), withLogo({ logoTopMm: 30 }), { data: logoData }));
		expect(moved.imageTops[0]).to.be.closeTo(30 * MM, 0.01);
		expect(moved.firstTextBaseline - base.firstTextBaseline).to.be.closeTo(30 * MM - 36, 0.1);
	});

	it('moves the text on its own and leaves the logo alone', async () => {
		const base = geometry(await renderInvoicePdf(issued(), withLogo({ textTopMm: 60 }), { data: logoData }));
		const moved = geometry(await renderInvoicePdf(issued(), withLogo({ textTopMm: 80 }), { data: logoData }));
		expect(moved.imageTops[0], 'the logo did not move').to.be.closeTo(base.imageTops[0], 0.001);
		expect(moved.firstTextBaseline - base.firstTextBaseline).to.be.closeTo(20 * MM, 0.01);
		// 60 mm from the top, the 7 pt tagline's baseline sits one ascent below it
		expect(base.firstTextBaseline).to.be.closeTo(60 * MM + 6.33, 0.1);
	});

	it('works without a logo: the text start alone', async () => {
		const base = geometry(await renderInvoicePdf(issued(), { ...DEFAULT_TEMPLATE }));
		const moved = geometry(await renderInvoicePdf(issued(), { ...DEFAULT_TEMPLATE, textTopMm: 45 }));
		expect(base.imageTops).to.deep.equal([]);
		expect(base.firstTextBaseline).to.be.closeTo(50 + 6.33, 0.1);
		expect(moved.firstTextBaseline).to.be.closeTo(45 * MM + 6.33, 0.1);
	});

	it('draws the logo of the following pages at the same distance', async () => {
		const pdf = await renderInvoicePdf(
			issued(70),
			withLogo({ logoTopMm: 20, logo: { path: 'logos/x.png', position: 'left', widthMm: 30, allPages: true } }),
			{
				data: logoData,
			},
		);
		const tops = geometry(pdf).imageTops;
		expect(tops.length, 'one logo per page').to.be.greaterThan(1);
		for (const top of tops) {
			expect(top).to.be.closeTo(20 * MM, 0.01);
		}
	});
});

describe('header position => validation', () => {
	const valid = (): LayoutTemplate => ({ ...DEFAULT_TEMPLATE, blocks: { ...DEFAULT_TEMPLATE.blocks } });

	it('accepts a distance from 0 to 150 mm and a template without the settings', () => {
		expect(validateTemplate(valid())).to.deep.equal([]);
		expect(validateTemplate({ ...valid(), logoTopMm: 0, textTopMm: 150 })).to.deep.equal([]);
		expect(validateTemplate({ ...valid(), logoTopMm: 12.7, textTopMm: 62.5 })).to.deep.equal([]);
		// null is the "cleared" value the form sends, and it renders like a missing setting
		expect(validateTemplate({ ...valid(), logoTopMm: null, textTopMm: null })).to.deep.equal([]);
		expect(headerTops({ logoTopMm: null, textTopMm: null } as never, 100)).to.deep.equal({
			logoTopPt: 36,
			textTopPt: 146,
		});
	});

	it('refuses what is no distance, naming the field', () => {
		for (const bad of [-1, 150.5, 'viel', Number.NaN]) {
			const logoErrors = validateTemplate({ ...valid(), logoTopMm: bad });
			expect(logoErrors.join(' '), `logo ${String(bad)}`).to.contain('Logo-Abstand oben');
			const textErrors = validateTemplate({ ...valid(), textTopMm: bad });
			expect(textErrors.join(' '), `text ${String(bad)}`).to.contain('Text-Abstand oben');
		}
	});
});
