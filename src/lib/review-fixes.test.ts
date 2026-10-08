/**
 * Findings of the review of 08.10.2026: commercial cent rounding, the local calendar day and what a Storno may
 * reverse.
 */
import { expect } from 'chai';
import { InvoiceDatabase } from './db';
import { calcTotals, roundCents, todayIso, type InvoiceDraftInput } from './invoice-model';

describe('review => cent rounding', () => {
	it('rounds half a cent up even where the binary value lies just below it', () => {
		// 8.075 is stored as 8.07499999…, the old rounding made 8.07 of it
		expect(roundCents(8.075)).to.equal(8.08);
		expect(roundCents(1.005)).to.equal(1.01);
		expect(roundCents(2.675)).to.equal(2.68);
		expect(roundCents(10.005)).to.equal(10.01);
		expect(roundCents(0.1 + 0.2)).to.equal(0.3);
		expect(roundCents(-1.005)).to.equal(-1.01);
		expect(roundCents(0)).to.equal(0);
	});

	it('computes the VAT of 42.50 EUR at 19 % as 8.08 EUR', () => {
		const totals = calcTotals([{ description: 'x', quantity: 1, unit: 'Stk', unitPriceNet: 42.5, vatRate: 19 }]);
		expect(totals.taxTotal).to.equal(8.08);
		expect(totals.grossTotal).to.equal(50.58);
	});

	it('agrees with exact decimal rounding for every tax amount of net prices up to 2,000 EUR', () => {
		for (let cents = 1; cents <= 200_000; cents++) {
			for (const rate of [7, 19]) {
				const exact = cents * rate; // tax in 1/10,000 EUR
				const want = (Math.floor(exact / 100) + (exact % 100 >= 50 ? 1 : 0)) / 100;
				const got = roundCents(((cents / 100) * rate) / 100);
				if (got !== want) {
					expect.fail(`${cents / 100} EUR at ${rate} %: ${got} instead of ${want}`);
				}
			}
		}
	});
});

describe('review => today is the local calendar day', () => {
	it('reads the local date, not the UTC one', () => {
		// half past midnight on New Year's Day, local time: in Germany the UTC day is still the old year
		const newYear = new Date(2027, 0, 1, 0, 30);
		expect(todayIso(newYear)).to.equal('2027-01-01');
		expect(todayIso(new Date(2026, 9, 8, 23, 59))).to.equal('2026-10-08');
	});
});

describe('review => what a Storno may reverse', () => {
	let db: InvoiceDatabase;
	const base: InvoiceDraftInput = {
		seller: { name: 'M', street: 's', zip: '1', city: 'c', country: 'DE', vatId: 'DE123456789' },
		buyer: { name: 'K', street: 's', zip: '1', city: 'c', country: 'DE', customerNumber: 'K1' },
		lines: [{ description: 'x', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-28',
	};

	beforeEach(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
	});
	afterEach(() => db.close());

	it('refuses to reverse a quotation and leaves it as it was', () => {
		const quote = db.issueDraft(db.createDraft({ ...base, docType: 'quote' }).id);
		expect(() => db.reverseInvoice(quote.id)).to.throw(/quotation cannot be reversed/);
		expect(db.getInvoice(quote.id)?.status).to.equal('issued');
		expect(db.listInvoices({ status: 'draft' })).to.have.length(0);
	});

	it('reverses a credit note with an invoice, and an invoice with a credit note', () => {
		const credit = db.issueDraft(db.createDraft({ ...base, documentTitle: 'Gutschrift' }).id);
		const back = db.reverseInvoice(credit.id).reversal;
		expect(back.documentTitle).to.equal('Rechnung');
		expect(back.notes).to.contain(`Storno zu Gutschrift ${credit.number}`);
		const invoice = db.issueDraft(db.createDraft({ ...base, documentTitle: 'Rechnung' }).id);
		const reversal = db.reverseInvoice(invoice.id).reversal;
		expect(reversal.documentTitle).to.equal('Gutschrift');
		expect(reversal.notes).to.contain(`Storno zu Rechnung ${invoice.number}`);
	});
});
