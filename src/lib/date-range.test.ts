/**
 * 0.9.3: the date range of the invoice list and its exports. Both days belong to the range, a
 * missing side is open, an export is never cut at the page limit and never contains a draft.
 */
import { expect } from 'chai';
import { InvoiceDatabase } from './db';
import { dateRangeFileSuffix, formatDateRange, parseDateRange, type InvoiceDraftInput } from './invoice-model';

const seller = { name: 'S', street: 'a', zip: '1', city: 'B', country: 'DE', vatId: 'DE1' };
const buyer = { name: 'K', street: 'a', zip: '1', city: 'B', country: 'DE', customerNumber: 'K-7' };

/**
 * A draft issued on `issueDate`.
 *
 * @param issueDate - ISO issue date.
 */
function draft(issueDate: string): InvoiceDraftInput {
	return {
		seller,
		buyer,
		lines: [{ description: 'X', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
		issueDate,
		deliveryDate: issueDate,
		currency: 'EUR',
	};
}

describe('date range (0.9.3)', () => {
	it('reads from and to, treats a missing side as open and refuses nonsense', () => {
		expect(parseDateRange('2026-08-01', '2026-08-31')).to.deep.equal({ from: '2026-08-01', to: '2026-08-31' });
		expect(parseDateRange('2026-08-01', undefined)).to.deep.equal({ from: '2026-08-01' });
		expect(parseDateRange('', '2026-08-31')).to.deep.equal({ to: '2026-08-31' });
		expect(parseDateRange(undefined, undefined)).to.deep.equal({});
		// one day is a range, too
		expect(parseDateRange('2026-08-01', '2026-08-01')).to.deep.equal({ from: '2026-08-01', to: '2026-08-01' });
		expect(parseDateRange('01.08.2026', undefined)).to.be.a('string');
		expect(parseDateRange('2026-02-30', undefined)).to.be.a('string');
		expect(parseDateRange(undefined, 'gestern')).to.be.a('string');
		expect(parseDateRange(['2026-08-01'], undefined)).to.be.a('string');
		expect(parseDateRange('2026-09-01', '2026-08-31')).to.match(/not be after/);
	});

	it('names the range for the title and the file name', () => {
		const both = { from: '2026-08-01', to: '2026-08-31' };
		expect(formatDateRange(both)).to.equal('01.08.2026–31.08.2026');
		expect(formatDateRange({ from: '2026-08-01' })).to.equal('ab 01.08.2026');
		expect(formatDateRange({ to: '2026-08-31' })).to.equal('bis 31.08.2026');
		expect(formatDateRange({})).to.equal('');
		expect(dateRangeFileSuffix(both)).to.equal('_2026-08-01_2026-08-31');
		expect(dateRangeFileSuffix({ from: '2026-08-01' })).to.equal('_ab-2026-08-01');
		expect(dateRangeFileSuffix({ to: '2026-08-31' })).to.equal('_bis-2026-08-31');
		expect(dateRangeFileSuffix({})).to.equal('');
	});

	it('includes both boundary days and nothing outside', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const days = ['2026-07-31', '2026-08-01', '2026-08-15', '2026-08-31', '2026-09-01'];
			for (const day of days) {
				db.issueDraft(db.createDraft(draft(day)).id);
			}
			const inAugust = db.listInvoices({ from: '2026-08-01', to: '2026-08-31', sort: 'date', order: 'asc' });
			expect(inAugust.map(i => i.issueDate)).to.deep.equal(['2026-08-01', '2026-08-15', '2026-08-31']);
			expect(db.listInvoices({ from: '2026-08-31' }).map(i => i.issueDate)).to.have.members([
				'2026-08-31',
				'2026-09-01',
			]);
			expect(db.listInvoices({ to: '2026-08-01' }).map(i => i.issueDate)).to.have.members([
				'2026-07-31',
				'2026-08-01',
			]);
			expect(db.listInvoices({ from: '2026-08-15', to: '2026-08-15' })).to.have.length(1);
			expect(db.listInvoices({ from: '2027-01-01' })).to.have.length(0);
		} finally {
			db.close();
		}
	});

	it('does not cut an export at the page limit and can leave drafts out', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			for (let n = 0; n < 520; n++) {
				db.issueDraft(db.createDraft(draft('2026-08-10')).id);
			}
			db.createDraft(draft('2026-08-11'));
			expect(db.listInvoices({ limit: 9999 })).to.have.length(500);
			const everything = db.listInvoices({ all: true, excludeStatus: 'draft' });
			expect(everything).to.have.length(520);
			expect(everything.every(invoice => invoice.status !== 'draft')).to.equal(true);
			expect(db.listInvoices({ all: true })).to.have.length(521);
		} finally {
			db.close();
		}
	});
});
