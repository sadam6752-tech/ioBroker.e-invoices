/**
 * R4 tests: attachments inside the PDF container (PDF/A-3b).
 *
 * `pdf-lib` has no reader for embedded files, so the tests walk the structure a
 * checker walks: catalogue → `Names` → `EmbeddedFiles` → name tree. What is
 * asserted is exactly what PDF/A-3 and the Factur-X specification require —
 * a file specification with `/F`, `/UF`, `/Desc`, `/AFRelationship` and the
 * matching entry in the catalogue's `/AF` array.
 */
import { extractXml } from '@stackforge-eu/factur-x';
import type { PDFRawStream } from 'pdf-lib';
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib';
import { expect } from 'chai';
import { inflateSync } from 'node:zlib';
import { InvoiceDatabase, type StoredInvoice } from './db';
import { renderInvoicePdf } from './pdf';
import { embedHybridPdf, generateInvoiceXml } from './zugferd';
import {
	ATTACHMENT_AF_RELATIONSHIP,
	attachmentDescription,
	attachmentTypeLabel,
	embedPdfAttachments,
	formatFileSize,
	type PdfAttachment,
} from './pdf-attachments';
import type { InvoiceDraftInput } from './invoice-model';

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
	documentTitle: 'Rechnung',
};

/** Minimal PNG (signature + IHDR) — the content decides the type. */
const pngData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48]);

/** Small but real PDF body (the content must start with the magic bytes). */
const pdfData = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'latin1');

/** One file as it was read back out of the PDF container. */
interface ReadEmbeddedFile {
	/** Name in the `EmbeddedFiles` name tree. */
	name: string;
	/** `/Subtype` of the file stream, i.e. the MIME type. */
	mimeType: string;
	/** `/AFRelationship` of the file specification. */
	afRelationship: string;
	/** `/Desc` of the file specification. */
	description: string;
	/** `/UF` (or `/F`) of the file specification. */
	fileName: string;
	/** Decoded content. */
	data: Buffer;
}

/**
 * Text of a PDF name/string object, empty for anything else.
 *
 * @param value - Object taken from a PDF dictionary.
 */
function textOf(value: unknown): string {
	if (value instanceof PDFName || value instanceof PDFString || value instanceof PDFHexString) {
		return value.decodeText();
	}
	return '';
}

/**
 * Content of a file stream (pdf-lib writes them with FlateDecode).
 *
 * @param stream - Stream from the file specification's `/EF` dictionary.
 */
function streamBytes(stream: PDFRawStream): Buffer {
	const raw = Buffer.from(stream.contents);
	try {
		return inflateSync(raw);
	} catch {
		return raw;
	}
}

/**
 * Reads the embedded files of a PDF through the name tree.
 *
 * @param bytes - PDF bytes.
 */
async function readEmbeddedFiles(bytes: Uint8Array): Promise<ReadEmbeddedFile[]> {
	const doc = await PDFDocument.load(bytes, { updateMetadata: false });
	const names = doc.catalog.lookup(PDFName.of('Names'), PDFDict);
	const tree = names?.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
	const list = tree?.lookup(PDFName.of('Names'), PDFArray);
	if (!list) {
		return [];
	}
	const files: ReadEmbeddedFile[] = [];
	for (let index = 0; index + 1 < list.size(); index += 2) {
		const spec = list.lookup(index + 1, PDFDict);
		const stream = spec?.lookup(PDFName.of('EF'), PDFDict)?.lookup(PDFName.of('F')) as PDFRawStream | undefined;
		if (!spec || !stream) {
			continue;
		}
		files.push({
			name: textOf(list.get(index)),
			mimeType: textOf(stream.dict.get(PDFName.of('Subtype'))),
			afRelationship: textOf(spec.get(PDFName.of('AFRelationship'))),
			description: textOf(spec.get(PDFName.of('Desc'))),
			fileName: textOf(spec.get(PDFName.of('UF'))) || textOf(spec.get(PDFName.of('F'))),
			data: streamBytes(stream),
		});
	}
	return files;
}

/**
 * Number of entries in the catalogue's associated-files array.
 *
 * @param bytes - PDF bytes.
 */
async function associatedFileCount(bytes: Uint8Array): Promise<number> {
	const doc = await PDFDocument.load(bytes, { updateMetadata: false });
	return doc.catalog.lookup(PDFName.of('AF'), PDFArray)?.size() ?? 0;
}

/**
 * Builds a hybrid PDF for an issued invoice with the given attachments.
 *
 * @param attachments - Attachments to embed.
 */
async function hybridWith(attachments: PdfAttachment[]): Promise<{ hybrid: Buffer; invoice: StoredInvoice }> {
	const db = new InvoiceDatabase(':memory:');
	db.migrate();
	try {
		const created = db.createDraft(draft);
		for (const attachment of attachments) {
			db.addAttachment(created.id, {
				filename: attachment.filename,
				mime: attachment.mime,
				data: attachment.data,
			});
		}
		const invoice = db.issueDraft(created.id);
		const stored = db.listAttachments(invoice.id);
		const { xml } = await generateInvoiceXml(invoice, stored);
		const sight = await renderInvoicePdf(invoice, undefined, undefined, { attachments: stored });
		const hybrid = await embedHybridPdf(
			await embedPdfAttachments(sight, stored),
			xml,
			invoice.profile,
			`Rechnung ${invoice.number}`,
		);
		return { hybrid: Buffer.from(hybrid), invoice };
	} finally {
		db.close();
	}
}

describe('pdf => embedded attachments (R4)', function () {
	this.timeout(60000);

	it('embeds every attachment next to the Factur-X XML', async () => {
		const { hybrid } = await hybridWith([
			{ filename: 'Lieferschein.pdf', mime: 'application/pdf', data: pdfData },
			{ filename: 'Foto.png', mime: 'image/png', data: pngData },
		]);

		const files = await readEmbeddedFiles(hybrid);
		const names = files.map(file => file.name);
		// the XML first (the library attaches it), then the Anlagen
		expect(names).to.include('Lieferschein.pdf');
		expect(names).to.include('Foto.png');
		expect(names.some(name => name.toLowerCase().endsWith('.xml'))).to.equal(true);

		const note = files.find(file => file.name === 'Lieferschein.pdf');
		expect(note?.mimeType).to.equal('application/pdf');
		expect(note?.afRelationship).to.equal('Data');
		expect(note?.fileName).to.equal('Lieferschein.pdf');
		expect(note?.description).to.contain('Lieferschein.pdf');
		expect(note?.data.equals(pdfData)).to.equal(true);

		const photo = files.find(file => file.name === 'Foto.png');
		expect(photo?.mimeType).to.equal('image/png');
		expect(photo?.afRelationship).to.equal('Data');
		expect(photo?.data.equals(pngData)).to.equal(true);

		// the XML stays the alternative representation and stays readable
		const xmlFile = files.find(file => file.name.toLowerCase().endsWith('.xml'));
		expect(xmlFile?.afRelationship).to.equal('Alternative');
		expect((await extractXml(hybrid)).xml).to.contain('CrossIndustryInvoice');

		// PDF/A-3 § 6.8: every associated file also sits in the catalogue's /AF
		expect(await associatedFileCount(hybrid)).to.equal(files.length);
	});

	it('keeps an umlaut filename intact in the name tree', async () => {
		const { hybrid } = await hybridWith([
			{ filename: 'Pruefbericht Größe.pdf', mime: 'application/pdf', data: pdfData },
		]);
		const files = await readEmbeddedFiles(hybrid);
		const report = files.find(file => file.name.startsWith('Pruefbericht'));
		expect(report?.name).to.equal('Pruefbericht Größe.pdf');
		expect(report?.fileName).to.equal('Pruefbericht Größe.pdf');
	});

	it('leaves a PDF without attachments byte for byte alone', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(draft);
			const invoice = db.issueDraft(created.id);
			const sight = await renderInvoicePdf(invoice);
			const unchanged = Buffer.from(await embedPdfAttachments(sight, []));
			expect(unchanged.equals(sight)).to.equal(true);
		} finally {
			db.close();
		}
	});

	it('names the relation, the description and the size for the reader', () => {
		expect(ATTACHMENT_AF_RELATIONSHIP).to.equal('Data');
		expect(attachmentTypeLabel('application/pdf')).to.equal('PDF');
		expect(attachmentTypeLabel('image/jpeg')).to.equal('JPEG');
		expect(attachmentTypeLabel('application/zip')).to.equal('application/zip');
		expect(attachmentDescription('Anlage.pdf')).to.equal('Anlage zur Rechnung: Anlage.pdf');
		expect(formatFileSize(512)).to.equal('1 kB');
		expect(formatFileSize(2048)).to.equal('2 kB');
		expect(formatFileSize(5 * 1024 * 1024)).to.equal('5,0 MB');
	});
});
