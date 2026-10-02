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
import {
	collectReminderCandidates,
	issueInvoiceWithArtifacts,
	rerenderInvoicePdf,
	type IssueStorage,
} from './issue-service';
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
			expect(files.get(outcome.xmlPath!)!.toString()).to.contain('CrossIndustryInvoice');
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

	it('never overwrites an archive and keeps the issued XML (H1)', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(draft);
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));
			const original = Buffer.from(files.get(issued.pdfPath)!);
			const xmlBefore = db.getInvoice(issued.invoice.id)!.xml;
			const xmlFile = Buffer.from(files.get(issued.xmlPath!)!);

			const first = await rerenderInvoicePdf(db, logger, issued.invoice.id, memStorage(files), 'eins');
			const second = await rerenderInvoicePdf(db, logger, issued.invoice.id, memStorage(files), 'zwei');

			expect(first.archivedPath).to.match(/\.orig-1\.pdf$/);
			expect(second.archivedPath).to.match(/\.orig-2\.pdf$/);
			// the delivered original survives the second run
			expect(files.get(first.archivedPath!)!.equals(original)).to.equal(true);
			// XML in DB and on disk stays exactly as issued
			expect(db.getInvoice(issued.invoice.id)!.xml).to.equal(xmlBefore);
			expect(files.get(issued.xmlPath!)!.equals(xmlFile)).to.equal(true);
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
			const xml = files.get(outcome.xmlPath!)!.toString('utf8');
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

describe('issue => quotations (R8)', function () {
	this.timeout(60000);

	/** PNG signature plus IHDR — the content decides the accepted type. */
	const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48]);

	const quote: InvoiceDraftInput = {
		...draft,
		docType: 'quote',
		documentTitle: 'Angebot',
		validUntil: '2026-10-28',
	};

	/**
	 * Number of associated files in a PDF (the Factur-X XML plus the Anlagen).
	 *
	 * @param pdf - PDF bytes.
	 */
	async function associatedFiles(pdf: Buffer): Promise<number> {
		const doc = await PDFDocument.load(pdf, { updateMetadata: false });
		return doc.catalog.lookupMaybe(PDFName.of('AF'), PDFArray)?.size() ?? 0;
	}

	it('issues a quotation as a plain sight PDF without XML', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(quote);
			const storage = memStorage(files);
			const outcome = await issueInvoiceWithArtifacts(db, logger, created.id, storage);

			// its own number circle and no XML artifact at all (R8)
			expect(outcome.invoice.number).to.equal('A-2026-00-001');
			expect(outcome.xmlPath).to.equal(null);
			expect(outcome.invoice.xml).to.equal(null);
			expect(outcome.invoice.validUntil).to.equal('2026-10-28');
			expect(storage.writes).to.deep.equal([
				'invoices/2026/A-2026-00-001.pdf',
				'invoices/2026/A-2026-00-001.xlsx',
			]);

			const pdf = files.get(outcome.pdfPath)!;
			expect(pdf.subarray(0, 4).toString()).to.equal('%PDF');
			expect(await associatedFiles(pdf)).to.equal(0);
			expect(pdf.toString('latin1')).to.not.contain('CrossIndustryInvoice');
			// the file is titled as an offer, not as a hybrid e-invoice
			expect(pdfText(pdf)).to.contain('Angebot');
			expect(logs.join('\n')).to.contain('Quotation issued: A-2026-00-001');
		} finally {
			db.close();
		}
	});

	it('lists attachments of a quotation instead of embedding them', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(quote);
			db.addAttachment(created.id, { filename: 'n.png', mime: 'image/png', data: png });
			const outcome = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));

			// R8: no PDF/A-3 container and no BG-24 — the file travels beside the PDF
			const pdf = files.get(outcome.pdfPath)!;
			expect(await associatedFiles(pdf)).to.equal(0);
			// nothing is embedded: the Anlagenverzeichnis is plain page text only
			expect(pdf.toString('latin1')).to.not.contain('n.png');
			expect(db.listAttachments(outcome.invoice.id)).to.have.lengthOf(1);
		} finally {
			db.close();
		}
	});

	it('documents the decision of an offer without changing its artifacts', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		try {
			const created = db.createDraft(quote);
			const issued = await issueInvoiceWithArtifacts(db, logger, created.id, memStorage(files));
			db.setQuoteDecision(issued.invoice.id, 'accepted', { at: '2026-10-02T09:00:00.000Z' });
			const accepted = await rerenderInvoicePdf(
				db,
				logger,
				issued.invoice.id,
				memStorage(files),
				'Kunde hat zugesagt',
			);

			// a re-render of a sight PDF must not invent an XML either
			expect(accepted.invoice.xml).to.equal(null);
			expect(files.has('invoices/2026/A-2026-00-001.xml')).to.equal(false);
			// the original stays retrievable and the reason is on record
			expect(files.has('invoices/2026/A-2026-00-001.orig-1.pdf')).to.equal(true);
			expect(db.listRenderHistory(issued.invoice.id)[0].reason).to.equal('Kunde hat zugesagt');
			expect(accepted.invoice.acceptedAt).to.equal('2026-10-02T09:00:00.000Z');

			const refusedDraft = db.createDraft({ ...quote, issueDate: '2026-10-05' });
			const refused = await issueInvoiceWithArtifacts(db, logger, refusedDraft.id, memStorage(files));
			db.setQuoteDecision(refused.invoice.id, 'rejected', {
				at: '2026-10-06T09:00:00.000Z',
				reason: 'zu teuer',
			});
			const rejected = await rerenderInvoicePdf(db, logger, refused.invoice.id, memStorage(files), null);
			// the refused offer keeps its number, its validity and its plain PDF
			expect(rejected.invoice.number).to.equal('A-2026-00-002');
			expect(rejected.invoice.validUntil).to.equal('2026-10-28');
			expect(rejected.invoice.rejectionReason).to.equal('zu teuer');
			expect(rejected.invoice.rejectedAt).to.equal('2026-10-06T09:00:00.000Z');
			expect(await associatedFiles(files.get(rejected.pdfPath)!)).to.equal(0);
		} finally {
			db.close();
		}
	});

	it('never chases a quotation and links it to the invoice it produced', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			// a quotation can carry a due date, but it is not a debt
			const overdue = { ...quote, dueDate: '2026-01-05' };
			const quoteId = db.createDraft(overdue).id;
			const invoiceId = db.createDraft({ ...draft, dueDate: '2026-01-05' }).id;
			await issueInvoiceWithArtifacts(db, logger, quoteId, memStorage(new Map()));
			await issueInvoiceWithArtifacts(db, logger, invoiceId, memStorage(new Map()));

			const candidates = collectReminderCandidates(db, '2026-09-28');
			expect(candidates.map(candidate => candidate.invoice.docType)).to.deep.equal(['invoice']);

			// the chain Angebot -> Rechnung that the PDFs print is the stored link
			const converted = db.convertQuoteToInvoice(quoteId, {}, { requireAccepted: false });
			const issuedConverted = await issueInvoiceWithArtifacts(db, logger, converted.id, memStorage(new Map()));
			expect(issuedConverted.invoice.sourceDocumentId).to.equal(quoteId);
			const children = db.listInvoices({ sourceDocumentId: quoteId });
			expect(children.map(child => child.number)).to.deep.equal(['2026-00-002']);
			// and the offer itself is still the offer
			expect(db.getInvoice(quoteId)?.docType).to.equal('quote');
			expect(db.getInvoice(quoteId)?.number).to.equal('A-2026-00-001');
		} finally {
			db.close();
		}
	});
});
