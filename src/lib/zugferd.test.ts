/**
 * P3 tests: ZUGFeRD XML generation, XSD validation and hybrid embedding.
 * Three fixtures (standard, mixed-rates BASIC, exempt small) must validate
 * cleanly; the hybrid PDF must round-trip its XML.
 */
import { extractXml } from '@stackforge-eu/factur-x';
import { expect } from 'chai';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
 * Issues a draft in an isolated temp database.
 *
 * @param input - Draft content to issue.
 */
function issueInTempDb(input: InvoiceDraftInput): { dir: string; db: InvoiceDatabase; invoice: StoredInvoice } {
	const dir = mkdtempSync(join(tmpdir(), 'einv-p3-'));
	const db = new InvoiceDatabase(join(dir, 'invoices.db'));
	db.migrate();
	const created = db.createDraft(input);
	const invoice = db.issueDraft(created.id, 2026);
	return { dir, db, invoice };
}

/**
 * Removes a temp dir, retrying on Windows file locks (better-sqlite3
 * WAL handles may linger briefly after close).
 *
 * @param dir - Directory to remove.
 */
function removeTempDir(dir: string): void {
	for (let attempt = 1; attempt <= 5; attempt++) {
		try {
			rmSync(dir, { recursive: true, force: true });
			return;
		} catch (error) {
			if (attempt === 5) {
				throw error;
			}
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
		}
	}
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
	let ctx: { dir: string; db: InvoiceDatabase; invoice: StoredInvoice } | null = null;

	afterEach(() => {
		ctx?.db.close();
		if (ctx) {
			removeTempDir(ctx.dir);
			ctx = null;
		}
	});

	it('generates XSD-valid XML with all Pflicht markers', async () => {
		ctx = issueInTempDb(draft());
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
		ctx = issueInTempDb(draft());
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
		const dir = mkdtempSync(join(tmpdir(), 'einv-p3-'));
		try {
			const db = new InvoiceDatabase(join(dir, 'invoices.db'));
			db.migrate();
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
			const issued = db.issueDraft(created.id, 2026);
			const basic = { ...issued, profile: 'BASIC' };
			const { xml } = await generateInvoiceXml(basic);
			expect(xml).to.contain('145.00');
			expect(xml).to.contain('3.15');
			const check = await validateArtifacts(basic, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
			db.close();
		} finally {
			removeTempDir(dir);
		}
	});
});

describe('zugferd => exempt small invoice', function () {
	this.timeout(60000);

	it('validates a 0% exempt invoice with reason', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'einv-p3-'));
		try {
			const db = new InvoiceDatabase(join(dir, 'invoices.db'));
			db.migrate();
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
			const issued = db.issueDraft(created.id, 2026);
			const { xml } = await generateInvoiceXml(issued);
			expect(xml).to.contain('Steuerfrei nach');
			const check = await validateArtifacts(issued, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
			db.close();
		} finally {
			removeTempDir(dir);
		}
	});
});

describe('validation => tampered xml', function () {
	this.timeout(60000);

	it('flags business errors when markers are missing', async () => {
		const { dir, db, invoice } = issueInTempDb(draft());
		try {
			const { xml } = await generateInvoiceXml(invoice);
			const tampered = xml.split(invoice.number ?? 'NUMBER-MISSING').join('2000-9999');
			const check = await validateArtifacts(invoice, tampered);
			expect(check.businessErrors.length).to.be.greaterThan(0);
			db.close();
		} finally {
			removeTempDir(dir);
		}
	});
});
