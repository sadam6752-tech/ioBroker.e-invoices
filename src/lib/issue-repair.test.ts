/**
 * M1: issuing is not atomic (the number is consumed, then the files are made). Two protections:
 * a probe run before the number is taken, and a way to complete a document that was left without files —
 * creating only what is missing.
 */
import { expect } from 'chai';
import { PDFDocument } from 'pdf-lib';
import { InvoiceDatabase } from './db';
import type { InvoiceDraftInput } from './invoice-model';
import {
	issueInvoiceWithArtifacts,
	missingArtifacts,
	repairMissingArtifacts,
	type IssueStorage,
} from './issue-service';
import * as pdfModule from './pdf';

const logger = { info: (): void => undefined, error: (): void => undefined };

const draft: InvoiceDraftInput = {
	seller: {
		name: 'Muster GmbH',
		street: 'Beispielstr. 1',
		zip: '10115',
		city: 'Berlin',
		country: 'DE',
		vatId: 'DE123456789',
	},
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
};

/**
 * File store in memory; `failWrites` makes every write fail like a full disk.
 *
 * @param files - Map acting as the file system.
 * @param failWrites - Refuse all writes.
 */
function store(files: Map<string, Buffer>, failWrites = false): IssueStorage {
	return {
		write: (path: string, data: string | Buffer): Promise<void> => {
			if (failWrites) {
				return Promise.reject(new Error('disk full'));
			}
			files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
			return Promise.resolve();
		},
		read: (path: string): Promise<Buffer> => {
			const found = files.get(path);
			return found ? Promise.resolve(found) : Promise.reject(new Error(`not found: ${path}`));
		},
	};
}

describe('issue => probe before the number (M1)', function () {
	this.timeout(60000);

	it('keeps the draft and the number when the documents cannot be made', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const original = pdfModule.renderInvoicePdf;
		try {
			const created = db.createDraft(draft);
			(pdfModule as { renderInvoicePdf: unknown }).renderInvoicePdf = (): Promise<Buffer> =>
				Promise.reject(new Error('layout defect'));
			let message = '';
			try {
				await issueInvoiceWithArtifacts(db, logger, created.id, store(new Map()));
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message).to.contain('nothing was issued').and.to.contain('layout defect');
			// still a draft, no number taken: the next one is 001
			expect(db.getInvoice(created.id)).to.include({ status: 'draft', number: null });
			(pdfModule as { renderInvoicePdf: unknown }).renderInvoicePdf = original;
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, store(new Map()));
			expect(issued.invoice.number).to.equal('2026-00-001');
		} finally {
			(pdfModule as { renderInvoicePdf: unknown }).renderInvoicePdf = original;
			db.close();
		}
	});
});

describe('issue => completing a document without files (M1)', function () {
	this.timeout(60000);

	it('finds an issued document without files and makes exactly the missing ones', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(draft);
			// the disk refuses everything: the number is consumed, the document stands without files
			let message = '';
			try {
				await issueInvoiceWithArtifacts(db, logger, created.id, store(new Map(), true));
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message).to.contain('numbered but no artifact');
			const stuck = db.getInvoice(created.id)!;
			expect(stuck.status).to.equal('issued');
			expect(missingArtifacts(stuck)).to.have.members(['xml', 'pdf', 'xlsx']);
			expect(db.listIncompleteDocuments().map(item => item.id)).to.deep.equal([created.id]);

			// the disk works again: only the missing files are made, the record does not change
			const files = new Map<string, Buffer>();
			const result = await repairMissingArtifacts(db, logger, created.id, store(files));
			expect(result.created).to.have.members(['xml', 'pdf', 'xlsx']);
			const base = `invoices/2026/${stuck.number}`;
			expect([...files.keys()].sort()).to.deep.equal([`${base}.pdf`, `${base}.xlsx`, `${base}.xml`].sort());
			expect((await PDFDocument.load(files.get(`${base}.pdf`)!)).getPageCount()).to.be.greaterThan(0);
			const after = db.getInvoice(created.id)!;
			expect(after).to.include({
				number: stuck.number,
				status: 'issued',
				pdfPath: `${base}.pdf`,
				xlsxPath: `${base}.xlsx`,
			});
			expect(after.xml).to.contain('CrossIndustryInvoice');
			expect(JSON.stringify(after.totals)).to.equal(JSON.stringify(stuck.totals));
			expect(missingArtifacts(after)).to.deep.equal([]);
			expect(db.listIncompleteDocuments()).to.have.length(0);
			// no render step before, so no archive file was made and nothing was overwritten
			expect([...files.keys()].some(key => key.includes('.orig-'))).to.equal(false);
		} finally {
			db.close();
		}
	});

	it('makes a missing XML from the record and leaves the existing PDF alone', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const files = new Map<string, Buffer>();
			const created = db.createDraft(draft);
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, store(files));
			const pdfBefore = files.get(issued.pdfPath)!;
			// the XML of the record was lost
			(db as unknown as { db: { prepare(sql: string): { run(...a: unknown[]): void } } }).db
				.prepare('UPDATE invoices SET xml = NULL WHERE id = ?')
				.run(created.id);
			expect(missingArtifacts(db.getInvoice(created.id)!)).to.deep.equal(['xml']);
			const result = await repairMissingArtifacts(db, logger, created.id, store(files));
			expect(result.created).to.deep.equal(['xml']);
			expect(db.getInvoice(created.id)!.xml).to.contain('CrossIndustryInvoice');
			// the delivered PDF is the very same file
			expect(files.get(issued.pdfPath)!.equals(pdfBefore)).to.equal(true);
			// nothing left to do: a second run changes nothing
			expect((await repairMissingArtifacts(db, logger, created.id, store(files))).created).to.deep.equal([]);
		} finally {
			db.close();
		}
	});

	it('refuses drafts and unknown documents', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(draft);
			let message = '';
			try {
				await repairMissingArtifacts(db, logger, created.id, store(new Map()));
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message).to.contain('Only issued');
			let missing = '';
			try {
				await repairMissingArtifacts(db, logger, 'gibt-es-nicht', store(new Map()));
			} catch (error) {
				missing = (error as Error).message;
			}
			expect(missing).to.contain('not found');
		} finally {
			db.close();
		}
	});
});

describe('issue => date of an earlier year (N4)', function () {
	this.timeout(60000);

	it('warns in the log when the date is in an earlier year and stays quiet otherwise', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const warnings: string[] = [];
			const loud = {
				info: (): void => undefined,
				error: (): void => undefined,
				warn: (m: string): number => warnings.push(m),
			};
			const old = db.createDraft({ ...draft, issueDate: '2020-05-05', deliveryDate: '2020-05-05' });
			const issued = await issueInvoiceWithArtifacts(db, loud, old.id, store(new Map()));
			expect(issued.invoice.number).to.match(/^2020-/);
			expect(warnings).to.have.length(1);
			expect(warnings[0]).to.contain('earlier year').and.to.contain(issued.invoice.number!);

			const today = new Date().toISOString().slice(0, 10);
			const current = db.createDraft({ ...draft, issueDate: today, deliveryDate: today });
			await issueInvoiceWithArtifacts(db, loud, current.id, store(new Map()));
			expect(warnings).to.have.length(1);
		} finally {
			db.close();
		}
	});
});
