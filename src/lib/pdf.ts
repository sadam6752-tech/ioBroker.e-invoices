/**
 * Visual PDF rendering for ioBroker.e-invoices (layout v2).
 *
 * Classic German business-letter layout: company header with bank data,
 * address tagline, recipient + invoice meta columns, titled positions
 * table with article numbers, German sum labels and closing block.
 * The PDF stays the sight component only — the embedded CII XML is the
 * leading part. The Pflichtfeld-Wächter guarantees mandatory content;
 * exemption reasons are always rendered (Pflicht).
 */
import PDFDocument from 'pdfkit';
import { calcTotals } from './invoice-model';
import { ARCHIVE_HINT, DEFAULT_TEMPLATE, type LayoutTemplate } from './templates';
import type { StoredInvoice } from './db';

/**
 * Formats EUR amounts with two decimals.
 *
 * @param value - Amount in EUR.
 */
export function formatEur(value: number): string {
	return `${value.toFixed(2)} EUR`;
}

/**
 * Formats amounts German style (comma decimals + €) for the sight PDF.
 * The XML always keeps the dot format; this is display only.
 *
 * @param value - Amount in EUR.
 */
export function formatEurDe(value: number): string {
	return `${value.toFixed(2).replace('.', ',')} €`;
}

/** Light gray for table header cells and the total row. */
const HEADER_GRAY = '#D9D9D9';

/**
 * Formats ISO dates German style (DD.MM.YYYY) for display.
 * XML keeps ISO; this is sight-component only.
 *
 * @param iso - ISO date or date period start.
 */
export function formatDeDate(iso: string): string {
	const date = iso.split('..')[0];
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!match) {
		return iso;
	}
	return `${match[3]}.${match[2]}.${match[1]}`;
}

/** Logo image bytes for the header (PNG/JPEG). */
export interface TemplateLogoImage {
	/** Raw image bytes. */
	data: Buffer;
}

/**
 * Renders the invoice sight PDF (A4) and resolves with its bytes.
 *
 * @param invoice - Stored invoice (number assigned).
 * @param template - Layout template (defaults to Standard).
 * @param logo - Logo image bytes (optional, from template logo path).
 */
export async function renderInvoicePdf(
	invoice: StoredInvoice,
	template: LayoutTemplate = DEFAULT_TEMPLATE,
	logo?: TemplateLogoImage,
): Promise<Buffer> {
	if (!invoice.number) {
		throw new Error('Invoice has no number yet — issue it before rendering');
	}
	const invoiceNumber: string = invoice.number;
	const totals = calcTotals(invoice.lines);
	const colors = template.colors;
	const intro = template.introText ?? DEFAULT_TEMPLATE.introText;
	const closing = template.closingText ?? DEFAULT_TEMPLATE.closingText;
	const signature = template.signatureName?.trim() || invoice.seller.name;
	const showTagline = template.showTagline ?? true;

	return new Promise<Buffer>((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margin: 50,
			bufferPages: template.showPageNumbers === true,
			info: {
				Title: `${invoice.documentTitle} ${invoice.number}`,
				Author: invoice.seller.name,
				Subject: 'E-Rechnung Sichtkomponente (ZUGFeRD)',
				Creator: 'ioBroker.e-invoices',
			},
		});
		const chunks: Buffer[] = [];
		doc.on('data', (chunk: Buffer) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', (error: Error) => reject(error));

		const pageWidth = doc.page.width - 100;
		const left = 50;
		const right = left + pageWidth;
		let pageCount = 1;
		doc.fillColor(colors.text);

		// Logo (optional, right by default)
		if (logo && template.logo) {
			const widthPt = Math.min(200, Math.max(28, ((template.logo.widthMm * 72) / 25.4) * 0.6));
			try {
				if (template.logo.position === 'left') {
					doc.image(logo.data, left, 36, { width: widthPt });
				} else if (template.logo.position === 'center') {
					doc.image(logo.data, left + (pageWidth - widthPt) / 2, 34, { width: widthPt });
				} else {
					doc.image(logo.data, right - widthPt, 36, { width: widthPt });
				}
			} catch {
				// broken logo must never break the invoice
			}
		}

		// Company header: left identity, right bank/tax block
		const headerTop = 40;
		doc.fillColor(colors.primary).fontSize(15).font('Helvetica-Bold');
		doc.text(invoice.seller.name, left, headerTop, { width: 280 });
		doc.fillColor(colors.text).fontSize(9).font('Helvetica');
		const headLeft = [
			invoice.seller.street,
			`${invoice.seller.zip} ${invoice.seller.city}`,
			invoice.seller.phone ? `Tel. ${invoice.seller.phone}` : '',
			invoice.seller.website ?? '',
			template.showEmail && invoice.seller.email ? invoice.seller.email : '',
		].filter(line => line !== '');
		let hy = headerTop + 20;
		for (const line of headLeft) {
			doc.text(line, left, hy, { width: 280 });
			hy += 11;
		}
		const headRight = [
			invoice.seller.iban ? `IBAN ${invoice.seller.iban}` : '',
			invoice.seller.bic ? `BIC ${invoice.seller.bic}` : '',
			invoice.seller.vatId ? `USt-IdNr.: ${invoice.seller.vatId}` : '',
			invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : '',
			...(template.headerExtra ? template.headerExtra.split('\n').slice(0, 3) : []),
		].filter(line => line !== '');
		let hry = headerTop;
		doc.fontSize(9);
		for (const line of headRight) {
			doc.text(line, left + 300, hry, { width: pageWidth - 300, align: 'right' });
			hry += 11;
		}

		let cursor = Math.max(hy, hry) + 8;
		if (showTagline) {
			doc.fillColor(colors.muted).fontSize(8);
			doc.text(
				`${invoice.seller.name} – ${invoice.seller.street} – ${invoice.seller.zip} ${invoice.seller.city}`,
				left,
				cursor,
				{ width: pageWidth, align: 'center' },
			);
			doc.fillColor(colors.text).fontSize(10);
			cursor += 14;
		}

		// Recipient (left) + invoice meta (right)
		const buyerLines = [
			invoice.buyer.name,
			invoice.buyer.street,
			`${invoice.buyer.zip} ${invoice.buyer.city}`,
			invoice.buyer.country && invoice.buyer.country !== 'DE' ? invoice.buyer.country : '',
			invoice.buyer.contactName ? `Ansprechpartner: ${invoice.buyer.contactName}` : '',
		].filter(line => line !== '');
		let by = cursor + 4;
		for (const line of buyerLines) {
			doc.fontSize(10).font(by === cursor + 4 ? 'Helvetica-Bold' : 'Helvetica');
			doc.text(line, left, by, { width: 270 });
			by += 13;
		}
		doc.font('Helvetica').fontSize(10);
		const meta: [string, string][] = [
			['Rechnungsnr.:', invoiceNumber],
			['Rechnungsdatum:', formatDeDate(invoice.issueDate)],
			['Lieferdatum:', formatDeDate(invoice.deliveryDate)],
			...(template.showCustomerNumber && invoice.buyer.customerNumber
				? [['Kundennr.:', invoice.buyer.customerNumber] as [string, string]]
				: []),
			...(invoice.dueDate ? [['Fällig am:', formatDeDate(invoice.dueDate)] as [string, string]] : []),
		];
		let my = cursor + 4;
		for (const [label, value] of meta) {
			doc.font('Helvetica-Bold').text(label, left + 300, my, { width: 90 });
			doc.font('Helvetica').text(value, left + 395, my, { width: pageWidth - 395 });
			my += 14;
		}

		cursor = Math.max(by, my) + 14;

		// Title + intro
		if (template.blocks.title) {
			doc.fillColor(colors.primary).fontSize(17).font('Helvetica-Bold');
			doc.text(`${invoice.documentTitle} Nr. ${invoice.number}`, left, cursor, { width: pageWidth });
			doc.fillColor(colors.text).fontSize(10).font('Helvetica');
			cursor += 24;
		}
		if (intro.trim()) {
			doc.text(intro.trim(), left, cursor, { width: pageWidth });
			cursor += 22;
		}

		// Positions: Pos | Art.Nr. | Bezeichnung | Menge | Einheit | E-Preis | Gesamt
		const colX = {
			pos: left,
			sku: left + 28,
			name: left + 88,
			qty: left + 268,
			unit: left + 318,
			price: left + 362,
			total: left + 432,
		};
		const totalW = right - colX.total;
		let rowY = cursor;
		const newPage = (): void => {
			doc.addPage();
			pageCount += 1;
			rowY = 60;
		};
		const headerRow = (): void => {
			const height = 17;
			doc.save();
			doc.rect(left - 2, rowY - 3, colX.qty - 2 - (left - 2), height).fill(colors.primary);
			doc.rect(colX.qty - 2, rowY - 3, right + 2 - (colX.qty - 2), height).fill(HEADER_GRAY);
			doc.restore();
			doc.font('Helvetica-Bold').fontSize(9);
			doc.fillColor('#FFFFFF');
			doc.text('Pos.', colX.pos, rowY);
			doc.text('Art.Nr.', colX.sku, rowY);
			doc.text('Bezeichnung', colX.name, rowY);
			doc.fillColor(colors.text);
			doc.text('Menge', colX.qty, rowY);
			doc.text('Einheit', colX.unit, rowY);
			doc.text('E-Preis', colX.price, rowY);
			doc.text('Gesamt', colX.total, rowY, { width: totalW, align: 'right' });
			doc.font('Helvetica').fontSize(10);
			rowY += 19;
		};
		if (template.blocks.positions) {
			headerRow();
			invoice.lines.forEach((line, index) => {
				const discount = line.discountPercent ?? 0;
				const netUnit = Math.round(line.unitPriceNet * (1 - discount / 100) * 100) / 100;
				const amount = Math.round(line.quantity * netUnit * 100) / 100;
				const needs = line.details?.trim() ? 26 : 14;
				if (rowY + needs > 730) {
					newPage();
					headerRow();
				}
				doc.fontSize(10);
				doc.text(String(index + 1), colX.pos, rowY);
				doc.text(line.sku?.trim() || '–', colX.sku, rowY, { width: colX.name - colX.sku - 4 });
				doc.font('Helvetica-Bold').text(line.description, colX.name, rowY, { width: 172 });
				doc.font('Helvetica');
				doc.text(`${line.quantity}`, colX.qty, rowY);
				doc.text(line.unit, colX.unit, rowY, { width: 40 });
				doc.text(formatEurDe(netUnit), colX.price, rowY, { width: 66 });
				doc.text(formatEurDe(amount), colX.total, rowY, { width: totalW, align: 'right' });
				rowY += 13;
				if (line.details?.trim()) {
					doc.fontSize(8).fillColor(colors.muted);
					doc.text(line.details.trim(), colX.name, rowY, { width: 260 });
					doc.fontSize(10).fillColor(colors.text);
					rowY += 12;
				} else {
					rowY += 2;
				}
				if (discount > 0) {
					doc.fontSize(8).fillColor(colors.muted);
					doc.text(`inkl. ${discount} % Nachlass`, colX.name, rowY, { width: 260 });
					doc.fontSize(10).fillColor(colors.text);
					rowY += 12;
				}
			});
			rowY += 8;
		}

		// Totals with German labels
		if (template.blocks.totals) {
			if (rowY > 700) {
				newPage();
			}
			doc.text('Zwischensumme netto', colX.price - 60, rowY, { width: 130, align: 'right' });
			doc.text(formatEurDe(totals.netTotal), colX.total, rowY, { width: totalW, align: 'right' });
			rowY += 14;
			for (const entry of totals.breakdown) {
				doc.text(`zzgl. ${entry.vatRate} % MwSt.`, colX.price - 60, rowY, { width: 130, align: 'right' });
				doc.text(formatEurDe(entry.tax), colX.total, rowY, { width: totalW, align: 'right' });
				rowY += 14;
			}
			doc.save();
			doc.rect(colX.price - 64, rowY - 3, right + 2 - (colX.price - 64), 18).fill(HEADER_GRAY);
			doc.restore();
			doc.font('Helvetica-Bold');
			doc.text('Gesamtbetrag brutto', colX.price - 60, rowY, { width: 130, align: 'right' });
			doc.text(formatEurDe(totals.grossTotal), colX.total, rowY, { width: totalW, align: 'right' });
			doc.font('Helvetica');
			rowY += 24;
		}

		// Exemption reason always (Pflicht bei 0 %)
		const exempt = invoice.lines.find(line => line.vatRate === 0 && line.exemptionReason?.trim());
		if (exempt?.exemptionReason) {
			doc.text(`Steuerbefreiung: ${exempt.exemptionReason}`, left, rowY, { width: pageWidth });
			rowY += 14;
		}

		// Payment + notes
		if (template.blocks.payment && invoice.seller.iban) {
			doc.text(
				`Zahlung an IBAN ${invoice.seller.iban}${invoice.seller.bic ? `, BIC ${invoice.seller.bic}` : ''}`,
				left,
				rowY,
				{ width: pageWidth },
			);
			rowY += 14;
		}
		if (template.showPaymentTerms && invoice.paymentTerms) {
			doc.text(`Zahlungsbedingungen: ${invoice.paymentTerms}`, left, rowY, { width: pageWidth });
			rowY += 14;
		}
		if (template.blocks.notes && invoice.notes?.trim()) {
			doc.text(`Hinweis: ${invoice.notes.trim()}`, left, rowY, { width: pageWidth });
			rowY += 14;
		}

		// Closing + signature
		if (closing.trim()) {
			rowY += 6;
			doc.text(closing.trim(), left, rowY, { width: pageWidth });
			rowY += 26;
		} else {
			rowY += 10;
		}
		doc.text('Mit freundlichen Grüßen', left, rowY, { width: pageWidth });
		rowY += 26;
		doc.font('Helvetica-Bold').text(signature, left, rowY, { width: pageWidth });
		doc.font('Helvetica');
		rowY += 20;

		// Company footer: 4 boxes pinned to the page bottom (address, contact, bank, tax)
		if (template.showFooterBoxes ?? true) {
			const boxes: string[][] = [
				[invoice.seller.name, invoice.seller.street, `${invoice.seller.zip} ${invoice.seller.city}`],
				[
					invoice.seller.phone ?? '',
					invoice.seller.website ?? '',
					template.showEmail ? (invoice.seller.email ?? '') : '',
				],
				[
					invoice.seller.bankName ?? '',
					invoice.seller.iban ?? '',
					invoice.seller.bic ? `BIC: ${invoice.seller.bic}` : '',
				],
				[
					invoice.seller.vatId ? `USt. ID: ${invoice.seller.vatId}` : '',
					invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : '',
					...(template.headerExtra ? template.headerExtra.split('\n').slice(0, 3) : []),
				],
			].map(lines => lines.filter(line => line.trim() !== ''));
			const maxLines = Math.max(1, ...boxes.map(lines => lines.length));
			const need = 8 + maxLines * 10 + 6;
			const bottom = doc.page.height - 50;
			let footTop = Math.max(rowY + 6, bottom - need);
			if (footTop + need > bottom + 2) {
				newPage();
				footTop = doc.page.height - 50 - need;
			}
			doc.save();
			doc.moveTo(left, footTop).lineTo(right, footTop).strokeColor(colors.muted).lineWidth(0.5).stroke();
			doc.restore();
			footTop += 8;
			const colW = pageWidth / 4;
			doc.fontSize(8);
			boxes.forEach((lines, index) => {
				lines.forEach((line, lineIndex) => {
					doc.text(line, left + index * colW, footTop + lineIndex * 10, { width: colW - 8 });
				});
			});
			doc.fontSize(10);
			rowY = footTop + maxLines * 10 + 8;
		}

		if (template.showArchiveHint) {
			doc.fontSize(9).fillColor(colors.muted).text(ARCHIVE_HINT, left, rowY, { width: pageWidth });
			doc.fontSize(10).fillColor(colors.text);
			rowY += 24;
		}
		if (template.footerText.trim()) {
			doc.fontSize(9).fillColor(colors.muted).text(template.footerText.trim(), left, rowY, { width: pageWidth });
			doc.fontSize(10).fillColor(colors.text);
		}

		if (template.showPageNumbers && pageCount > 1) {
			const range = doc.bufferedPageRange();
			for (let i = 0; i < range.count; i++) {
				doc.switchToPage(i);
				doc.fontSize(8).fillColor(colors.muted);
				doc.text(`Seite ${i + 1} von ${range.count}`, left, doc.page.height - 30, {
					width: pageWidth,
					align: 'center',
				});
			}
			doc.flushPages();
		}
		doc.end();
	});
}
