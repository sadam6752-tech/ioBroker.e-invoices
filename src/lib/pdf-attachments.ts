/**
 * Embeds invoice attachments into the hybrid PDF (R4, PDF/A-3b part).
 *
 * A PDF/A-3 may carry files of any type — that is what makes the hybrid format
 * hybrid. The attachments (delivery note, proof of work, order confirmation)
 * are therefore associated files next to the Factur-X XML:
 *
 * - one `/Filespec` per file in `Names → EmbeddedFiles` and in the catalogue's
 *   `/AF` array (ISO 19005-3 § 6.8 asks for the name tree, PDF 2.0 § 14.13 for
 *   the associated-files entry next to the `/AFRelationship`)
 * - `/AFRelationship /Data`: the file carries content that belongs to the
 *   invoice. It is not an alternative representation (`/Alternative` is the
 *   XML) and not a supplement in the sense of a signature.
 * - MIME type and filename come from the stored record, so the customer finds
 *   the file under the name it was uploaded with.
 *
 * The caller embeds **before** `embedHybridPdf` runs: `pdf-lib` appends to the
 * existing `/AF` array and name tree, and the Factur-X step stays the last
 * writer — it is the one that guarantees the XMP packet, the output intent and
 * the trailer `/ID` that PDF/A-3b requires.
 */
import { AFRelationship, PDFDocument } from 'pdf-lib';

/** One attachment on its way into the PDF container. */
export interface PdfAttachment {
	/** Filename as it is stored (already sanitized by `attachments.ts`). */
	filename: string;
	/** MIME type taken from the content (magic bytes). */
	mime: string;
	/** File content. */
	data: Buffer;
}

/**
 * Relationship of an attachment to the document (ISO 19005-3 / PDF 2.0).
 * `/Data` is what a supporting document is: content, not a replacement.
 */
export const ATTACHMENT_AF_RELATIONSHIP = AFRelationship.Data;

/** Hint under the attachment directory in the sight component. */
export const ATTACHMENT_EMBED_HINT = 'Die Anlagen sind in dieser Datei eingebettet (PDF/A-3) und kein externer Link.';

/**
 * Hint under the attachment directory of a document that is not a PDF/A
 * container (R8: a quotation ships as a plain PDF, its files travel separately).
 */
export const ATTACHMENT_SEPARATE_HINT = 'Die Anlagen liegen diesem Dokument separat bei.';

/** Display label per accepted MIME type. */
const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
	'application/pdf': 'PDF',
	'image/png': 'PNG',
	'image/jpeg': 'JPEG',
};

/**
 * Human readable type label for the sight component.
 *
 * @param mime - MIME type as stored.
 */
export function attachmentTypeLabel(mime: string): string {
	return ATTACHMENT_TYPE_LABELS[mime] ?? mime;
}

/**
 * Formats a file size the way a reader expects it (kB below one MB).
 *
 * @param bytes - Size in bytes.
 */
export function formatFileSize(bytes: number): string {
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
	}
	return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/**
 * Description of one associated file (shown in the attachment panel).
 *
 * @param filename - Stored filename.
 */
export function attachmentDescription(filename: string): string {
	return `Anlage zur Rechnung: ${filename}`;
}

/**
 * Adds the attachments to a sight PDF as associated files.
 *
 * Without attachments the input is returned untouched: an invoice without
 * Anlagen must not go through an extra PDF round-trip that could change bytes
 * nobody asked to change.
 *
 * @param pdfBytes - Sight PDF (e.g. from renderInvoicePdf).
 * @param attachments - Attachments including their content.
 * @returns PDF bytes with the files embedded.
 */
export async function embedPdfAttachments(
	pdfBytes: Buffer | Uint8Array,
	attachments: PdfAttachment[],
): Promise<Uint8Array> {
	if (attachments.length === 0) {
		return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
	}
	const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false });
	for (const attachment of attachments) {
		await doc.attach(attachment.data, attachment.filename, {
			mimeType: attachment.mime,
			description: attachmentDescription(attachment.filename),
			afRelationship: ATTACHMENT_AF_RELATIONSHIP,
		});
	}
	return doc.save();
}
