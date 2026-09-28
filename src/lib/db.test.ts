/**
 * Unit tests for the SQLite persistence layer (P1).
 * In-memory databases (no files, no Windows locks); one file-based test
 * covers real file creation.
 */
import { expect } from 'chai';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InvoiceDatabase } from './db';
import type { InvoiceDraftInput, Party } from './invoice-model';

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
	it('migrates a fresh file database to the latest version', () => {
		const dir = mkdtempSync(join(tmpdir(), 'einv-'));
		try {
			const db = new InvoiceDatabase(join(dir, 'invoices.db'));
			db.migrate();
			expect(db.currentVersion()).to.equal(2);
			const columns = db.tableColumns('invoices');
			expect(columns).to.contain('payment_terms');
			db.close();
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('migrate is idempotent', () => {
		const db = openMemoryDb();
		try {
			db.migrate();
			expect(db.currentVersion()).to.equal(2);
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

			const issued1 = db.issueDraft(first.id, 2026);
			expect(issued1.number).to.equal('2026-0001');
			expect(issued1.status).to.equal('issued');

			const second = db.createDraft(draft());
			const issued2 = db.issueDraft(second.id, 2026);
			expect(issued2.number).to.equal('2026-0002');

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
			expect(() => db.issueDraft(bad.id, 2026)).to.throw(/issuable|line/i);
		} finally {
			db.close();
		}
	});

	it('lists and filters invoices', () => {
		const db = openMemoryDb();
		try {
			const one = db.createDraft(draft());
			db.createDraft(draft());
			db.issueDraft(one.id, 2026);
			expect(db.listInvoices({ status: 'issued' })).to.have.lengthOf(1);
			expect(db.listInvoices({ status: 'draft' })).to.have.lengthOf(1);
			expect(db.listInvoices({ query: 'Kunde' })).to.have.lengthOf(2);
		} finally {
			db.close();
		}
	});
});
