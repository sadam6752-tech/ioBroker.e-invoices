/**
 * Unit tests for the SQLite persistence layer (P1).
 * In-memory databases (no files, no Windows locks); one file-based test
 * covers real file creation.
 */
import { expect } from 'chai';
import { InvoiceDatabase } from './db';
import type { InvoiceDraftInput, Party } from './invoice-model';
import { calcTotals } from './invoice-model';

const seller: Party = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
};

const buyer: Party = {
	name: 'Kunde AG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-42',
};

function draft(overrides: Partial<InvoiceDraftInput> = {}): InvoiceDraftInput {
	return {
		seller,
		buyer,
		lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		currency: 'EUR',
		...overrides,
	};
}

/** Opens a migrated in-memory database. */
function openMemoryDb(): InvoiceDatabase {
	const db = new InvoiceDatabase(':memory:');
	db.migrate();
	return db;
}

describe('db => migrations', () => {
	it('migrates a fresh database to the latest version', () => {
		const db = openMemoryDb();
		try {
			expect(db.currentVersion()).to.equal(7);
			const columns = db.tableColumns('invoices');
			expect(columns).to.contain('payment_terms');
			expect(columns).to.contain('employee_code');
			expect(db.tableColumns('customers')).to.contain('profile_json');
		} finally {
			db.close();
		}
	});

	it('migrate is idempotent', () => {
		const db = openMemoryDb();
		try {
			db.migrate();
			expect(db.currentVersion()).to.equal(7);
		} finally {
			db.close();
		}
	});
});

describe('db => drafts and issue flow', () => {
	it('creates, updates, issues and numbers sequentially', () => {
		const db = openMemoryDb();
		try {
			const first = db.createDraft(draft());
			expect(first.status).to.equal('draft');
			expect(first.number).to.equal(null);
			expect(first.totals.grossTotal).to.equal(119);

			const updated = db.updateDraft(first.id, { dueDate: '2026-10-12' });
			expect(updated.dueDate).to.equal('2026-10-12');

			const issued1 = db.issueDraft(first.id);
			expect(issued1.number).to.equal('2026-00-001');
			expect(issued1.status).to.equal('issued');

			const second = db.createDraft(draft());
			const issued2 = db.issueDraft(second.id);
			expect(issued2.number).to.equal('2026-00-002');

			expect(() => db.updateDraft(first.id, {})).to.throw();
			expect(db.countByStatus()).to.deep.equal({ draft: 0, issued: 2, cancelled: 0 });
		} finally {
			db.close();
		}
	});

	it('refuses to issue incomplete drafts', () => {
		const db = openMemoryDb();
		try {
			const bad = db.createDraft(draft({ lines: [] }));
			expect(() => db.issueDraft(bad.id)).to.throw(/issuable|line/i);
		} finally {
			db.close();
		}
	});

	it('clears due date and notes when the client sends an empty value', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft({ dueDate: '2026-10-12', notes: 'bitte prüfen' }));
			expect(created.dueDate).to.equal('2026-10-12');
			const cleared = db.updateDraft(created.id, { dueDate: null as unknown as string, notes: '' });
			expect(cleared.dueDate).to.equal(null);
			expect(cleared.notes).to.equal(null);
		} finally {
			db.close();
		}
	});

	it('refreshes the totals snapshot when issuing', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(
				draft({
					lines: [
						{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
						{ description: 'B', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
						{ description: 'C', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
					],
				}),
			);
			expect(created.totals.taxTotal).to.equal(calcTotals(created.lines).taxTotal);
			const issued = db.issueDraft(created.id);
			expect(issued.totals.taxTotal).to.equal(Math.round((issued.totals.netTotal * 19) / 100));
		} finally {
			db.close();
		}
	});

	it('uses a configured number format and falls back on an invalid one', () => {
		const db = openMemoryDb();
		try {
			db.applyOptions({ numberFormat: 'RE-{SEQ}-{YYYY}' });
			expect(db.nextInvoiceNumber(2026, '01')).to.equal('RE-001-2026');
			expect(db.nextInvoiceNumber(2026, '01')).to.equal('RE-002-2026');
			// a path separator is refused, it would break the file storage
			db.applyOptions({ numberFormat: '{YYYY}/{SEQ}' });
			expect(db.effectiveNumberFormat()).to.equal('{YYYY}-{EMPLOYEE}-{SEQ}');
			db.applyOptions({ numberFormat: 'no sequence here' });
			expect(db.effectiveNumberFormat()).to.equal('{YYYY}-{EMPLOYEE}-{SEQ}');
			expect(db.nextInvoiceNumber(2026, '01')).to.equal('2026-01-003');
		} finally {
			db.close();
		}
	});

	it('marks issued invoices as paid and refuses drafts', () => {
		const db = openMemoryDb();
		try {
			const issued = db.issueDraft(db.createDraft(draft()).id);
			expect(issued.paid).to.equal(false);
			const paid = db.setPaid(issued.id, true, '2026-10-01');
			expect(paid.paid).to.equal(true);
			expect(paid.paidAt).to.equal('2026-10-01');
			const unpaid = db.setPaid(issued.id, false);
			expect(unpaid.paid).to.equal(false);
			expect(unpaid.paidAt).to.equal(null);
			const fresh = db.createDraft(draft());
			expect(() => db.setPaid(fresh.id, true)).to.throw(/issued/i);
		} finally {
			db.close();
		}
	});

	it('reverses an invoice with a linked credit note', () => {
		const db = openMemoryDb();
		try {
			const original = db.issueDraft(db.createDraft(draft()).id);
			const { reversal, original: cancelled } = db.reverseInvoice(original.id, 'Falsch ausgestellt');
			expect(cancelled.status).to.equal('cancelled');
			expect(cancelled.number).to.equal(original.number);
			expect(reversal.status).to.equal('draft');
			expect(reversal.stornoOfId).to.equal(original.id);
			expect(reversal.documentTitle).to.equal('Gutschrift');
			expect(reversal.notes).to.contain('Falsch ausgestellt');
			expect(reversal.lines).to.have.lengthOf(original.lines.length);
			// a second Storno must not create another credit note
			expect(() => db.reverseInvoice(original.id)).to.throw(/issued/i);
			expect(db.countByStatus().cancelled).to.equal(1);
			// the reversal itself is reversible, and the new note links to it
			const issuedReversal = db.issueDraft(reversal.id);
			const second = db.reverseInvoice(issuedReversal.id);
			expect(second.original.id).to.equal(issuedReversal.id);
			expect(second.original.stornoOfId).to.equal(original.id);
			expect(second.reversal.stornoOfId).to.equal(issuedReversal.id);
			expect(second.reversal.documentTitle).to.equal('Gutschrift');
		} finally {
			db.close();
		}
	});

	it('keeps skonto on the draft and clears it again', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft({ skontoPercent: 2, skontoDueDate: '2026-10-05' }));
			expect(created.skontoPercent).to.equal(2);
			expect(created.skontoDueDate).to.equal('2026-10-05');
			const cleared = db.updateDraft(created.id, { skontoPercent: 0, skontoDueDate: '' });
			expect(cleared.skontoPercent).to.equal(0);
			expect(cleared.skontoDueDate).to.equal(null);
		} finally {
			db.close();
		}
	});

	it('lists and filters invoices', () => {
		const db = openMemoryDb();
		try {
			const one = db.createDraft(draft());
			db.createDraft(draft());
			db.issueDraft(one.id);
			expect(db.listInvoices({ status: 'issued' })).to.have.lengthOf(1);
			expect(db.listInvoices({ status: 'draft' })).to.have.lengthOf(1);
			expect(db.listInvoices({ query: 'Kunde' })).to.have.lengthOf(2);
		} finally {
			db.close();
		}
	});

	it('numbers per employee separately', () => {
		const db = openMemoryDb();
		try {
			const a1 = db.createDraft(draft({ employeeCode: '01' }));
			const b1 = db.createDraft(draft({ employeeCode: '02' }));
			const a2 = db.createDraft(draft({ employeeCode: '01' }));
			expect(db.issueDraft(a1.id).number).to.equal('2026-01-001');
			expect(db.issueDraft(b1.id).number).to.equal('2026-02-001');
			expect(db.issueDraft(a2.id).number).to.equal('2026-01-002');
			expect(db.nextInvoiceNumber(2026, '01')).to.equal('2026-01-003');
		} finally {
			db.close();
		}
	});

	it('rejects invalid employee codes and pads numeric ones', () => {
		const db = openMemoryDb();
		try {
			expect(() => db.createDraft(draft({ employeeCode: 'a/b' }))).to.throw(/employee/i);
			// `1` and `01` must be the same person, not two parallel counters
			const unpadded = db.createDraft(draft({ employeeCode: '1' }));
			expect(unpadded.employeeCode).to.equal('01');
			expect(db.issueDraft(unpadded.id).number).to.equal('2026-01-001');
			const padded = db.createDraft(draft({ employeeCode: '01' }));
			expect(db.issueDraft(padded.id).number).to.equal('2026-01-002');
		} finally {
			db.close();
		}
	});
});

describe('db => company profiles', () => {
	const profile = { ...seller, phone: '+49 30 1', website: 'https://muster.example' };

	it('seeds, updates, switches and protects the default', () => {
		const db = openMemoryDb();
		try {
			const seeded = db.ensureDefaultCompanyProfile();
			expect(seeded.isDefault).to.equal(true);
			expect(seeded.name).to.equal('Meine Firma');
			expect(db.ensureDefaultCompanyProfile().id).to.equal(seeded.id);

			const filled = db.updateCompanyProfile(seeded.id, { name: 'Muster GmbH', profile });
			expect(filled.profile.phone).to.equal('+49 30 1');

			const second = db.createCompanyProfile('Filiale', { ...profile, name: 'Filiale' });
			expect(second.isDefault).to.equal(false);
			db.setDefaultCompanyProfile(second.id);
			expect(db.getDefaultCompanyProfile()?.id).to.equal(second.id);
			expect(() => db.deleteCompanyProfile(second.id)).to.throw(/default/i);
			db.deleteCompanyProfile(seeded.id);
			expect(db.listCompanyProfiles()).to.have.lengthOf(1);
		} finally {
			db.close();
		}
	});
});

describe('db => customers', () => {
	const customer = { ...seller, name: 'Kunde AG', customerNumber: 'K-7' };

	it('assigns a customer number automatically and never twice', () => {
		const db = openMemoryDb();
		try {
			const a = db.createCustomer('Alpha', { ...seller, name: 'Alpha' });
			const b = db.createCustomer('Beta', { ...buyer, name: 'Beta', customerNumber: '' });
			expect(a.profile.customerNumber).to.equal('K-00001');
			expect(b.profile.customerNumber).to.equal('K-00002');
			// a hand-set number wins and must not be handed out again
			const own = db.createCustomer('Gamma', { ...buyer, name: 'Gamma', customerNumber: 'KD-4711' });
			expect(own.profile.customerNumber).to.equal('KD-4711');
			const d = db.createCustomer('Delta', { ...buyer, name: 'Delta', customerNumber: '' });
			expect(d.profile.customerNumber).to.not.equal('KD-4711');
			expect(d.profile.customerNumber).to.equal('K-00003');
		} finally {
			db.close();
		}
	});

	it('numbers only customers that do not have one yet', () => {
		const db = openMemoryDb();
		try {
			db.createCustomer('Alpha', { ...seller, name: 'Alpha', customerNumber: 'KD-1' });
			// simulate a record from before the automatic numbering existed
			const legacy = db.createCustomer('Legacy', { ...seller, name: 'Legacy', customerNumber: 'KD-2' });
			db.updateCustomer(legacy.id, { name: legacy.name, profile: { ...legacy.profile, customerNumber: '' } });
			const changed = db.assignMissingCustomerNumbers();
			expect(changed).to.have.lengthOf(1);
			expect(changed[0].name).to.equal('Legacy');
			expect(changed[0].profile.customerNumber).to.equal('K-00001');
			expect(db.listCustomers().find(c => c.name === 'Alpha')?.profile.customerNumber).to.equal('KD-1');
			// idempotent
			expect(db.assignMissingCustomerNumbers()).to.have.lengthOf(0);
		} finally {
			db.close();
		}
	});

	it('creates, updates, lists and deletes customers', () => {
		const db = openMemoryDb();
		try {
			expect(db.listCustomers()).to.deep.equal([]);
			const created = db.createCustomer('Kunde AG', customer);
			expect(db.getCustomer(created.id)?.profile.customerNumber).to.equal('K-7');
			const updated = db.updateCustomer(created.id, { name: 'Kunde GmbH' });
			expect(updated.name).to.equal('Kunde GmbH');
			expect(updated.profile.customerNumber).to.equal('K-7');
			db.createCustomer('Beta', { ...customer, name: 'Beta' });
			expect(db.listCustomers().map(c => c.name)).to.deep.equal(['Beta', 'Kunde GmbH']);
			db.deleteCustomer(created.id);
			expect(db.getCustomer(created.id)).to.equal(null);
			expect(() => db.deleteCustomer('nope')).to.throw(/not found/i);
			expect(() => db.createCustomer('  ', customer)).to.throw(/name/i);
		} finally {
			db.close();
		}
	});
});

describe('db => products', () => {
	it('creates, updates, lists and deletes catalog items', () => {
		const db = openMemoryDb();
		try {
			expect(db.listProducts()).to.deep.equal([]);
			const created = db.createProduct({
				sku: 'ABC123',
				name: 'Produkt A',
				details: 'Detail',
				unit: 'Stk',
				unitPriceNet: 19.95,
				vatRate: 19,
			});
			expect(db.getProduct(created.id)?.sku).to.equal('ABC123');
			const updated = db.updateProduct(created.id, { unitPriceNet: 21.5 });
			expect(updated.unitPriceNet).to.equal(21.5);
			expect(updated.name).to.equal('Produkt A');
			db.createProduct({ name: 'Beratung', unit: 'Std', unitPriceNet: 100, vatRate: 19 });
			expect(db.listProducts().map(p => p.name)).to.deep.equal(['Beratung', 'Produkt A']);
			db.deleteProduct(created.id);
			expect(db.getProduct(created.id)).to.equal(null);
			expect(() => db.deleteProduct('nope')).to.throw(/not found/i);
			expect(() => db.createProduct({ name: '  ' })).to.throw(/name/i);
			expect(() => db.createProduct({ name: 'X', vatRate: 16 })).to.throw(/VAT/i);
			expect(() => db.createProduct({ name: 'X', unitPriceNet: -1 })).to.throw(/price/i);
		} finally {
			db.close();
		}
	});
});
