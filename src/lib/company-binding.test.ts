/**
 * R6.3: a document is bound to the company profile it was written for; the
 * revenue report adds the documents up per company. The number circle stays
 * global, so nothing here may move an existing number.
 */
import { expect } from 'chai';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InvoiceDatabase } from './db';
import type { InvoiceDraftInput, Party } from './invoice-model';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';
import { evaluateRevenueByCompany, NO_COMPANY_LABEL } from './revenue-report';

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

/**
 * A complete draft.
 *
 * @param overrides - Fields to change.
 */
function draft(overrides: Partial<InvoiceDraftInput> = {}): InvoiceDraftInput {
	return {
		seller,
		buyer,
		lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-28',
		currency: 'EUR',
		...overrides,
	};
}

describe('company binding (R6.3)', () => {
	it('upgrades a v13 database and keeps every number, old documents have no company', () => {
		const dir = mkdtempSync(join(tmpdir(), 'einv-legacy-'));
		const file = join(dir, 'invoices.db');
		const legacy = new Database(file);
		try {
			for (const migration of MIGRATIONS.filter(m => m.version <= 13)) {
				for (const statement of migration.sql) {
					legacy.exec(statement);
				}
				legacy
					.prepare(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`)
					.run(migration.version, migration.name, '2026-01-01T00:00:00.000Z');
			}
			legacy
				.prepare(
					`INSERT INTO invoices
					 (id, number, issue_date, delivery_date, seller_json, buyer_json, lines_json, totals_json, status, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?)`,
				)
				.run(
					'legacy-13',
					'2026-00-007',
					'2026-01-05',
					'2026-01-04',
					JSON.stringify(seller),
					JSON.stringify(buyer),
					JSON.stringify([{ description: 'Alt', quantity: 1, unit: 'Std', unitPriceNet: 10, vatRate: 19 }]),
					JSON.stringify({ netTotal: 10, taxTotal: 1.9, grossTotal: 11.9, breakdown: [] }),
					'2026-01-05T08:00:00.000Z',
					'2026-01-05T08:00:00.000Z',
				);
			legacy
				.prepare(`INSERT INTO counters (year, employee, doc_type, last_seq) VALUES (2026, '00', 'invoice', 7)`)
				.run();
		} finally {
			legacy.close();
		}
		const db = new InvoiceDatabase(file);
		try {
			db.migrate();
			expect(db.currentVersion()).to.equal(LATEST_SCHEMA_VERSION);
			const migrated = db.getInvoice('legacy-13');
			expect(migrated?.number).to.equal('2026-00-007');
			expect(migrated?.companyId).to.equal(null);
			// the circle is global and goes on where it was
			expect(db.nextInvoiceNumber(2026)).to.equal('2026-00-008');
			// the old document is still listed, also when asking for "no company"
			expect(db.listInvoices({ companyId: 'none' }).map(i => i.id)).to.deep.equal(['legacy-13']);
		} finally {
			db.close();
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('binds a draft to a company, filters by it and keeps the number circle global', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const a = db.createCompanyProfile('Firma A', seller);
			const b = db.createCompanyProfile('Firma B', { ...seller, name: 'Zweite KG' });
			const forA = db.createDraft(draft({ companyId: a.id }));
			const forB = db.createDraft(draft({ companyId: b.id }));
			const none = db.createDraft(draft());
			expect(forA.companyId).to.equal(a.id);
			expect(none.companyId).to.equal(null);
			const numbers = [forA, forB, none].map(d => db.issueDraft(d.id).number);
			// one circle for everybody
			expect(numbers).to.deep.equal(['2026-00-001', '2026-00-002', '2026-00-003']);
			expect(db.listInvoices({ companyId: a.id }).map(i => i.id)).to.deep.equal([forA.id]);
			expect(db.listInvoices({ companyId: b.id }).map(i => i.id)).to.deep.equal([forB.id]);
			expect(db.listInvoices({ companyId: 'none' }).map(i => i.id)).to.deep.equal([none.id]);
			expect(db.listInvoices()).to.have.length(3);
		} finally {
			db.close();
		}
	});

	it('refuses an unknown company, and a draft can be rebound or unbound', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			expect(() => db.createDraft(draft({ companyId: 'gibt-es-nicht' }))).to.throw(/Unknown company profile/);
			const a = db.createCompanyProfile('Firma A', seller);
			const created = db.createDraft(draft());
			expect(db.updateDraft(created.id, { companyId: a.id }).companyId).to.equal(a.id);
			// a patch without the key keeps the binding
			expect(db.updateDraft(created.id, { notes: 'x' }).companyId).to.equal(a.id);
			expect(db.updateDraft(created.id, { companyId: null }).companyId).to.equal(null);
			expect(() => db.updateDraft(created.id, { companyId: 'nope' })).to.throw(/Unknown company profile/);
		} finally {
			db.close();
		}
	});

	it('hands the company on to a Storno and to an invoice made from a quotation', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const a = db.createCompanyProfile('Firma A', seller);
			const issued = db.issueDraft(db.createDraft(draft({ companyId: a.id })).id);
			const { reversal } = db.reverseInvoice(issued.id, 'Test');
			expect(reversal.companyId).to.equal(a.id);

			const quote = db.issueDraft(db.createDraft(draft({ companyId: a.id, docType: 'quote' })).id);
			const converted = db.convertQuoteToInvoice(quote.id);
			expect(converted.companyId).to.equal(a.id);
		} finally {
			db.close();
		}
	});

	it('survives an export and import of the data', () => {
		const from = new InvoiceDatabase(':memory:');
		from.migrate();
		const to = new InvoiceDatabase(':memory:');
		to.migrate();
		try {
			const a = from.createCompanyProfile('Firma A', seller);
			const issued = from.issueDraft(from.createDraft(draft({ companyId: a.id })).id);
			to.importData(from.exportData());
			expect(to.getInvoice(issued.id)?.companyId).to.equal(a.id);
		} finally {
			from.close();
			to.close();
		}
	});
});

describe('revenue per company (R6.3)', () => {
	it('adds up per company, leaves out offers, drafts, Storno and cancelled invoices, and the sums match the documents', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const a = db.createCompanyProfile('Firma A', seller);
			const b = db.createCompanyProfile('Zweite KG', { ...seller, name: 'Zweite KG' });
			const line = (net: number): InvoiceDraftInput['lines'] => [
				{ description: 'x', quantity: 1, unit: 'Stk', unitPriceNet: net, vatRate: 19 },
			];
			const one = db.issueDraft(db.createDraft(draft({ companyId: a.id, lines: line(100) })).id);
			db.issueDraft(db.createDraft(draft({ companyId: a.id, lines: line(50.1) })).id);
			db.issueDraft(db.createDraft(draft({ companyId: b.id, lines: line(300) })).id);
			db.issueDraft(db.createDraft(draft({ lines: line(10) })).id); // legacy-like: no company
			db.createDraft(draft({ companyId: a.id, lines: line(999) })); // draft
			db.issueDraft(db.createDraft(draft({ companyId: a.id, docType: 'quote', lines: line(999) })).id); // offer
			const { reversal } = db.reverseInvoice(one.id); // cancels `one`, its credit note is no revenue
			db.issueDraft(reversal.id);
			// a year other than 2026
			db.issueDraft(db.createDraft(draft({ companyId: b.id, issueDate: '2025-03-01', lines: line(7) })).id);

			const names = new Map(db.listCompanyProfiles().map(c => [c.id, c.name]));
			const report = evaluateRevenueByCompany(db.allInvoices(), names, 2026);
			expect(report.rows.map(r => r.company)).to.deep.equal(['Zweite KG', 'Firma A', NO_COMPANY_LABEL]);
			expect(report.rows[0]).to.include({ count: 1, net: 300, tax: 57, gross: 357 });
			expect(report.rows[1]).to.include({ count: 1, net: 50.1, tax: 9.52, gross: 59.62 });
			expect(report.rows[2]).to.include({ count: 1, net: 10 });
			expect(report.total.count).to.equal(3);

			// the grand total equals the sum of the single documents
			const singles = db
				.allInvoices()
				.filter(
					i =>
						i.status === 'issued' &&
						i.docType === 'invoice' &&
						!i.stornoOfId &&
						i.issueDate.startsWith('2026'),
				);
			expect(report.total.gross).to.equal(
				Math.round(singles.reduce((s, i) => s + i.totals.grossTotal, 0) * 100) / 100,
			);

			// all years add the 2025 invoice of Zweite KG
			const all = evaluateRevenueByCompany(db.allInvoices(), names);
			expect(all.year).to.equal(null);
			expect(all.rows[0].count).to.equal(2);
		} finally {
			db.close();
		}
	});
});
