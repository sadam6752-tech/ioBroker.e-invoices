/**
 * P3 tests: ZUGFeRD XML generation, XSD validation and hybrid embedding.
 * Three fixtures (standard, mixed-rates BASIC, exempt small) must validate
 * cleanly; the hybrid PDF must round-trip its XML.
 */
import { extractXml } from '@stackforge-eu/factur-x';
import { PDFDocument } from 'pdf-lib';
import { expect } from 'chai';
import { inflateSync } from 'node:zlib';
import { InvoiceDatabase, type StoredInvoice } from './db';
import type { InvoiceDraftInput, Party } from './invoice-model';
import { embedHybridPdf, generateInvoiceXml, mapUnitCode, mapVatCategory, resolveProfile } from './zugferd';
import { renderInvoicePdf } from './pdf';
import { validateArtifacts } from './validation';

const seller: Party = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
	bic: 'BELADEBEXXX',
	email: 'rechnung@muster.example',
};

const buyer: Party = {
	name: 'Kunde AG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	email: 'einkauf@kunde.example',
	customerNumber: 'K-42',
};

/**
 * Builds a valid draft with overrides.
 *
 * @param overrides - Partial draft fields to replace.
 */
function draft(overrides: Partial<InvoiceDraftInput> = {}): InvoiceDraftInput {
	return {
		seller,
		buyer,
		lines: [
			{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 },
			{ description: 'Anfahrt', quantity: 1, unit: 'Stk', unitPriceNet: 50, vatRate: 19 },
		],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		dueDate: '2026-10-12',
		currency: 'EUR',
		documentTitle: 'Rechnung',
		...overrides,
	};
}

/**
 * Extracts searchable text from a pdfkit PDF: page streams are flate
 * compressed and text runs are hex encoded (<414243>) with kerning gaps
 * that may split words. Returns raw, inflated and joined-fragment text.
 *
 * @param pdf - Rendered PDF bytes.
 */
function pdfText(pdf: Buffer): string {
	const raw = pdf.toString('latin1');
	const parts = [raw];
	const fragments: string[] = [];
	for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
		try {
			const text = inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
			parts.push(
				text.replace(/<([0-9a-fA-F]+)>/g, (_found, hex: string) => {
					const decoded = Buffer.from(hex, 'hex').toString('latin1');
					fragments.push(decoded);
					return decoded;
				}),
			);
		} catch {
			// not a flate stream (e.g. embedded files)
		}
	}
	parts.push(fragments.join(''));
	return parts.join('\n');
}

/**
 * Counts PDF pages (regression guard against pdfkit auto-pagination
 * scattering positioned content).
 *
 * @param pdf - Rendered PDF bytes.
 */
async function pageCount(pdf: Buffer): Promise<number> {
	return (await PDFDocument.load(pdf)).getPageCount();
}

/**
 * Issues a draft in an isolated in-memory database (no files, no locks).
 *
 * @param input - Draft content to issue.
 */
function issueInMemoryDb(input: InvoiceDraftInput): { db: InvoiceDatabase; invoice: StoredInvoice } {
	const db = new InvoiceDatabase(':memory:');
	db.migrate();
	const created = db.createDraft(input);
	const invoice = db.issueDraft(created.id);
	return { db, invoice };
}

describe('zugferd => mapping helpers', () => {
	it('maps units and vat categories', () => {
		expect(String(mapUnitCode('Std'))).to.equal('HUR');
		expect(String(mapUnitCode('Stk'))).to.equal('C62');
		expect(String(mapVatCategory(19))).to.equal('S');
		expect(String(mapVatCategory(0))).to.equal('E');
	});

	it('rejects MINIMUM/BASIC-WL and unknown profiles', () => {
		expect(() => resolveProfile('MINIMUM')).to.throw();
		expect(() => resolveProfile('BASIC-WL')).to.throw();
		expect(() => resolveProfile('NOPE')).to.throw();
	});
});

describe('zugferd => standard EN16931 invoice', function () {
	this.timeout(60000);
	let ctx: { db: InvoiceDatabase; invoice: StoredInvoice } | null = null;

	afterEach(() => {
		ctx?.db.close();
		ctx = null;
	});

	it('generates XSD-valid XML with all Pflicht markers', async () => {
		ctx = issueInMemoryDb(draft());
		const { xml } = await generateInvoiceXml(ctx.invoice);
		expect(xml).to.contain('CrossIndustryInvoice');
		expect(xml).to.contain(ctx.invoice.number ?? 'NUMBER-MISSING');
		expect(xml).to.contain('<ram:TypeCode>380</ram:TypeCode>');
		expect(xml).to.contain('Muster GmbH');
		expect(xml).to.contain('Kunde AG');
		expect(xml).to.contain('297.50');
		expect(xml).to.contain('K-42');

		const check = await validateArtifacts(ctx.invoice, xml);
		expect(check.formatErrors).to.deep.equal([]);
		expect(check.businessErrors).to.deep.equal([]);
	});

	it('embeds XML into PDF and round-trips it', async () => {
		ctx = issueInMemoryDb(draft());
		const { xml } = await generateInvoiceXml(ctx.invoice);
		const sight = await renderInvoicePdf(ctx.invoice);
		expect(sight.subarray(0, 4).toString()).to.equal('%PDF');

		const hybrid = await embedHybridPdf(sight, xml, ctx.invoice.profile, `Rechnung ${ctx.invoice.number}`);
		expect(Buffer.from(hybrid.subarray(0, 4)).toString()).to.equal('%PDF');

		const extracted = await extractXml(hybrid);
		expect(extracted.xml).to.contain(ctx.invoice.number ?? 'NUMBER-MISSING');
		expect(extracted.xml).to.contain('CrossIndustryInvoice');
	});
});

describe('zugferd => mixed-rates BASIC invoice', function () {
	this.timeout(60000);

	it('validates a discounted 19/7% invoice under BASIC', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					lines: [
						{ description: 'Hardware', quantity: 1, unit: 'Stk', unitPriceNet: 100, vatRate: 19 },
						{
							description: 'Buch',
							quantity: 2,
							unit: 'Stk',
							unitPriceNet: 25,
							vatRate: 7,
							discountPercent: 10,
						},
					],
				}),
			);
			const issued = db.issueDraft(created.id);
			const basic = { ...issued, profile: 'BASIC' };
			const { xml } = await generateInvoiceXml(basic);
			expect(xml).to.contain('145.00');
			expect(xml).to.contain('3.15');
			const check = await validateArtifacts(basic, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => exempt small invoice', function () {
	this.timeout(60000);

	it('validates a 0% exempt invoice with reason', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					lines: [
						{
							description: 'Vermietung Lagerraum',
							quantity: 1,
							unit: 'Stk',
							unitPriceNet: 20,
							vatRate: 0,
							exemptionReason: 'Steuerfrei nach § 4 Nr. 12 UStG',
						},
					],
					documentTitle: 'Rechnung',
				}),
			);
			const issued = db.issueDraft(created.id);
			const { xml } = await generateInvoiceXml(issued);
			expect(xml).to.contain('Steuerfrei nach');
			const check = await validateArtifacts(issued, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => sku, details and phone', function () {
	this.timeout(60000);

	it('maps Art.Nr, Detailzeile and Telefon into CII', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					seller: {
						...seller,
						phone: '+49 30 12345',
						website: 'https://muster.example',
						bankName: 'Musterbank',
					},
					lines: [
						{
							description: 'Produkt A',
							sku: 'ABC123',
							details: 'Detaillierte Beschreibung',
							quantity: 4,
							unit: 'Stk',
							unitPriceNet: 19.95,
							vatRate: 19,
						},
					],
				}),
			);
			const issued = db.issueDraft(created.id);
			const { xml } = await generateInvoiceXml(issued);
			expect(xml).to.contain('ABC123');
			expect(xml).to.contain('Detaillierte Beschreibung');
			expect(xml).to.contain('+49 30 12345');
			const check = await validateArtifacts(issued, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);

			const pdf = await renderInvoicePdf(issued);
			const text = pdfText(pdf).replace(/\s+/g, '');
			expect(text).to.contain('ABC123');
			expect(text).to.contain('DetaillierteBeschreibung');
			expect(text).to.contain('Zwischensummenetto');
			expect(text).to.contain('Gesamtbetragbrutto');
			expect(text).to.contain('28.09.2026');
			expect(text).to.contain('+493012345');
			expect(text).to.contain('79,80');
			expect(text).to.contain('Musterbank');
			expect(text).to.contain('USt.ID:');
		} finally {
			db.close();
		}
	});
});

describe('pdf => custom footer boxes', () => {
	it('renders company footer texts instead of auto data', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					seller: {
						...seller,
						footerBoxes: ['Box Eins\nZeile zwei', 'Box Zwei', '', 'Box Vier'],
					},
				}),
			);
			const issued = db.issueDraft(created.id);
			const pdf = await renderInvoicePdf(issued);
			const text = pdfText(pdf).replace(/\s+/g, '');
			expect(text).to.contain('BoxEins');
			expect(text).to.contain('BoxVier');
			expect(await pageCount(pdf)).to.equal(1);
		} finally {
			db.close();
		}
	});

	it('ends with the name, without a greeting line', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
					seller: { ...seller, iban: 'DE23105000011475563', bic: 'NOLADE21ROS' },
				}),
			);
			const issued = db.issueDraft(created.id);
			const text = pdfText(await renderInvoicePdf(issued)).replace(/\s+/g, '');
			// requested layout: no "Mit freundlichen Grüßen" line below the name
			expect(text).to.not.contain('Mitfreundlichen');
			expect(text).to.contain('Zahlungsbedingungen');
		} finally {
			db.close();
		}
	});

	it('keeps short invoices on one page and long ones sane', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const boxes: [string, string, string, string] = ['Test 1', 'Test 1', 'Test 1', 'Test 1'];
			const short = db.createDraft(draft({ seller: { ...seller, footerBoxes: [...boxes] } }));
			const shortIssued = db.issueDraft(short.id);
			expect(await pageCount(await renderInvoicePdf(shortIssued))).to.equal(1);

			const lines = [];
			for (let i = 0; i < 30; i++) {
				lines.push({ description: `Pos ${i + 1}`, quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 });
			}
			const long = db.createDraft(draft({ seller: { ...seller, footerBoxes: [...boxes] }, lines }));
			const longIssued = db.issueDraft(long.id);
			expect(await pageCount(await renderInvoicePdf(longIssued))).to.be.lessThan(5);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => fractional amounts', function () {
	this.timeout(60000);

	it('passes BR-CO-17 on cent fractions', async () => {
		const { db, invoice } = issueInMemoryDb(
			draft({
				lines: [
					{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
					{ description: 'B', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
					{ description: 'C', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
				],
			}),
		);
		try {
			const { xml } = await generateInvoiceXml(invoice);
			expect(xml).to.contain('CrossIndustryInvoice');
			const check = await validateArtifacts(invoice, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});
describe('zugferd => fractional line amounts', function () {
	this.timeout(60000);

	it('keeps line nets and the tax basis in sync (BR-CO-10)', async () => {
		const { db, invoice } = issueInMemoryDb(
			draft({
				lines: [
					{ description: 'A', quantity: 3, unit: 'Stk', unitPriceNet: 0.335, vatRate: 19 },
					{ description: 'B', quantity: 2, unit: 'Stk', unitPriceNet: 10.005, vatRate: 7 },
				],
			}),
		);
		try {
			const { xml } = await generateInvoiceXml(invoice);
			const basis = Number(xml.match(/<ram:TaxBasisTotalAmount>([^<]*)</)?.[1]);
			const lineTotals = [...xml.matchAll(/<ram:LineTotalAmount>([^<]*)</g)].map(m => Number(m[1]));
			// the last LineTotalAmount is the header sum, the ones before it are the lines
			const sumLineNets = lineTotals.slice(0, -1).reduce((a, b) => a + b, 0);
			expect(lineTotals).to.have.lengthOf(3);
			expect(Math.round(sumLineNets * 100) / 100).to.equal(basis);
			expect(lineTotals[lineTotals.length - 1]).to.equal(basis);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => delivery period', function () {
	this.timeout(60000);

	it('writes BT-74/BT-75 and stays XSD-valid', async () => {
		const { db, invoice } = issueInMemoryDb(draft({ deliveryDate: '2026-10-01..2026-10-31' }));
		try {
			const { xml } = await generateInvoiceXml(invoice);
			const period = xml.match(/<ram:BillingSpecifiedPeriod>.*?<\/ram:BillingSpecifiedPeriod>/s)?.[0];
			expect(period).to.contain('20261001');
			expect(period).to.contain('20261031');
			// BT-72 keeps the first day
			expect(xml).to.contain('<ram:OccurrenceDateTime><udt:DateTimeString format="102">20261001');
			const check = await validateArtifacts(invoice, xml);
			expect(check.formatErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});

	it('writes BT-74/BT-75 next to a due date and payment terms', async () => {
		const { db, invoice } = issueInMemoryDb(
			draft({
				deliveryDate: '2026-10-01..2026-10-31',
				dueDate: '2026-11-15',
				paymentTerms: 'Zahlbar innerhalb 14 Tagen',
			}),
		);
		try {
			// the XSD sequence is tax breakdown → billing period → allowances →
			// payment terms → summation
			const { xml } = await generateInvoiceXml(invoice);
			const at = xml.indexOf('<ram:SpecifiedTradeSettlementHeaderMonetarySummation>');
			const period = xml.indexOf('BillingSpecifiedPeriod');
			const terms = xml.indexOf('SpecifiedTradePaymentTerms');
			expect(period).to.be.lessThan(terms);
			expect(terms).to.be.lessThan(at);
		} finally {
			db.close();
		}
	});

	it('omits the billing period for a single-day service', async () => {
		const { db, invoice } = issueInMemoryDb(draft({ deliveryDate: '2026-10-01' }));
		try {
			const { xml } = await generateInvoiceXml(invoice);
			expect(xml).to.not.contain('BillingSpecifiedPeriod');
		} finally {
			db.close();
		}
	});
});

describe('zugferd => skonto and payment state', function () {
	this.timeout(60000);

	it('states the cash discount as note AAK and keeps BT-9 at the gross total', async () => {
		const { db, invoice } = issueInMemoryDb(draft({ skontoPercent: 2, dueDate: '2026-10-12' }));
		try {
			const { xml } = await generateInvoiceXml(invoice);
			// BR-CO-16: a conditional discount is not a prepayment, so the
			// amount due stays the gross total and the terms go into a note
			expect(xml).to.contain(
				`<ram:DuePayableAmount>${invoice.totals.grossTotal.toFixed(2)}</ram:DuePayableAmount>`,
			);
			expect(xml).to.contain('AAK');
			expect(xml).to.contain('2 % Skonto');
			const check = await validateArtifacts(invoice, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});

	it('sets BT-9 to zero with a prepayment once the invoice is paid', async () => {
		const { db, invoice } = issueInMemoryDb(draft({ skontoPercent: 2, dueDate: '2026-10-12' }));
		try {
			const paid = db.setPaid(invoice.id, true, '2026-10-01');
			const { xml } = await generateInvoiceXml(paid);
			expect(xml).to.contain('<ram:DuePayableAmount>0.00</ram:DuePayableAmount>');
			expect(xml).to.contain(
				`<ram:TotalPrepaidAmount>${invoice.totals.grossTotal.toFixed(2)}</ram:TotalPrepaidAmount>`,
			);
			// a settled invoice no longer advertises the discount
			expect(xml).to.not.contain('2 % Skonto');
		} finally {
			db.close();
		}
	});

	it('emits a credit note with type 381 for a Storno', async () => {
		const { db, invoice } = issueInMemoryDb(draft());
		try {
			const { reversal } = db.reverseInvoice(invoice.id, 'Falsch ausgestellt');
			const issued = db.issueDraft(reversal.id);
			const { xml } = await generateInvoiceXml(issued);
			expect(xml).to.contain('<ram:TypeCode>381</ram:TypeCode>');
			expect(xml).to.contain('Storno zu Rechnung');
			const check = await validateArtifacts(issued, xml);
			expect(check.formatErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});

describe('validation => tampered xml', function () {
	this.timeout(60000);

	it('flags business errors when markers are missing', async () => {
		const { db, invoice } = issueInMemoryDb(draft());
		try {
			const { xml } = await generateInvoiceXml(invoice);
			const tampered = xml.split(invoice.number ?? 'NUMBER-MISSING').join('2000-9999');
			const check = await validateArtifacts(invoice, tampered);
			expect(check.businessErrors.length).to.be.greaterThan(0);
		} finally {
			db.close();
		}
	});
});
