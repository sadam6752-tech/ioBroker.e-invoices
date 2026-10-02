/**
 * R6.2 tests: the open-items evaluation (aging buckets, what counts, sums).
 */
import { expect } from 'chai';
import { InvoiceDatabase, type StoredInvoice } from './db';
import type { InvoiceDraftInput } from './invoice-model';
import { collectReminderCandidates } from './issue-service';
import { AGE_BUCKETS, bucketOf, evaluateOpenItems, isOpenItem } from './open-items';

const seller = {
	name: 'Muster GmbH',
	street: 'B 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
};

/**
 * A draft for one customer with one line.
 *
 * @param customer - Customer name (the customer number follows from it).
 * @param net - Net price of the single line (19 % VAT).
 * @param dueDate - ISO due date, undefined for an invoice without one.
 * @param extra - Further draft fields.
 */
function draft(
	customer: string,
	net: number,
	dueDate: string | undefined,
	extra: Partial<InvoiceDraftInput> = {},
): InvoiceDraftInput {
	return {
		seller,
		buyer: {
			name: customer,
			street: 'K 5',
			zip: '80331',
			city: 'München',
			country: 'DE',
			customerNumber: `K-${customer.length}`,
		},
		lines: [{ description: 'Leistung', quantity: 1, unit: 'Stk', unitPriceNet: net, vatRate: 19 }],
		issueDate: '2026-06-01',
		deliveryDate: '2026-06-01',
		dueDate,
		currency: 'EUR',
		...extra,
	};
}

/**
 * Creates and issues a draft.
 *
 * @param db - Open database.
 * @param input - Draft content.
 */
function issue(db: InvoiceDatabase, input: InvoiceDraftInput): StoredInvoice {
	return db.issueDraft(db.createDraft(input).id);
}

const TODAY = '2026-10-01';

describe('open items => buckets (R6.2)', () => {
	it('puts the days past the due date into the five buckets, edges included', () => {
		const expected: [number, string][] = [
			[-5, 'notDue'],
			[0, 'notDue'],
			[1, 'd1to30'],
			[30, 'd1to30'],
			[31, 'd31to60'],
			[60, 'd31to60'],
			[61, 'd61to90'],
			[90, 'd61to90'],
			[91, 'over90'],
			[4000, 'over90'],
		];
		for (const [days, bucket] of expected) {
			expect(bucketOf(days), `${days} days`).to.equal(bucket);
		}
		expect(AGE_BUCKETS).to.have.lengthOf(5);
	});
});

describe('open items => what counts (R6.2)', function () {
	this.timeout(30000);

	it('lists unpaid issued invoices and nothing else', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const open = issue(db, draft('Offen GmbH', 100, '2026-09-20'));
			const paid = issue(db, draft('Bezahlt GmbH', 100, '2026-09-20'));
			db.setPaid(paid.id, true);
			db.createDraft(draft('Entwurf GmbH', 100, '2026-09-20'));
			const quote = issue(
				db,
				draft('Angebot GmbH', 100, undefined, { docType: 'quote', documentTitle: 'Angebot' }),
			);
			// Storno: the original is cancelled, the credit note is issued but no claim
			const original = issue(db, draft('Storno GmbH', 100, '2026-09-20'));
			const { reversal } = db.reverseInvoice(original.id, 'Fehler');
			const creditNote = db.issueDraft(reversal.id);
			const freeCredit = issue(db, draft('Gutschrift GmbH', 100, '2026-09-20', { documentTitle: 'Gutschrift' }));

			const report = evaluateOpenItems(db.allInvoices(), { asOf: TODAY });
			expect(report.items.map(item => item.id)).to.deep.equal([open.id]);
			for (const excluded of [paid, quote, creditNote, freeCredit]) {
				expect(isOpenItem(db.getInvoice(excluded.id)!), excluded.documentTitle).to.equal(false);
			}
			expect(isOpenItem(db.getInvoice(original.id)!), 'cancelled original').to.equal(false);
			expect(report.total).to.deep.equal({ count: 1, amount: 119 });
		} finally {
			db.close();
		}
	});

	it('treats an invoice without due date as not yet due', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			issue(db, draft('Ohne Frist AG', 100, undefined));
			issue(db, draft('Frist AG', 200, '2026-09-30'));
			const all = evaluateOpenItems(db.allInvoices(), { asOf: TODAY });
			expect(all.total.count).to.equal(2);
			expect(all.buckets.notDue.count).to.equal(1);
			expect(all.items.find(item => item.customer === 'Ohne Frist AG')).to.include({
				overdueDays: 0,
				dueDate: '',
				bucket: 'notDue',
			});
			// the overdue filter keeps only what is past its date
			const overdue = evaluateOpenItems(db.allInvoices(), { asOf: TODAY, onlyOverdue: true });
			expect(overdue.items.map(item => item.customer)).to.deep.equal(['Frist AG']);
			expect(overdue.onlyOverdue).to.equal(true);
		} finally {
			db.close();
		}
	});

	it('moves an invoice from bucket to bucket as the reference day moves on', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const invoice = issue(db, draft('Zeit AG', 100, '2026-09-01'));
			const bucketAt = (asOf: string): string => evaluateOpenItems(db.allInvoices(), { asOf }).items[0].bucket;
			expect(bucketAt('2026-09-01')).to.equal('notDue');
			expect(bucketAt('2026-09-02')).to.equal('d1to30');
			expect(bucketAt('2026-10-01')).to.equal('d1to30'); // 30 days
			expect(bucketAt('2026-10-02')).to.equal('d31to60'); // 31 days
			expect(bucketAt('2026-11-30')).to.equal('d61to90'); // 90 days
			expect(bucketAt('2026-12-01')).to.equal('over90'); // 91 days
			expect(invoice.id).to.be.a('string');
		} finally {
			db.close();
		}
	});
});

describe('open items => sums (R6.2)', function () {
	this.timeout(30000);

	it('adds up per bucket, per customer and in total without cent drift', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			// gross 0.12 (net 0.10) three times: 0.36, a float sum of 0.12 would be 0.36000000000000004
			for (let i = 0; i < 3; i += 1) {
				issue(db, draft('Cent AG', 0.1, '2026-09-25'));
			}
			issue(db, draft('Cent AG', 1000, '2026-06-01')); // over 90 days
			issue(db, draft('Gross GmbH', 5000, '2026-09-10')); // 21 days
			issue(db, draft('Fein KG', 10, '2026-10-20')); // not due

			const report = evaluateOpenItems(db.allInvoices(), { asOf: TODAY });
			expect(report.total.count).to.equal(6);
			const bucketSum = AGE_BUCKETS.reduce((sum, bucket) => sum + report.buckets[bucket].amount, 0);
			const bucketCount = AGE_BUCKETS.reduce((sum, bucket) => sum + report.buckets[bucket].count, 0);
			expect(Math.round(bucketSum * 100) / 100, 'buckets add up to the total').to.equal(report.total.amount);
			expect(bucketCount).to.equal(report.total.count);
			expect(report.buckets.over90).to.deep.equal({ count: 1, amount: 1190 });
			expect(report.buckets.d1to30).to.deep.equal({ count: 4, amount: 5950.36 });
			expect(report.buckets.notDue).to.deep.equal({ count: 1, amount: 11.9 });
			expect(report.overdue).to.deep.equal({ count: 5, amount: 7140.36 });
			expect(report.total.amount).to.equal(7152.26);

			// per customer, the biggest debt first, and the customers add up as well
			expect(report.customers.map(c => c.customer)).to.deep.equal(['Gross GmbH', 'Cent AG', 'Fein KG']);
			expect(report.customers[1]).to.include({ count: 4, amount: 1190.36 });
			expect(Math.round(report.customers.reduce((sum, c) => sum + c.amount, 0) * 100) / 100).to.equal(
				report.total.amount,
			);

			// the oldest claim leads the list
			expect(report.items[0].overdueDays).to.be.greaterThan(report.items[1].overdueDays);
			expect(report.items[report.items.length - 1].bucket).to.equal('notDue');
		} finally {
			db.close();
		}
	});

	it('shows every bucket even when it is empty', () => {
		const report = evaluateOpenItems([], { asOf: TODAY });
		expect(Object.keys(report.buckets)).to.deep.equal([...AGE_BUCKETS]);
		expect(report.total).to.deep.equal({ count: 0, amount: 0 });
		expect(report.items).to.deep.equal([]);
		expect(report.customers).to.deep.equal([]);
	});

	it('agrees with the dunning list: every reminder candidate is an overdue open item of the same age', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			issue(db, draft('Mahn AG', 100, '2026-09-10')); // 21 days
			issue(db, draft('Frisch AG', 100, '2026-09-29')); // 2 days: no reminder yet (grace period)
			const paid = issue(db, draft('Zahlt AG', 100, '2026-09-10'));
			db.setPaid(paid.id, true);

			const candidates = collectReminderCandidates(db, TODAY);
			const overdue = evaluateOpenItems(db.allInvoices(), { asOf: TODAY, onlyOverdue: true });
			expect(candidates).to.have.lengthOf(1);
			for (const candidate of candidates) {
				const item = overdue.items.find(entry => entry.id === candidate.invoice.id);
				expect(item, candidate.invoice.number ?? '').to.not.equal(undefined);
				expect(item?.overdueDays).to.equal(candidate.overdueDays);
			}
			// the open-items list is the wider one: it also shows the claim still inside the grace period
			expect(overdue.items).to.have.lengthOf(2);
		} finally {
			db.close();
		}
	});
});
