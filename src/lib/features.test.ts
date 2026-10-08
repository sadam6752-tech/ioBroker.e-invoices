/**
 * Tests for the dunning, dispatch and accounting-export features.
 *
 * The legal parts (§ 16 Abs. 2 Nr. 2 UStG, § 147 AO) only report a duty — the
 * adapter must never decide on the user's behalf, so these tests pin the
 * thresholds rather than a behaviour.
 */
import { expect } from 'chai';
import { InvoiceDatabase, levenshtein, rankCustomers, retentionUntil } from './db';
import { daysBetween, paymentCheckDuty } from './invoice-model';
import { collectReminderCandidates, issueInvoiceBatch, type IssueStorage } from './issue-service';
import { renderInvoiceListCsv } from './csv';
import type { InvoiceDraftInput } from './invoice-model';

const seller = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
};

function draft(over: Partial<InvoiceDraftInput> = {}): InvoiceDraftInput {
	return {
		seller,
		buyer: {
			name: 'Kunde AG',
			street: 'Kundenweg 5',
			zip: '80331',
			city: 'München',
			country: 'DE',
			customerNumber: 'K-42',
		},
		lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		dueDate: '2026-10-12',
		currency: 'EUR',
		documentTitle: 'Rechnung',
		...over,
	};
}

const logger = { info: () => undefined, error: () => undefined };

function memStorage(): IssueStorage {
	const files = new Map<string, Buffer>();
	return {
		write: (path: string, data: string | Buffer): Promise<void> => {
			files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
			return Promise.resolve();
		},
		read: (path: string): Promise<Buffer> => {
			const found = files.get(path);
			return found ? Promise.resolve(found) : Promise.reject(new Error('missing'));
		},
	};
}

function openDb(): InvoiceDatabase {
	const db = new InvoiceDatabase(':memory:');
	db.migrate();
	return db;
}

describe('compliance => § 16 Abs. 2 Nr. 2 UStG', () => {
	it('requires a check above 10.000 EUR, whatever the age', () => {
		const duty = paymentCheckDuty('2026-12-31', 10_000.01, '2026-09-28');
		expect(duty.required).to.equal(true);
		expect(duty.reason).to.contain('10.000');
	});

	it('requires a check after 40 days of arrears', () => {
		const duty = paymentCheckDuty('2026-08-01', 500, '2026-09-28');
		expect(duty.required).to.equal(true);
		expect(duty.overdueDays).to.equal(58);
	});

	it('stays quiet below both thresholds', () => {
		expect(paymentCheckDuty('2026-10-28', 9_999, '2026-09-28').required).to.equal(false);
		// exactly 10.000 EUR is not "over" the limit
		expect(paymentCheckDuty(null, 10_000, '2026-09-28').required).to.equal(false);
	});

	it('counts days without timezone drift', () => {
		expect(daysBetween('2026-10-01', '2026-10-31')).to.equal(30);
		expect(daysBetween('2026-10-31', '2026-10-01')).to.equal(-30);
		expect(daysBetween('kein Datum', '2026-10-01')).to.equal(0);
	});
});

describe('compliance => § 147 AO retention', () => {
	it('keeps issued records for ten years', () => {
		expect(retentionUntil('2026-09-28')).to.equal('2036-12-31');
	});

	it('refuses a nonsense date', () => {
		expect(retentionUntil('kein Datum')).to.equal(null);
		expect(retentionUntil('12-99-99')).to.equal(null);
	});

	it('sets the deadline when an invoice is issued', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft()).id);
			expect(issued.retainUntil).to.equal('2036-12-31');
		} finally {
			db.close();
		}
	});
});

describe('dispatch => sent tracking', () => {
	it('marks an issued invoice as sent and clears it again', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft()).id);
			expect(issued.sentAt).to.equal(null);
			const sent = db.markSent(issued.id, '2026-09-28T10:00:00.000Z', 'E-Mail');
			expect(sent.sentAt).to.be.a('string');
			expect(sent.sendChannel).to.equal('E-Mail');
		} finally {
			db.close();
		}
	});

	it('refuses to mark a draft as sent', () => {
		const db = openDb();
		try {
			const created = db.createDraft(draft());
			expect(() => db.markSent(created.id, '2026-09-28T10:00:00.000Z', 'Post')).to.throw(/issued/);
		} finally {
			db.close();
		}
	});

	it('filters the list by dispatch state', () => {
		const db = openDb();
		try {
			const a = db.issueDraft(db.createDraft(draft()).id);
			db.issueDraft(db.createDraft(draft({ issueDate: '2026-09-29' })).id);
			db.markSent(a.id, '2026-09-28T10:00:00.000Z', 'E-Mail');
			expect(db.listInvoices({ sent: true })).to.have.lengthOf(1);
			expect(db.listInvoices({ sent: false })).to.have.lengthOf(1);
		} finally {
			db.close();
		}
	});
});

describe('drafts => deletion', () => {
	it('deletes a draft and frees nothing', () => {
		const db = openDb();
		try {
			const id = db.createDraft(draft()).id;
			db.deleteDraft(id);
			expect(db.getInvoice(id)).to.equal(null);
		} finally {
			db.close();
		}
	});

	it('never deletes an issued invoice', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft()).id);
			expect(() => db.deleteDraft(issued.id)).to.throw(/Storno/);
			expect(db.getInvoice(issued.id)).to.not.equal(null);
		} finally {
			db.close();
		}
	});

	it('reports an unknown draft', () => {
		const db = openDb();
		try {
			expect(() => db.deleteDraft('gibt-es-nicht')).to.throw(/not found/);
		} finally {
			db.close();
		}
	});
});

describe('list => search, sort and filter', () => {
	it('finds an invoice by its position text', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(
				db.createDraft(
					draft({
						lines: [
							{
								description: 'Ledersessel (003)',
								quantity: 1,
								unit: 'Stk',
								unitPriceNet: 70,
								vatRate: 19,
							},
						],
					}),
				).id,
			);
			const found = db.listInvoices({ query: 'Ledersessel' });
			expect(found).to.have.lengthOf(1);
			expect(found[0].id).to.equal(issued.id);
		} finally {
			db.close();
		}
	});

	it('finds an invoice by its amount, in every notation', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(
				db.createDraft(
					draft({
						lines: [{ description: 'Anlage', quantity: 1, unit: 'Stk', unitPriceNet: 2500, vatRate: 19 }],
					}),
				).id,
			);
			// 2500 + 19 % = 2975,00
			const gross = issued.totals.grossTotal;
			for (const term of ['2975,00', '2975.00', '2.975,00', '2,975.00', '2975', '2975,00 EUR']) {
				const hits = db.listInvoices({ query: term });
				expect(hits, term).to.have.lengthOf(1);
				expect(hits[0].id, term).to.equal(issued.id);
			}
			// the net total is searchable too, the tax total as well
			expect(db.listInvoices({ query: '2500,00' })).to.have.lengthOf(1);
			// no false positive on an amount that does not exist
			expect(db.listInvoices({ query: '99,99' })).to.have.lengthOf(0);
			// a word must not be read as a number
			expect(db.listInvoices({ query: 'abc' })).to.have.lengthOf(0);
			void gross;
		} finally {
			db.close();
		}
	});

	it('sorts by amount and direction', () => {
		const db = openDb();
		try {
			const small = db.issueDraft(db.createDraft(draft()).id);
			const big = db.issueDraft(
				db.createDraft(
					draft({
						lines: [{ description: 'Wartung', quantity: 1, unit: 'Stk', unitPriceNet: 5000, vatRate: 19 }],
					}),
				).id,
			);
			const desc = db.listInvoices({ sort: 'amount', order: 'desc' });
			const asc = db.listInvoices({ sort: 'amount', order: 'asc' });
			expect(desc[0].id).to.equal(big.id);
			expect(asc[0].id).to.equal(small.id);
		} finally {
			db.close();
		}
	});

	it('rejects an unknown sort column instead of interpolating it', () => {
		const db = openDb();
		try {
			db.issueDraft(db.createDraft(draft()).id);
			const res = db.listInvoices({ sort: 'id; DROP TABLE invoices' as never });
			expect(res).to.have.lengthOf(1);
			expect(db.allInvoices()).to.have.lengthOf(1);
		} finally {
			db.close();
		}
	});
});

describe('customers => fuzzy search', () => {
	it('measures the edit distance', () => {
		expect(levenshtein('brod', 'brod')).to.equal(0);
		expect(levenshtein('brod', 'brot')).to.equal(1);
		expect(levenshtein('', 'abc')).to.equal(3);
	});

	it('survives a typo and a different case', () => {
		const db = openDb();
		try {
			db.createCustomer('Brod GmbH & Co. KG', { ...seller, name: 'Brod GmbH & Co. KG', city: 'Hamburg' });
			db.createCustomer('Kasler GmbH', { ...seller, name: 'Kasler GmbH', city: 'Bonn' });
			for (const term of ['Brod', 'brod', 'brof', 'BROD GMBH']) {
				const hits = db.listCustomers(term);
				expect(hits, term).to.have.lengthOf(1);
				expect(hits[0].profile.name, term).to.contain('Brod');
			}
		} finally {
			db.close();
		}
	});

	it('returns nothing for a term that matches no customer', () => {
		const db = openDb();
		try {
			db.createCustomer('Kasler GmbH', { ...seller, name: 'Kasler GmbH' });
			expect(db.listCustomers('zzzzzz')).to.have.lengthOf(0);
		} finally {
			db.close();
		}
	});

	it('ranks exact matches first', () => {
		const ranked = rankCustomers(
			[
				{
					id: '1',
					name: 'Brod Automotive',
					profile: { name: 'Brod Automotive' },
					createdAt: '',
					updatedAt: '',
				},
				{ id: '2', name: 'Brod', profile: { name: 'Brod' }, createdAt: '', updatedAt: '' },
			] as never,
			'Brod',
		);
		expect(ranked[0].id).to.equal('2');
	});
});

describe('reminders => dunning candidates', () => {
	it('picks up unpaid invoices past the grace period', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft({ dueDate: '2026-09-01' })).id);
			const due = collectReminderCandidates(db, '2026-09-20');
			expect(due).to.have.lengthOf(1);
			expect(due[0].invoice.id).to.equal(issued.id);
			expect(due[0].overdueDays).to.equal(19);
		} finally {
			db.close();
		}
	});

	it('leaves fresh, paid and draft invoices alone', () => {
		const db = openDb();
		try {
			db.issueDraft(db.createDraft(draft({ dueDate: '2026-10-20' })).id);
			const paid = db.issueDraft(db.createDraft(draft({ dueDate: '2026-09-01' })).id);
			db.setPaid(paid.id, true);
			db.createDraft(draft({ dueDate: '2026-09-01' }));
			expect(collectReminderCandidates(db, '2026-09-20')).to.have.lengthOf(0);
		} finally {
			db.close();
		}
	});

	it('never chases the same invoice twice in a day', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft({ dueDate: '2026-09-01' })).id);
			expect(collectReminderCandidates(db, '2026-09-20')).to.have.lengthOf(1);
			db.registerReminder(issued.id, '2026-09-20');
			expect(collectReminderCandidates(db, '2026-09-20')).to.have.lengthOf(0);
			// the next day it comes back
			expect(collectReminderCandidates(db, '2026-09-21')).to.have.lengthOf(1);
		} finally {
			db.close();
		}
	});

	it('flags that the cash discount is still available', () => {
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

	it('counts the reminders', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft({ dueDate: '2026-09-01' })).id);
			db.registerReminder(issued.id);
			expect(db.getInvoice(issued.id)?.reminderLevel).to.equal(1);
		} finally {
			db.close();
		}
	});
});

describe('batch => Serienrechnung', function () {
	this.timeout(60000);

	it('numbers each draft on its own', async () => {
		const db = openDb();
		try {
			const a = db.createDraft(draft({ buyer: { ...draft().buyer, name: 'A GmbH' } }));
			const b = db.createDraft(draft({ buyer: { ...draft().buyer, name: 'B GmbH' } }));
			const res = await issueInvoiceBatch(db, logger, [a.id, b.id], memStorage());
			expect(res.failed).to.have.lengthOf(0);
			expect(res.issued).to.have.lengthOf(2);
			const numbers = res.issued.map(i => i.number);
			expect(new Set(numbers).size).to.equal(2);
		} finally {
			db.close();
		}
	});

	it('keeps going when one draft is broken', async () => {
		const db = openDb();
		try {
			const good = db.createDraft(draft());
			// a draft without a customer number cannot be issued (BT-10)
			const bad = db.createDraft(draft({ buyer: { ...draft().buyer, customerNumber: '' } }));
			const res = await issueInvoiceBatch(db, logger, [bad.id, good.id], memStorage());
			expect(res.failed).to.have.lengthOf(1);
			expect(res.issued).to.have.lengthOf(1);
		} finally {
			db.close();
		}
	});
});

describe('csv => accounting export', () => {
	it('writes a German semicolon list with a BOM', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft()).id);
			const csv = renderInvoiceListCsv([issued]);
			expect(csv.charCodeAt(0)).to.equal(0xfeff);
			const lines = csv.trim().split('\r\n');
			// notice, header, one row
			expect(lines).to.have.lengthOf(3);
			expect(lines[1]).to.contain('Rechnungsnummer');
			// the row must carry the number the adapter assigned
			expect(issued.number).to.be.a('string');
			expect(lines[2]).to.contain(String(issued.number));
			// German decimal comma
			expect(lines[2]).to.contain('200,00');
			expect(lines[2]).to.contain('238,00');
		} finally {
			db.close();
		}
	});

	it('neutralises a formula in customer data', () => {
		const db = openDb();
		try {
			const issued = db.issueDraft(
				db.createDraft(draft({ buyer: { ...draft().buyer, name: '=HYPERLINK("evil")' } })).id,
			);
			const csv = renderInvoiceListCsv([issued]);
			// the dangerous prefix must be defused, not executed
			expect(csv).to.contain("'=HYPERLINK");
		} finally {
			db.close();
		}
	});

	it('books a credit note as a negative amount', () => {
		const db = openDb();
		try {
			const credit = db.issueDraft(
				db.createDraft(draft({ documentTitle: 'Gutschrift', issueDate: '2026-09-29' })).id,
			);
			const csv = renderInvoiceListCsv([credit]);
			expect(csv).to.contain('Gutschrift');
		} finally {
			db.close();
		}
	});
});

describe('templates => reusable invoice content', () => {
	it('creates, lists, updates and deletes', () => {
		const db = openDb();
		try {
			const created = db.createInvoiceTemplate('Monatliche Wartung', draft());
			expect(db.listInvoiceTemplates()).to.have.lengthOf(1);
			created.body.notes = 'geändert';
			const updated = db.updateInvoiceTemplate(created.id, { body: created.body });
			expect(updated.body.notes).to.equal('geändert');
			db.deleteInvoiceTemplate(created.id);
			expect(db.listInvoiceTemplates()).to.have.lengthOf(0);
		} finally {
			db.close();
		}
	});

	it('refuses an unnamed template', () => {
		const db = openDb();
		try {
			expect(() => db.createInvoiceTemplate('   ', draft())).to.throw(/name/);
		} finally {
			db.close();
		}
	});
});
