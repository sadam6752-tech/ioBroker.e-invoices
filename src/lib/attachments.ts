/**
 * Rules for invoice attachments (R4).
 *
 * Everything a customer sends along with an invoice — delivery note, proof of
 * work, order confirmation — belongs to the record, is stored in the database
 * and later embedded into the hybrid PDF/XML. So the rules have to hold before
 * the first byte reaches the database:
 *
 * - whitelist only (PDF, PNG, JPEG), 5 MB per file, 10 files per invoice
 * - the MIME type comes from the **content** (magic bytes), never from the
 *   client: a `.pdf` that really is a ZIP must not be stored as
 *   `application/pdf` and later be handed to the PDF/A-3b writer
 * - the filename is reduced to what is safe in a `Content-Disposition` header,
 *   a ZIP entry and a PDF name tree
 *
 * The module is pure (no database, no filesystem), so the API layer and the
 * persistence layer share exactly one rule set.
 */

/** Largest accepted attachment (5 MB). */
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

/** Most attachments one invoice may carry. */
export const ATTACHMENT_MAX_COUNT = 10;

/** Accepted content type: MIME type, extensions and magic-byte check. */
export interface AttachmentType {
	/** MIME type as it is stored and sent back on download. */
	mime: string;
	/** Accepted filename extensions, without the dot. */
	extensions: string[];
	/**
	 * Decides from the leading bytes whether the content is this type.
	 *
	 * @param data - Uploaded content.
	 */
	sniff(data: Buffer): boolean;
}

/**
 * Whitelist of accepted attachments. The order matters: the first match wins,
 * and the types do not overlap.
 */
export const ATTACHMENT_TYPES: AttachmentType[] = [
	{
		mime: 'application/pdf',
		extensions: ['pdf'],
		sniff: data => data.length >= 5 && data.subarray(0, 5).toString('latin1') === '%PDF-',
	},
	{
		mime: 'image/png',
		extensions: ['png'],
		sniff: data => data.length >= 8 && data.readUInt32BE(0) === 0x89504e47 && data.readUInt32BE(4) === 0x0d0a1a0a,
	},
	{
		mime: 'image/jpeg',
		extensions: ['jpg', 'jpeg'],
		sniff: data => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
	},
];

/** Everything the UI may declare about an attachment. */
export interface AttachmentInput {
	/** Original filename from the client. */
	filename: string;
	/** Client-declared MIME type; may be missing or generic. */
	mime?: string;
	/** Uploaded content. */
	data: Buffer;
}

/** Outcome of the rule check. */
export type AttachmentCheck = { ok: true; filename: string; mime: string } | { ok: false; error: string };

/**
 * Detects the content type from the leading bytes.
 *
 * @param data - Uploaded content.
 * @returns Matching whitelist entry, or undefined for unknown content.
 */
export function sniffAttachmentType(data: Buffer): AttachmentType | undefined {
	return ATTACHMENT_TYPES.find(type => type.sniff(data));
}

/**
 * Extracts the filename extension, lowercased and without the dot.
 *
 * @param filename - Filename with or without extension.
 */
export function attachmentExtension(filename: string): string {
	const dot = filename.lastIndexOf('.');
	return dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

/**
 * Reduces a filename to something that is safe in an HTTP header, a ZIP entry
 * and a PDF name tree — and still looks like the original name.
 *
 * @param filename - Filename as sent by the client.
 * @returns Sanitized filename, possibly empty when nothing usable is left.
 */
export function sanitizeAttachmentFilename(filename: string): string {
	// Clients may send a full path (Windows and POSIX); only the base name is
	// relevant, and `..` must never survive.
	const base = filename.split('\\').pop()?.split('/').pop() ?? '';
	const cleaned = [...base]
		// control characters, including CR/LF, would break the header
		.filter(char => {
			const code = char.codePointAt(0) ?? 0;
			return code > 0x1f && code !== 0x7f;
		})
		.join('')
		// characters that are unsafe in headers, paths and PDF names
		.replace(/["<>|:*?]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	const dot = cleaned.lastIndexOf('.');
	const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
	const extension = dot > 0 ? cleaned.slice(dot, dot + 11) : '';
	// The extension is cut last: a long name must not swallow the `.pdf` that
	// the whitelist check depends on.
	return `${stem.trim().slice(0, 100).trim()}${extension}`;
}

/**
 * Applies all attachment rules at once: filename, size, content type and the
 * agreement between extension, declared type and content.
 *
 * @param input - Filename, declared MIME type and content.
 * @returns The sanitized filename plus the type taken from the content, or the
 *          reason why the attachment is rejected.
 */
export function checkAttachment(input: AttachmentInput): AttachmentCheck {
	const filename = sanitizeAttachmentFilename(input.filename);
	if (filename.length === 0) {
		return { ok: false, error: 'Attachment needs a filename' };
	}
	if (input.data.length === 0) {
		return { ok: false, error: 'Attachment needs content' };
	}
	if (input.data.length > ATTACHMENT_MAX_BYTES) {
		return { ok: false, error: `Attachment exceeds ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB` };
	}
	const type = sniffAttachmentType(input.data);
	if (!type) {
		return { ok: false, error: 'Only PDF, PNG and JPEG attachments are supported' };
	}
	const extension = attachmentExtension(filename);
	if (extension.length === 0) {
		return { ok: false, error: 'Attachment filename needs an extension (.pdf, .png, .jpg or .jpeg)' };
	}
	if (!type.extensions.includes(extension)) {
		return { ok: false, error: `File extension .${extension} does not match the content (${type.mime})` };
	}
	const declared = (input.mime ?? '').trim().toLowerCase();
	// `application/octet-stream` is what a browser sends when it does not know
	// the type, so it counts as "no type declared".
	if (declared.length > 0 && declared !== 'application/octet-stream' && declared !== type.mime) {
		return { ok: false, error: `Declared type ${declared} does not match the content (${type.mime})` };
	}
	return { ok: true, filename, mime: type.mime };
}

/**
 * Builds the `Content-Disposition` value for a download (RFC 6266): an ASCII
 * fallback for old clients plus the real name as RFC 5987 `filename*`.
 *
 * @param filename - Stored attachment filename.
 * @param disposition - `attachment` (download) or `inline` (show in browser).
 */
export function attachmentDisposition(filename: string, disposition: 'attachment' | 'inline' = 'attachment'): string {
	const ascii = filename
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/Ä/g, 'Ae')
		.replace(/Ö/g, 'Oe')
		.replace(/Ü/g, 'Ue')
		.replace(/ß/g, 'ss')
		.replace(/[^\x20-\x7e]/g, '_')
		.replace(/["\\]/g, '_');
	return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
