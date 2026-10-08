/**
 * DATEV Buchungsstapel (EXTF 700): settings from the instance, one line per invoice and VAT rate, credit notes
 * the other way round, one fiscal year per file, Windows-1252.
 */
import { expect } from 'chai';
import { InvoiceDatabase, type StoredInvoice } from './db';
import {
	DATEV_COLUMNS,
	datevDocumentField,
	renderDatevExport,
	resolveDatevConfig,
	toWindows1252,
	type DatevConfig,
	type ResolvedDatevConfig,
} from './datev';
import type { InvoiceDraftInput } from './invoice-model';

const settings: DatevConfig = { consultant: '1234567', client: '12345' };

/**
 * The settings with defaults, failing the test when they are not usable.
 *
 * @param config - DATEV settings.
 */
function resolved(config: DatevConfig = settings): ResolvedDatevConfig {
	const result = resolveDatevConfig(config);
	if ('problems' in result) {
		throw new Error(result.problems.join(', '));
	}
	return result.config;
}

describe('datev => settings', () => {
	it('names what is missing instead of writing half a file', () => {
		const result = resolveDatevConfig({});
		expect('problems' in result && result.problems.join(' '))
			.to.contain('Beraternummer')
			.and.to.contain('Mandantennummer');
		const wrong = resolveDatevConfig({ consultant: '99', client: '0', chart: 'SKR99', debtor: '12' });
		expect('problems' in wrong && wrong.problems).to.have.length(4);
	});

	it('takes the accounts of the chart, padded to the account length', () => {
		const skr03 = resolved();
		expect(skr03.revenue).to.deep.equal({ 19: '8400', 7: '8300', 0: '8100' });
		expect(skr03.debtor).to.equal('10000');
		const skr04 = resolved({ ...settings, chart: 'SKR04', accountLength: 5 });
		expect(skr04.revenue).to.deep.equal({ 19: '44000', 7: '43000', 0: '41000' });
		expect(skr04.debtor).to.equal('100000');
		const own = resolved({ ...settings, revenue19: '8401', debtor: '12000' });
		expect(own.revenue[19]).to.equal('8401');
		expect(own.debtor).to.equal('12000');
	});
});

describe('datev => Buchungsstapel', () => {
	let db: InvoiceDatabase;
	const base: InvoiceDraftInput = {
		seller: { name: 'Muster GmbH', street: 's', zip: '1', city: 'c', country: 'DE', vatId: 'DE123456789' },
		buyer: { name: 'Müller & Söhne', street: 's', zip: '1', city: 'c', country: 'DE', customerNumber: 'K1' },
		lines: [
			{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 },
			{ description: 'Buch', quantity: 1, unit: 'Stk', unitPriceNet: 50, vatRate: 7 },
		],
		issueDate: '2026-03-15',
		deliveryDate: '2026-03-15',
	};
	const issue = (input: Partial<InvoiceDraftInput> = {}): StoredInvoice =>
		db.issueDraft(db.createDraft({ ...base, ...input }).id);

	beforeEach(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
	});
	afterEach(() => db.close());

	it('writes the EXTF header, the column line and one line per VAT rate', () => {
		const invoice = issue();
		const text = renderDatevExport([invoice], resolved(), new Date(2026, 9, 8, 14, 30, 5));
		const [head, columns, ...rows] = text.trimEnd().split('\r\n');
		const fields = head.split(';');
		expect(fields).to.have.length(31);
		expect(fields.slice(0, 6)).to.deep.equal([
			'"EXTF"',
			'700',
			'21',
			'"Buchungsstapel"',
			'13',
			'20261008143005000',
		]);
		// advisor, client, fiscal year start, account length, period
		expect(fields.slice(10, 16)).to.deep.equal(['1234567', '12345', '20260101', '4', '20260315', '20260315']);
		expect(fields[26]).to.equal('"03"');
		expect(columns.split(';')).to.deep.equal(DATEV_COLUMNS);
		expect(rows).to.have.length(2);
		const [r7, r19] = rows.map(row => row.split(';'));
		// 7 % first (the breakdown is sorted by rate): 50 + 3.50
		expect(r7.slice(0, 3)).to.deep.equal(['53,50', '"S"', '"EUR"']);
		expect(r7.slice(6, 11)).to.deep.equal(['10000', '8300', '""', '1503', `"${invoice.number}"`]);
		expect(r19.slice(0, 2)).to.deep.equal(['119,00', '"S"']);
		expect(r19[7]).to.equal('8400');
		expect(r19[13]).to.equal(`"Rechnung ${invoice.number} Müller & Söhne"`);
	});

	it('books a credit note the other way round and exports an invoice with its Storno', () => {
		const invoice = issue({ lines: [base.lines[0]] });
		const { reversal } = db.reverseInvoice(invoice.id);
		const credit = db.issueDraft(reversal.id);
		const cancelled = db.getInvoice(invoice.id) as StoredInvoice;
		const rows = renderDatevExport([cancelled, credit], resolved()).trimEnd().split('\r\n').slice(2);
		expect(rows.map(row => row.split(';').slice(0, 2).join(' '))).to.deep.equal(['119,00 "S"', '119,00 "H"']);
	});

	it('leaves offers and drafts out and refuses an empty export', () => {
		const offer = issue({ docType: 'quote' });
		const draft = db.createDraft(base);
		expect(() => renderDatevExport([offer, draft], resolved())).to.throw(/nothing to export/);
	});

	it('takes one fiscal year per file, with the start month of the settings', () => {
		const march = issue();
		const january = issue({ issueDate: '2027-01-10', deliveryDate: '2027-01-10' });
		expect(() => renderDatevExport([march, january], resolved())).to.throw(/2 fiscal years/);
		// a fiscal year that starts in March (March 2026 to February 2027) holds both
		const text = renderDatevExport([march, january], resolved({ ...settings, fiscalYearStartMonth: 3 }));
		expect(text.split('\r\n')[0].split(';')[12]).to.equal('20260301');
	});

	it('keeps Belegfeld 1 to the characters DATEV takes', () => {
		expect(datevDocumentField('2026-00-001')).to.equal('2026-00-001');
		expect(datevDocumentField('re_2026.001')).to.equal('RE-2026-001');
		expect(datevDocumentField('x'.repeat(40))).to.have.length(36);
	});

	it('encodes as Windows-1252', () => {
		expect([...toWindows1252('Müller € ß ✓')]).to.deep.equal([
			0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x20, 0x80, 0x20, 0xdf, 0x20, 0x3f,
		]);
	});
});
