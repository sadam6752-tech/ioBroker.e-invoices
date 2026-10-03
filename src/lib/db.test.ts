/**
 * Unit tests for the SQLite persistence layer (P1).
 * In-memory databases (no files, no Windows locks); one file-based test
 * covers the upgrade of a legacy database written by an older adapter.
 */
import { expect } from 'chai';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from './attachments';
import { InvoiceDatabase } from './db';
import type { InvoiceDraftInput, Party, QuoteDecision } from './invoice-model';
import { calcTotals, DEFAULT_NUMBER_FORMAT, DEFAULT_QUOTE_NUMBER_FORMAT, quoteState } from './invoice-model';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';

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
			expect(db.currentVersion()).to.equal(LATEST_SCHEMA_VERSION);
			const columns = db.tableColumns('invoices');
			expect(columns).to.contain('payment_terms');
			expect(columns).to.contain('employee_code');
			expect(columns).to.contain('sent_at');
			expect(columns).to.contain('retain_until');
			// R8: document type, validity of a quotation and its lifecycle
			expect(columns).to.contain('doc_type');
			expect(columns).to.contain('valid_until');
			expect(columns).to.contain('source_document_id');
			expect(columns).to.contain('accepted_at');
			expect(columns).to.contain('rejected_at');
			expect(columns).to.contain('rejection_reason');
			expect(db.tableColumns('customers')).to.contain('profile_json');
			expect(db.tableColumns('render_history')).to.contain('previous_path');
			expect(db.tableColumns('invoice_templates')).to.contain('body_json');
			expect(db.tableColumns('validation_reports')).to.contain('report_path');
		} finally {
			db.close();
		}
	});

	it('migrate is idempotent', () => {
		const db = openMemoryDb();
		try {
			db.migrate();
			expect(db.currentVersion()).to.equal(LATEST_SCHEMA_VERSION);
		} finally {
			db.close();
		}
	});

	it('upgrades a v12 database: old documents have no frozen layout (R7.8)', () => {
		const dir = mkdtempSync(join(tmpdir(), 'einv-legacy-'));
		const file = join(dir, 'invoices.db');
		const legacy = new Database(file);
		try {
			for (const migration of MIGRATIONS.filter(m => m.version <= 12)) {
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
					'legacy-12',
					'2026-00-003',
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
				.prepare(
					`INSERT INTO render_history (invoice_id, artifact, previous_path, new_path, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
				)
				.run('legacy-12', 'pdf', null, 'invoices/2026/2026-00-003.pdf', 'alt', '2026-01-06T08:00:00.000Z');
		} finally {
			legacy.close();
		}
		const db = new InvoiceDatabase(file);
		try {
			db.migrate();
			expect(db.currentVersion()).to.equal(LATEST_SCHEMA_VERSION);
			const migrated = db.getInvoice('legacy-12');
			expect(migrated?.number).to.equal('2026-00-003');
			expect(migrated?.templateSnapshot).to.equal(null);
			expect(db.listRenderHistory('legacy-12')[0].layout).to.equal(null);
		} finally {
			db.close();
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('upgrades a v11 database without touching its invoice numbers (R8)', () => {
		const dir = mkdtempSync(join(tmpdir(), 'einv-legacy-'));
		const file = join(dir, 'invoices.db');
		const legacy = new Database(file);
		try {
			// Rebuild exactly the schema an installed adapter had before R8:
			// every migration up to v11 is applied, v12 is not.
			const before = MIGRATIONS.filter(migration => migration.version <= 11);
			expect(before.length).to.be.greaterThan(0);
			for (const migration of before) {
				for (const statement of migration.sql) {
					legacy.exec(statement);
				}
				legacy
					.prepare(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`)
					.run(migration.version, migration.name, '2026-01-01T00:00:00.000Z');
			}
			// one issued invoice plus its counter row, as an old version wrote them
			legacy
				.prepare(
					`INSERT INTO invoices
					 (id, number, issue_date, delivery_date, seller_json, buyer_json, lines_json, totals_json, status, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?)`,
				)
				.run(
					'legacy-1',
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
			legacy.prepare(`INSERT INTO counters (year, employee, last_seq) VALUES (2026, '00', 7)`).run();
		} finally {
			legacy.close();
		}

		const db = new InvoiceDatabase(file);
		try {
			db.migrate();
			expect(db.currentVersion()).to.equal(LATEST_SCHEMA_VERSION);
			const migrated = db.getInvoice('legacy-1');
			// GoBD: the old record keeps its number and simply becomes an
			// invoice of the new document model
			expect(migrated?.number).to.equal('2026-00-007');
			expect(migrated?.docType).to.equal('invoice');
			expect(migrated?.validUntil).to.equal(null);
			expect(migrated?.sourceDocumentId).to.equal(null);
			// § 14 Abs. 4 Nr. 4 UStG: the invoice circle continues at 8 …
			expect(db.nextInvoiceNumber(2026)).to.equal('2026-00-008');
			// … while the quotation circle starts fresh and stays separate (R8)
			expect(db.nextQuoteNumber(2026)).to.equal('A-2026-00-001');
			expect(db.nextQuoteNumber(2026)).to.equal('A-2026-00-002');
			expect(db.nextInvoiceNumber(2026)).to.equal('2026-00-009');
		} finally {
			db.close();
			rmSync(dir, { recursive: true, force: true });
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

	describe('db => validation reports', () => {
		it('stores reports with a running number, newest first', () => {
			const db = openMemoryDb();
			try {
				const created = db.createDraft(draft());
				const first = db.logValidationReport(created.id, 'invoices/2026/x.validation-1.json', 0, 0);
				const second = db.logValidationReport(created.id, 'invoices/2026/x.validation-2.json', 1, 2);
				expect(first).to.equal(1);
				expect(second).to.equal(2);
				const entries = db.listValidationReports(created.id);
				expect(entries).to.have.lengthOf(2);
				expect(entries[0].seq).to.equal(2);
				expect(entries[0].formatErrors).to.equal(1);
				expect(entries[0].businessErrors).to.equal(2);
				expect(entries[1].reportPath).to.match(/validation-1\.json$/);
				expect(entries[0].createdAt).to.match(/^\d{4}-\d{2}-\d{2}T/);
			} finally {
				db.close();
			}
		});

		it('removes the reports together with the deleted draft', () => {
			const db = openMemoryDb();
			try {
				const created = db.createDraft(draft());
				db.logValidationReport(created.id, 'invoices/2026/x.validation-1.json', 0, 0);
				db.deleteDraft(created.id);
				expect(db.listValidationReports(created.id)).to.deep.equal([]);
			} finally {
				db.close();
			}
		});
	});
});

describe('db => attachments (R4)', () => {
	/** Minimal PNG: signature plus IHDR marker. */
	const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49]);
	/** Minimal PDF: the sniffer only looks at the signature. */
	const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');

	it('stores filename, sniffed type, size and content of a draft', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft());
			const stored = db.addAttachment(created.id, {
				filename: 'C:\\Temp\\Lieferschein Müller.png',
				mime: 'application/octet-stream',
				data: png,
			});
			// the path and the declared type are dropped, the content decides
			expect(stored.filename).to.equal('Lieferschein Müller.png');
			expect(stored.mime).to.equal('image/png');
			expect(stored.size).to.equal(png.length);
			expect(stored.data.equals(png)).to.equal(true);
			expect(db.countAttachments(created.id)).to.equal(1);
			expect(db.getAttachment(created.id, stored.id)?.data.equals(png)).to.equal(true);
			expect(db.getAttachment('00000000-0000-0000-0000-000000000000', stored.id)).to.equal(undefined);
		} finally {
			db.close();
		}
	});

	it('keeps the content out of the listing used by the UI', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft());
			const stored = db.addAttachment(created.id, { filename: 'beleg.png', data: png });
			const meta = db.listAttachmentMeta(created.id);
			expect(meta).to.have.lengthOf(1);
			expect(meta[0]).to.not.have.property('data');
			expect(meta[0].id).to.equal(stored.id);
			expect(meta[0].createdAt).to.match(/^\d{4}-\d{2}-\d{2}T/);
			// the backup dump still gets the content
			expect(db.listAttachments(created.id)[0].data.equals(png)).to.equal(true);
		} finally {
			db.close();
		}
	});

	it('deletes an attachment of a draft exactly once', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft());
			const stored = db.addAttachment(created.id, { filename: 'beleg.png', data: png });
			db.deleteAttachment(created.id, stored.id);
			expect(db.countAttachments(created.id)).to.equal(0);
			expect(() => db.deleteAttachment(created.id, stored.id)).to.throw(/not found/i);
		} finally {
			db.close();
		}
	});

	it('refuses attachments on issued invoices and on unknown invoices', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft());
			db.issueDraft(created.id);
			expect(() => db.addAttachment(created.id, { filename: 'a.pdf', data: pdf })).to.throw(/draft/i);
			expect(() => db.deleteAttachment(created.id, 1)).to.throw(/draft/i);
			expect(() => db.addAttachment('nope', { filename: 'a.pdf', data: pdf })).to.throw(/not found/i);
			expect(() => db.deleteAttachment('nope', 1)).to.throw(/not found/i);
		} finally {
			db.close();
		}
	});

	it('enforces the type whitelist, 5 MB and the count limit', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft());
			expect(() => db.addAttachment(created.id, { filename: 'a.txt', data: Buffer.from('Text') })).to.throw(
				/PDF, PNG and JPEG/,
			);
			const tooBig = Buffer.concat([png, Buffer.alloc(ATTACHMENT_MAX_BYTES)]);
			expect(() => db.addAttachment(created.id, { filename: 'gross.png', data: tooBig })).to.throw(/5 MB/);
			for (let i = 0; i < ATTACHMENT_MAX_COUNT; i++) {
				db.addAttachment(created.id, { filename: `anlage-${i}.png`, data: png });
			}
			expect(db.countAttachments(created.id)).to.equal(ATTACHMENT_MAX_COUNT);
			expect(() => db.addAttachment(created.id, { filename: 'elf.png', data: png })).to.throw(/At most 10/);
			// the limit is per invoice, not global
			const other = db.createDraft(draft());
			expect(db.addAttachment(other.id, { filename: 'neu.png', data: png }).id).to.be.greaterThan(0);
		} finally {
			db.close();
		}
	});

	it('drops the attachments together with a deleted draft', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft());
			db.addAttachment(created.id, { filename: 'beleg.png', data: png });
			db.deleteDraft(created.id);
			expect(db.countAttachments(created.id)).to.equal(0);
		} finally {
			db.close();
		}
	});
});

describe('db => quotations (R8)', () => {
	it('numbers quotations in a circle of their own', () => {
		const db = openMemoryDb();
		try {
			expect(db.nextInvoiceNumber(2026)).to.equal('2026-00-001');
			expect(db.nextQuoteNumber(2026)).to.equal('A-2026-00-001');
			expect(db.nextQuoteNumber(2026, 'k7')).to.equal('A-2026-K7-001');
			// issuing a quotation never advances the invoice sequence …
			expect(db.nextInvoiceNumber(2026)).to.equal('2026-00-002');
			// … and every year keeps its own counter
			expect(db.nextQuoteNumber(2027)).to.equal('A-2027-00-001');
		} finally {
			db.close();
		}
	});

	it('honours a custom quotation format and falls back on an unusable one', () => {
		const db = openMemoryDb();
		try {
			expect(db.effectiveQuoteNumberFormat()).to.equal(DEFAULT_QUOTE_NUMBER_FORMAT);
			db.applyOptions({ quoteNumberFormat: 'ANG-{YYYY}-{SEQ}' });
			expect(db.effectiveQuoteNumberFormat()).to.equal('ANG-{YYYY}-{SEQ}');
			expect(db.nextQuoteNumber(2026)).to.equal('ANG-2026-001');
			// a broken format never breaks the series: the default is used
			db.applyOptions({ quoteNumberFormat: '{NOPE}' });
			expect(db.effectiveQuoteNumberFormat()).to.equal(DEFAULT_QUOTE_NUMBER_FORMAT);
			expect(db.nextQuoteNumber(2026)).to.equal('A-2026-00-002');
			// the invoice format is untouched by the quotation setting
			expect(db.effectiveNumberFormat()).to.equal(DEFAULT_NUMBER_FORMAT);
		} finally {
			db.close();
		}
	});

	it('issues a quotation with the default validity and no retention date', () => {
		const db = openMemoryDb();
		try {
			const created = db.createDraft(draft({ docType: 'quote' }));
			expect(created.documentTitle).to.equal('Angebot');
			// "Gültig bis" is only filled once the quotation is issued
			expect(created.validUntil).to.equal(null);

			const issued = db.issueDraft(created.id);
			expect(issued.status).to.equal('issued');
			expect(issued.number).to.match(/^A-2026-00-\d{3}$/);
			expect(issued.validUntil).to.equal('2026-10-28');
			// a quotation is no booking record, so § 147 AO does not apply
			expect(issued.retainUntil).to.equal(null);
			expect(quoteState(issued, '2026-10-28')).to.equal('open');
			expect(quoteState(issued, '2026-10-29')).to.equal('expired');

			// the invoice keeps its retention date as a contrast
			const invoice = db.issueDraft(db.createDraft(draft()).id);
			expect(invoice.retainUntil).to.match(/^\d{4}-\d{2}-\d{2}$/);
			expect(invoice.number).to.equal('2026-00-001');
		} finally {
			db.close();
		}
	});

	it('keeps an explicit validity date and issues without BT-10', () => {
		const db = openMemoryDb();
		try {
			const noCustomerNumber = { ...buyer, customerNumber: undefined };
			// BT-10 is mandatory for the e-invoice, but not for an offer
			const invoiceDraft = db.createDraft(draft({ buyer: noCustomerNumber }));
			expect(() => db.issueDraft(invoiceDraft.id)).to.throw(/customer number/);

			const quote = db.createDraft(
				draft({ docType: 'quote', buyer: noCustomerNumber, validUntil: '2026-10-05' }),
			);
			const issued = db.issueDraft(quote.id);
			expect(issued.validUntil).to.equal('2026-10-05');
			expect(issued.buyer.customerNumber).to.equal(undefined);

			// the validity date is checked like every other date
			const broken = db.createDraft(draft({ docType: 'quote', validUntil: '31.10.2026' }));
			expect(() => db.issueDraft(broken.id)).to.throw(/Valid-until date/);
			const before = db.createDraft(draft({ docType: 'quote', validUntil: '2026-09-01' }));
			expect(() => db.issueDraft(before.id)).to.throw(/must not be before the issue date/);
		} finally {
			db.close();
		}
	});

	it('records the customer decision once and refuses a second one', () => {
		const db = openMemoryDb();
		try {
			const quote = db.createDraft(draft({ docType: 'quote' }));
			// a decision belongs to an issued offer
			expect(() => db.setQuoteDecision(quote.id, 'accepted')).to.throw(/Issue the quotation/);

			const issued = db.issueDraft(quote.id);
			const accepted = db.setQuoteDecision(issued.id, 'accepted', { at: '2026-10-02T09:00:00.000Z' });
			expect(accepted.acceptedAt).to.equal('2026-10-02T09:00:00.000Z');
			expect(accepted.rejectedAt).to.equal(null);
			// an accepted offer stays accepted, even after its validity ended
			expect(quoteState(accepted, '2027-01-01')).to.equal('accepted');
			expect(() => db.setQuoteDecision(issued.id, 'rejected', { reason: 'zu teuer' })).to.throw(
				/already recorded/,
			);

			const rejected = db.setQuoteDecision(
				db.issueDraft(db.createDraft(draft({ docType: 'quote' })).id).id,
				'rejected',
				{ reason: '  zu teuer  ' },
			);
			expect(rejected.rejectionReason).to.equal('zu teuer');
			expect(rejected.acceptedAt).to.equal(null);
			expect(quoteState(rejected, '2026-10-01')).to.equal('rejected');
			expect(() => db.setQuoteDecision(rejected.id, 'accepted')).to.throw(/already recorded/);

			// documents of the other type never carry a decision
			const invoice = db.issueDraft(db.createDraft(draft()).id);
			expect(() => db.setQuoteDecision(invoice.id, 'accepted')).to.throw(/Only a quotation/);
			// an unknown decision and an unknown id are refused up front
			expect(() => db.setQuoteDecision(invoice.id, 'maybe' as unknown as QuoteDecision)).to.throw(
				/Unknown decision/,
			);
			expect(() => db.setQuoteDecision('nope', 'accepted')).to.throw(/not found/);
			expect(() => db.convertQuoteToInvoice(invoice.id)).to.throw(/Only a quotation/);
		} finally {
			db.close();
		}
	});

	it('turns an accepted quotation into an invoice draft and links both', () => {
		const db = openMemoryDb();
		try {
			const quote = db.issueDraft(db.createDraft(draft({ docType: 'quote' })).id);
			// the customer's "Ja" is the paper trail behind the invoice; the API
			// layer asks for it by default, the db only when told to
			expect(() => db.convertQuoteToInvoice(quote.id, {}, { requireAccepted: true })).to.throw(/not accepted/);

			// an offer that was never issued cannot become an invoice
			const draftOffer = db.createDraft(draft({ docType: 'quote' }));
			expect(() => db.convertQuoteToInvoice(draftOffer.id, {}, { requireAccepted: false })).to.throw(
				/Issue the quotation before creating an invoice/,
			);

			const invoice = db.convertQuoteToInvoice(quote.id, { dueDate: '2026-11-12' }, { requireAccepted: false });
			expect(invoice.status).to.equal('draft');
			expect(invoice.docType).to.equal('invoice');
			expect(invoice.documentTitle).to.equal('Rechnung');
			expect(invoice.sourceDocumentId).to.equal(quote.id);
			expect(invoice.number).to.equal(null);
			expect(invoice.lines).to.deep.equal(quote.lines);
			expect(invoice.dueDate).to.equal('2026-11-12');
			expect(invoice.validUntil).to.equal(null);

			// only one open draft per quotation, further invoices may follow later
			expect(() => db.convertQuoteToInvoice(quote.id, {}, { requireAccepted: false })).to.throw(/already exists/);
			const issuedInvoice = db.issueDraft(invoice.id);
			expect(issuedInvoice.number).to.match(/^\d{4}-00-001$/);
			expect(db.convertQuoteToInvoice(quote.id, {}, { requireAccepted: false }).id).to.not.equal(invoice.id);

			// the quotation itself is never edited
			expect(db.getInvoice(quote.id)?.status).to.equal('issued');
			expect(db.getInvoice(quote.id)?.docType).to.equal('quote');
			expect(db.getInvoice(quote.id)?.number).to.equal(quote.number);

			// an accepted quotation converts the same way
			const other = db.issueDraft(db.createDraft(draft({ docType: 'quote' })).id);
			db.setQuoteDecision(other.id, 'accepted');
			const fromAccepted = db.convertQuoteToInvoice(other.id);
			expect(fromAccepted.sourceDocumentId).to.equal(other.id);
			expect(db.listInvoices({ docType: 'quote' }).map(entry => entry.id)).to.contain(other.id);
		} finally {
			db.close();
		}
	});
});
