/**
 * R6.1 tests: XRechnung (B2G) — the profile is carried by the document, the XML carries the XRechnung
 * guideline and the Leitweg-ID, the Pflichtangaben are checked at issue, and nothing is embedded in a PDF.
 */
import { expect } from 'chai';
import { InvoiceDatabase } from './db';
import {
	LEITWEG_ID_PATTERN,
	blankDraft,
	isXRechnung,
	normalizeInvoiceProfile,
	storedInvoiceProfile,
	validateInvoiceForIssue,
	type InvoiceDraftInput,
	type Party,
} from './invoice-model';
import { embedHybridPdf, generateInvoiceXml } from './zugferd';
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
	phone: '030 123456',
	contactName: 'Erika Mustermann',
};

const buyer: Party = {
	name: 'Stadt Beispielhausen',
	street: 'Rathausplatz 1',
	zip: '80331',
	city: 'München',
	country: 'DE',
	email: 'rechnungseingang@beispielhausen.example',
	customerNumber: 'K-42',
	leitwegId: '991-01234-44',
};

/**
 * A complete XRechnung draft, with overrides.
 *
 * @param overrides - Fields to replace.
 */
function draft(overrides: Partial<InvoiceDraftInput> = {}): InvoiceDraftInput {
	return {
		...blankDraft('2026-10-01'),
		seller,
		buyer,
		lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		deliveryDate: '2026-09-30',
		dueDate: '2026-10-31',
		profile: 'XRECHNUNG',
		...overrides,
	};
}

describe('xrechnung => profile helpers', () => {
	it('knows the two profiles and refuses everything else', () => {
		expect(normalizeInvoiceProfile(undefined)).to.equal('EN16931');
		expect(normalizeInvoiceProfile('')).to.equal('EN16931');
		expect(normalizeInvoiceProfile('xrechnung')).to.equal('XRECHNUNG');
		expect(() => normalizeInvoiceProfile('BASIC-WL')).to.throw(/Unknown profile/);
		expect(() => normalizeInvoiceProfile('xrechnug')).to.throw(/Unknown profile/);
		expect(isXRechnung('XRECHNUNG')).to.equal(true);
		expect(isXRechnung('EN16931')).to.equal(false);
		expect(storedInvoiceProfile('BASIC')).to.equal('EN16931');
		expect(storedInvoiceProfile('XRECHNUNG')).to.equal('XRECHNUNG');
	});

	it('checks only the syntax of a Leitweg-ID', () => {
		for (const good of ['04011000-12345-67', '991-01234-44', 'abc', '0', 'a'.repeat(46)]) {
			expect(LEITWEG_ID_PATTERN.test(good), good).to.equal(true);
		}
		for (const bad of ['', '-abc', 'ab c', 'ab_c', 'a'.repeat(47), 'äöü']) {
			expect(LEITWEG_ID_PATTERN.test(bad), bad).to.equal(false);
		}
	});
});

describe('xrechnung => Pflichtangaben at issue', () => {
	it('accepts a complete XRechnung and does not ask for a customer number', () => {
		expect(validateInvoiceForIssue(draft())).to.deep.equal([]);
		expect(validateInvoiceForIssue(draft({ buyer: { ...buyer, customerNumber: undefined } }))).to.deep.equal([]);
	});

	it('names the missing Leitweg-ID with the rule', () => {
		const errors = validateInvoiceForIssue(draft({ buyer: { ...buyer, leitwegId: undefined } }));
		expect(errors).to.have.length(1);
		expect(errors[0]).to.contain('Leitweg-ID').and.to.contain('BR-DE-15');
	});

	it('refuses a Leitweg-ID with the wrong syntax', () => {
		const errors = validateInvoiceForIssue(draft({ buyer: { ...buyer, leitwegId: 'ab c' } }));
		expect(errors.join(' ')).to.contain('letters, digits and hyphens');
	});

	it('wants buyer e-mail, seller contact, phone, e-mail and IBAN', () => {
		const errors = validateInvoiceForIssue(
			draft({
				buyer: { ...buyer, email: '' },
				seller: { ...seller, contactName: '', phone: '', email: '', iban: '' },
			}),
		);
		const text = errors.join('\n');
		for (const rule of ['BT-49', 'BT-41', 'BT-42', 'BT-43', 'BT-84']) {
			expect(text, rule).to.contain(rule);
		}
	});

	it('leaves the ZUGFeRD invoice and the quotation alone', () => {
		const zugferd = draft({ profile: 'EN16931', buyer: { ...buyer, leitwegId: undefined } });
		expect(validateInvoiceForIssue(zugferd)).to.deep.equal([]);
		const quote = { ...draft({ buyer: { ...buyer, leitwegId: undefined } }), docType: 'quote' as const };
		expect(validateInvoiceForIssue(quote)).to.deep.equal([]);
	});
});

describe('xrechnung => document and XML', function () {
	this.timeout(60000);
	let db: InvoiceDatabase;

	beforeEach(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
	});
	afterEach(() => db.close());

	it('stores the profile, defaults to ZUGFeRD and refuses an unknown one', () => {
		expect(db.createDraft(draft()).profile).to.equal('XRECHNUNG');
		expect(db.createDraft(draft({ profile: undefined })).profile).to.equal('EN16931');
		expect(() => db.createDraft(draft({ profile: 'NOPE' as 'XRECHNUNG' }))).to.throw(/Unknown profile/);
	});

	it('switches the profile of a draft, an issued document stays as it is', () => {
		const created = db.createDraft(draft({ profile: 'EN16931' }));
		expect(db.updateDraft(created.id, { profile: 'XRECHNUNG' }).profile).to.equal('XRECHNUNG');
		expect(db.updateDraft(created.id, { notes: 'x' }).profile).to.equal('XRECHNUNG');
		const issued = db.issueDraft(created.id);
		expect(issued.profile).to.equal('XRECHNUNG');
		expect(() => db.updateDraft(issued.id, { profile: 'EN16931' })).to.throw(/Only drafts/);
	});

	it('does not issue an XRechnung without Leitweg-ID and keeps the number free', () => {
		const created = db.createDraft(draft({ buyer: { ...buyer, leitwegId: undefined } }));
		expect(() => db.issueDraft(created.id)).to.throw(/Leitweg-ID/);
		expect(db.getInvoice(created.id)?.status).to.equal('draft');
	});

	it('writes the XRechnung guideline, the Peppol process and the Leitweg-ID as BT-10', async () => {
		const invoice = db.issueDraft(db.createDraft(draft()).id);
		const { xml } = await generateInvoiceXml(invoice);
		expect(xml).to.contain('urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0');
		expect(xml).to.contain('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0');
		expect(xml).to.contain('<ram:BuyerReference>991-01234-44</ram:BuyerReference>');
		expect(xml).to.not.contain('K-42');
		// BT-41/42/43 and the electronic addresses
		expect(xml).to.contain('Erika Mustermann');
		expect(xml).to.contain('030 123456');
		expect(xml).to.contain('rechnungseingang@beispielhausen.example');
		const check = await validateArtifacts(invoice, xml);
		expect(check.formatErrors).to.deep.equal([]);
		expect(check.businessErrors).to.deep.equal([]);
	});

	it('keeps the customer number as BT-10 and no Peppol process in a ZUGFeRD invoice', async () => {
		const invoice = db.issueDraft(db.createDraft(draft({ profile: 'EN16931' })).id);
		const { xml } = await generateInvoiceXml(invoice);
		expect(xml).to.contain('<ram:BuyerReference>K-42</ram:BuyerReference>');
		expect(xml).to.not.contain('xrechnung');
		expect(xml).to.not.contain('peppol');
	});

	it('refuses to put an XRechnung into a PDF', async () => {
		let failure = '';
		try {
			await embedHybridPdf(Buffer.from('%PDF-1.4'), '<x/>', 'XRECHNUNG', 'Rechnung');
		} catch (error) {
			failure = (error as Error).message;
		}
		expect(failure).to.contain('standalone XML');
	});

	it('hands the profile on to the credit note of a Storno', () => {
		const original = db.issueDraft(db.createDraft(draft()).id);
		const { reversal } = db.reverseInvoice(original.id, 'Fehler');
		expect(reversal.profile).to.equal('XRECHNUNG');
	});

	it('gives a quotation the ZUGFeRD default whatever is asked', () => {
		const quote = db.createDraft(draft({ docType: 'quote' }));
		expect(quote.profile).to.equal('EN16931');
	});
});
