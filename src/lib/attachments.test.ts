/**
 * Unit tests for the attachment rules (R4).
 *
 * These tests do not need a database: the rules decide what may be stored at
 * all, and both the API layer and the persistence layer call exactly these
 * functions — so one green run covers both entry points.
 */
import { expect } from 'chai';
import {
	attachmentDisposition,
	attachmentExtension,
	checkAttachment,
	sanitizeAttachmentFilename,
	sniffAttachmentType,
	ATTACHMENT_MAX_BYTES,
	ATTACHMENT_MAX_COUNT,
} from './attachments';

/** Minimal PDF: the signature is all the sniffer looks at. */
const pdfBytes = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');
/** Minimal PNG: signature plus IHDR magic. */
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
/** Minimal JPEG: SOI plus an APP0 marker byte. */
const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
/** ZIP header — the classic "renamed to .pdf" file. */
const zipBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

describe('attachments => content detection', () => {
	it('detects the three whitelisted types by their magic bytes', () => {
		expect(sniffAttachmentType(pdfBytes)?.mime).to.equal('application/pdf');
		expect(sniffAttachmentType(pngBytes)?.mime).to.equal('image/png');
		expect(sniffAttachmentType(jpegBytes)?.mime).to.equal('image/jpeg');
	});

	it('rejects everything else, including a renamed ZIP', () => {
		expect(sniffAttachmentType(zipBytes)).to.equal(undefined);
		expect(sniffAttachmentType(Buffer.from('Vertrag'))).to.equal(undefined);
		expect(sniffAttachmentType(Buffer.alloc(0))).to.equal(undefined);
		expect(sniffAttachmentType(Buffer.from('PPDF-1.7'))).to.equal(undefined);
	});

	it('keeps the extension check aligned with the content', () => {
		expect(attachmentExtension('Beleg.PDF')).to.equal('pdf');
		expect(attachmentExtension('anlage.tar.gz')).to.equal('gz');
		expect(attachmentExtension('ohne-endung')).to.equal('');
		expect(attachmentExtension('.hidden')).to.equal('');
	});
});

describe('attachments => filename', () => {
	it('keeps a normal name including umlauts', () => {
		expect(sanitizeAttachmentFilename('Lieferschein Müller.pdf')).to.equal('Lieferschein Müller.pdf');
	});

	it('drops paths, control characters and header-breaking characters', () => {
		expect(sanitizeAttachmentFilename('C:\\Temp\\beleg.pdf')).to.equal('beleg.pdf');
		expect(sanitizeAttachmentFilename('/tmp/../../etc/passwd.png')).to.equal('passwd.png');
		// the colon is invalid in Windows filenames, the quotes would break the
		// header and CR/LF would allow header injection
		expect(sanitizeAttachmentFilename('beleg"\r\nX-Evil: 1.pdf')).to.equal('belegX-Evil 1.pdf');
		expect(sanitizeAttachmentFilename('   ')).to.equal('');
	});

	it('shortens a long name but never cuts off the extension', () => {
		const long = sanitizeAttachmentFilename(`${'a'.repeat(300)}.pdf`);
		expect(long.length).to.be.lessThanOrEqual(110);
		expect(attachmentExtension(long)).to.equal('pdf');
	});
});

describe('attachments => rule check', () => {
	it('accepts a PDF and takes the type from the content', () => {
		const check = checkAttachment({ filename: 'Lieferschein.pdf', data: pdfBytes });
		expect(check.ok).to.equal(true);
		expect(check.ok && check.mime).to.equal('application/pdf');
	});

	it('accepts a generic declared type as "not declared"', () => {
		const check = checkAttachment({ filename: 'foto.jpg', mime: 'application/octet-stream', data: jpegBytes });
		expect(check.ok && check.mime).to.equal('image/jpeg');
	});

	it('rejects a declared type that contradicts the content', () => {
		const check = checkAttachment({ filename: 'foto.png', mime: 'application/pdf', data: pngBytes });
		expect(check.ok).to.equal(false);
		expect(check.ok === false && check.error).to.match(/declared type/i);
	});

	it('rejects an extension that contradicts the content', () => {
		const check = checkAttachment({ filename: 'beleg.pdf', data: pngBytes });
		expect(check.ok === false && check.error).to.match(/extension/i);
	});

	it('rejects a missing extension, unknown content and empty files', () => {
		expect(checkAttachment({ filename: 'beleg', data: pdfBytes }).ok).to.equal(false);
		expect(checkAttachment({ filename: 'beleg.txt', data: Buffer.from('Text') }).ok).to.equal(false);
		expect(checkAttachment({ filename: 'beleg.pdf', data: Buffer.alloc(0) }).ok).to.equal(false);
		expect(checkAttachment({ filename: '', data: pdfBytes }).ok).to.equal(false);
	});

	it('enforces the size limit of 5 MB', () => {
		const tooBig = Buffer.concat([pdfBytes, Buffer.alloc(ATTACHMENT_MAX_BYTES)]);
		const check = checkAttachment({ filename: 'gross.pdf', data: tooBig });
		expect(check.ok === false && check.error).to.match(/5 MB/);
		const exact = Buffer.concat([pdfBytes, Buffer.alloc(ATTACHMENT_MAX_BYTES - pdfBytes.length)]);
		expect(exact.length).to.equal(ATTACHMENT_MAX_BYTES);
		expect(checkAttachment({ filename: 'genau.pdf', data: exact }).ok).to.equal(true);
	});

	it('keeps the documented limits', () => {
		expect(ATTACHMENT_MAX_BYTES).to.equal(5 * 1024 * 1024);
		expect(ATTACHMENT_MAX_COUNT).to.equal(10);
	});
});

describe('attachments => download header', () => {
	it('sends an ASCII fallback plus the real name (RFC 5987)', () => {
		const header = attachmentDisposition('Prüfbericht Müller.pdf');
		expect(header).to.contain('attachment; filename="Pruefbericht Mueller.pdf"');
		expect(header).to.contain(`filename*=UTF-8''${encodeURIComponent('Prüfbericht Müller.pdf')}`);
	});

	it('can ask the browser to show the file instead of downloading it', () => {
		expect(attachmentDisposition('foto.jpg', 'inline')).to.match(/^inline; filename="foto.jpg"/);
	});
});
