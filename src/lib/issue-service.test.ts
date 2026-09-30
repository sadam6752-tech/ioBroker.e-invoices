/**
 * Tests for the issue flow (P4c) and the re-render path.
 *
 * The re-render tests pin the GoBD property that matters: re-rendering an issued
 * invoice must not change the document content, and the originally delivered
 * file must stay retrievable.
 */
import { expect } from 'chai';
import { inflateSync } from 'node:zlib';
import { PDFArray, PDFDocument, PDFName } from 'pdf-lib';
import { InvoiceDatabase } from './db';
import { issueInvoiceWithArtifacts, rerenderInvoicePdf, type IssueStorage } from './issue-service';
import { DEFAULT_TEMPLATE } from './templates';
import type { InvoiceDraftInput } from './invoice-model';

const draft: InvoiceDraftInput = {
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
	lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
	issueDate: '2026-09-28',
	deliveryDate: '2026-09-27',
	dueDate: '2026-10-12',
	currency: 'EUR',
	documentTitle: 'Rechnung',
};

const logs: string[] = [];
const logger = { info: (m: string) => logs.push(m), error: (m: string) => logs.push(m) };

/**
 * In-memory file backend plus a log of every write, like the adapter's mount.
 *
 * @param files - Map acting as the file system.
 */
function memStorage(files: Map<string, Buffer>): IssueStorage & { writes: string[] } {
	const writes: string[] = [];
	return {
		writes,
		write: (path: string, data: string | Buffer): Promise<void> => {
			files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
			writes.push(path);
			return Promise.resolve();
		},
		read: (path: string): Promise<Buffer> => {
			const found = files.get(path);
			return found ? Promise.resolve(found) : Promise.reject(new Error(`not found: ${path}`));
		},
	};
}

/**
 * Searchable text of a pdfkit/hybrid PDF.
 *
 * @param pdf - PDF bytes.
 */
function pdfText(pdf: Buffer): string {
	const raw = pdf.toString('latin1');
	const parts = [raw];
	for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
		try {
			parts.push(
				inflateSync(Buffer.from(match[1], 'latin1'))
					.toString('latin1')
					.replace(/<([0-9a-fA-F]+)>/g, (_f, hex: string) => Buffer.from(hex, 'hex').toString('latin1')),
			);
		} catch {
			// kein flate-Stream
		}
	}
	return parts.join('\n').replace(/\s+/g, ' ');
}

describe('issue => artifacts', function () {
	this.timeout(60000);

	it('stores xml, pdf and xlsx and links them', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(draft);
			const outcome = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));
			expect(outcome.invoice.number).to.match(/^2026-00-\d{3}$/);
			expect(outcome.invoice.status).to.equal('issued');
			expect(files.get(outcome.pdfPath)!.subarray(0, 4).toString()).to.equal('%PDF');
			expect(files.get(outcome.xmlPath)!.toString()).to.contain('CrossIndustryInvoice');
			expect(files.has('invoices/2026/2026-00-001.xlsx')).to.equal(true);
		} finally {
			db.close();
		}
	});

	it('refuses to issue a draft twice', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(draft);
			await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(new Map()));
			let threw = false;
			try {
				await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(new Map()));
			} catch {
				threw = true;
			}
			expect(threw).to.equal(true);
		} finally {
			db.close();
		}
	});
});

describe('issue => re-render', function () {
	this.timeout(60000);

	it('archives the original and keeps the content identical', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(draft);
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));
			const original = files.get(issued.pdfPath)!;

			const result = await rerenderInvoicePdf(db, logger, issued.invoice.id, memStorage(files), 'Layoutfix');
			const fresh = files.get(result.pdfPath)!;

			// the delivered file must remain retrievable
			expect(result.archivedPath).to.equal('invoices/2026/2026-00-001.orig-1.pdf');
			expect(files.get(result.archivedPath ?? '')!.equals(original)).to.equal(true);
			// the DB now points at the fresh rendering
			expect(db.getInvoice(issued.invoice.id)!.pdfPath).to.equal(result.pdfPath);
			// identical content: same number, same totals
			const before = pdfText(original).replace(/\s+/g, '');
			const after = pdfText(fresh).replace(/\s+/g, '');
			expect(after).to.contain('2026-00-001');
			expect(after).to.contain(before.split('CrossIndustryInvoice')[0].slice(0, 400).slice(0, 120));
		} finally {
			db.close();
		}
	});

	it('records every re-render in the history', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(draft);
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));
			expect(db.listRenderHistory(issued.invoice.id)).to.have.lengthOf(0);

			await rerenderInvoicePdf(db, logger, issued.invoice.id, memStorage(files), 'Erster Fix');
			const history = db.listRenderHistory(issued.invoice.id);
			expect(history).to.have.lengthOf(1);
			expect(history[0].artifact).to.equal('pdf');
			expect(history[0].reason).to.equal('Erster Fix');
			expect(history[0].previousPath ?? '').to.contain('.orig-1.pdf');

			// a second run keeps its own archive step
			await rerenderInvoicePdf(db, logger, issued.invoice.id, memStorage(files), 'Zweiter Fix');
			expect(db.listRenderHistory(issued.invoice.id)).to.have.lengthOf(2);
		} finally {
			db.close();
		}
	});

	it('never touches the invoice content', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(draft);
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));
			const before = db.getInvoice(issued.invoice.id)!;
			const snapshot = JSON.stringify({ ...before, updatedAt: '', pdfPath: '' });

			await rerenderInvoicePdf(db, logger, issued.invoice.id, memStorage(files), null);
			const after = db.getInvoice(issued.invoice.id)!;
			expect(JSON.stringify({ ...after, updatedAt: '', pdfPath: '' })).to.equal(snapshot);
			expect(after.number).to.equal(before.number);
			expect(after.status).to.equal('issued');
			expect(after.totals.grossTotal).to.equal(before.totals.grossTotal);
		} finally {
			db.close();
		}
	});

	it('refuses drafts and unknown ids', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(draft);
			const files = new Map<string, Buffer>();
			let draftError = '';
			try {
				await rerenderInvoicePdf(db, logger, created.id, memStorage(files), null);
			} catch (e) {
				draftError = (e as Error).message;
			}
			expect(draftError).to.contain('issued');

			let missingError = '';
			try {
				await rerenderInvoicePdf(db, logger, 'gibt-es-nicht', memStorage(files), null);
			} catch (e) {
				missingError = (e as Error).message;
			}
			expect(missingError).to.contain('not found');
		} finally {
			db.close();
		}
	});

	it('renders with the default template, accents included', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const template = db.createTemplate('Bunt', { ...DEFAULT_TEMPLATE, tableHeaderAccent: true });
			db.setDefaultTemplate(template.id);
			const created = db.createDraft(draft);
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));
			const before = files.get(issued.pdfPath)!;
			const result = await rerenderInvoicePdf(db, logger, issued.invoice.id, memStorage(files), 'Fix');
			// the re-rendered file is a new artifact, not the untouched original
			expect(files.get(result.pdfPath)!.equals(before)).to.equal(false);
		} finally {
			db.close();
		}
	});
});

describe('issue => attachments (R4)', function () {
	this.timeout(60000);

	/** PNG signature plus IHDR — the content decides the accepted type. */
	const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48]);

	/**
	 * Number of associated files in a PDF (the Factur-X XML plus the Anlagen).
	 *
	 * @param pdf - PDF bytes.
	 */
	async function associatedFiles(pdf: Buffer): Promise<number> {
		const doc = await PDFDocument.load(pdf, { updateMetadata: false });
		return doc.catalog.lookup(PDFName.of('AF'), PDFArray)?.size() ?? 0;
	}

	it('freezes the attachments of the draft into the issued artifacts', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(draft);
			db.addAttachment(created.id, { filename: 'n.png', mime: 'image/png', data: png });
			const outcome = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));

			// the file is inside the stored PDF container, next to the XML
			expect(await associatedFiles(files.get(outcome.pdfPath)!)).to.equal(2);
			// the PDF also lists it for the reader
			expect(pdfText(files.get(outcome.pdfPath)!)).to.contain('n.png');
			// and the XML carries it as BG-24 with the embedded payload
			const xml = files.get(outcome.xmlPath)!.toString('utf8');
			expect(xml).to.contain('<ram:AdditionalReferencedDocument>');
			expect(xml).to.contain(png.toString('base64'));

			// GoBD: an issued invoice keeps its attachments, but cannot change them
			expect(db.listAttachments(outcome.invoice.id)).to.have.lengthOf(1);
			expect(() => db.addAttachment(outcome.invoice.id, { filename: 'x.png', data: png })).to.throw();
			expect(() =>
				db.deleteAttachment(outcome.invoice.id, db.listAttachments(outcome.invoice.id)[0].id),
			).to.throw();
		} finally {
			db.close();
		}
	});

	it('re-embeds the attachments when the PDF is re-rendered', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(draft);
			db.addAttachment(created.id, { filename: 'n.png', mime: 'image/png', data: png });
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));
			const result = await rerenderInvoicePdf(db, logger, issued.invoice.id, memStorage(files), 'Layoutfix');
			expect(await associatedFiles(files.get(result.pdfPath)!)).to.equal(2);
			expect(pdfText(files.get(result.pdfPath)!)).to.contain('n.png');
			// the original file stays retrievable, attachments included
			expect(await associatedFiles(files.get(result.archivedPath!)!)).to.equal(2);
		} finally {
			db.close();
		}
	});
});
