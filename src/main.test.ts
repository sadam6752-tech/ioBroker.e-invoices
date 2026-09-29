/**
 * Tests for the dunning check that feeds the info.overdue* states.
 *
 * The adapter only counts overdue invoices, it never sends a mail itself, so
 * these tests pin the classification rather than any sending behaviour.
 */
import { expect } from 'chai';
import { InvoiceDatabase } from './lib/db';
import { collectReminderCandidates } from './lib/issue-service';
import type { InvoiceDraftInput } from './lib/invoice-model';

const draft = (over: Partial<InvoiceDraftInput> = {}): InvoiceDraftInput => ({
	seller: {
		name: 'Muster GmbH',
		street: 'Beispielstr. 1',
		zip: '10115',
		city: 'Berlin',
		country: 'DE',
		vatId: 'DE123456789',
		iban: 'DE02120300000000202051',
	},
	buyer: {
		name: 'Kunde AG',
		street: 'Kundenweg 5',
		zip: '80331',
		city: 'München',
		country: 'DE',
		customerNumber: 'K-42',
	},
	lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
	issueDate: '2026-09-28',
	deliveryDate: '2026-09-27',
	dueDate: '2026-09-01',
	currency: 'EUR',
	documentTitle: 'Rechnung',
	...over,
});

function openDb(): InvoiceDatabase {
	const db = new InvoiceDatabase(':memory:');
	db.migrate();
	return db;
}

describe('dunning => overdue states', () => {
	it('publishes nothing when no invoice is overdue', () => {
		const db = openDb();
		try {
			db.issueDraft(db.createDraft(draft({ dueDate: '2026-10-30' })).id);
			const candidates = collectReminderCandidates(db, '2026-09-20');
			expect(candidates).to.have.lengthOf(0);
		} finally {
			db.close();
		}
	});

	it('reports number, customer, days and level for the state payload', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft({ dueDate: '2026-09-01' })).id);
			const candidates = collectReminderCandidates(db, '2026-09-20');
			expect(candidates).to.have.lengthOf(1);
			expect(candidates[0].invoice.id).to.equal(issued.id);
			expect(candidates[0].overdueDays).to.equal(19);
			expect(candidates[0].level).to.equal(0);
			expect(candidates[0].skontoActive).to.equal(false);
		} finally {
			db.close();
		}
	});

	it('stays silent after the user acknowledged the reminder', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft({ dueDate: '2026-09-01' })).id);
			expect(collectReminderCandidates(db, '2026-09-20')).to.have.lengthOf(1);
			// the user sent a reminder, the count drops until the next day
			db.registerReminder(issued.id, '2026-09-20');
			expect(collectReminderCandidates(db, '2026-09-20')).to.have.lengthOf(0);
			expect(collectReminderCandidates(db, '2026-09-21')).to.have.lengthOf(1);
		} finally {
			db.close();
		}
	});

	it('skips a Storno, because the original no longer exists as a claim', () => {
		const db = openDb();
		try {
			const original = db.issueDraft(db.createDraft(draft({ dueDate: '2026-09-01' })).id);
			expect(collectReminderCandidates(db, '2026-09-20')).to.have.lengthOf(1);
			const { reversal } = db.reverseInvoice(original.id, 'Falsch ausgestellt');
			expect(reversal.stornoOfId).to.equal(original.id);
			expect(collectReminderCandidates(db, '2026-09-20')).to.have.lengthOf(0);
		} finally {
			db.close();
		}
	});

	it('flags an available cash discount so the reminder can mention it', () => {
		const db = openDb();
		try {
			db.issueDraft(
				db.createDraft(draft({ dueDate: '2026-09-01', skontoPercent: 2, skontoDueDate: '2026-09-25' })).id,
			);
			expect(collectReminderCandidates(db, '2026-09-20')[0].skontoActive).to.equal(true);
		} finally {
			db.close();
		}
	});
});
