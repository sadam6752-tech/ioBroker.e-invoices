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
import { calcSkonto, calcTotals, formatDeliveryDateDe, lineNetAmount, lineNetUnitPrice } from './invoice-model';
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

/** Bottom margin in pt (foot zone stays printable, page numbers fit below). */
const BOTTOM_MARGIN = 36;

/** Light gray for table header cells and the total row. */
const HEADER_GRAY = '#D9D9D9';

/**
 * Formats ISO dates German style (DD.MM.YYYY) for display.
 * XML keeps ISO; this is sight-component only.
 *
 * @param iso - ISO date or a period `YYYY-MM-DD..YYYY-MM-DD`.
 */
export function formatDeDate(iso: string): string {
	return formatDeliveryDateDe(iso);
}

/**
 * Estimates the display height of a logo for a given width from the PNG
 * header (JPEG and others fall back to square). Keeps tall logos from
 * colliding with the content below.
 *
 * @param data - Raw image bytes.
 * @param widthPt - Display width in pt.
 */
export function imageHeightForWidth(data: Buffer, widthPt: number): number {
	try {
		if (data.length > 24 && data.readUInt32BE(0) === 0x89504e47) {
			const width = data.readUInt32BE(16);
			const height = data.readUInt32BE(20);
			if (width > 0 && height > 0) {
				return widthPt * (height / width);
			}
		}
	} catch {
		// fall through to the square fallback
	}
	return widthPt;
}

/** Longest logo height in pt before the image is scaled down to fit. */
const LOGO_MAX_HEIGHT_PT = 220;

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
 * @param context - Extra render context.
 * @param context.stornoOfNumber - Number of the invoice this one reverses.
 */
export async function renderInvoicePdf(
	invoice: StoredInvoice,
	template: LayoutTemplate = DEFAULT_TEMPLATE,
	logo?: TemplateLogoImage,
	context: { stornoOfNumber?: string | null } = {},
): Promise<Buffer> {
	if (!invoice.number) {
		throw new Error('Invoice has no number yet - issue it before rendering');
	}
	const invoiceNumber: string = invoice.number;
	const originalNumber = context.stornoOfNumber ?? null;
	const totals = calcTotals(invoice.lines);
	const skonto = calcSkonto(
		totals.grossTotal,
		invoice.skontoPercent,
		invoice.skontoDueDate ?? undefined,
		invoice.dueDate ?? undefined,
	);
	const colors = template.colors;
	const intro = template.introText ?? DEFAULT_TEMPLATE.introText;
	const closing = template.closingText ?? DEFAULT_TEMPLATE.closingText;
	const signature = template.signatureName?.trim() || invoice.seller.name;
	const showTagline = template.showTagline ?? true;

	return new Promise<Buffer>((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margins: { top: 50, bottom: 36, left: 50, right: 50 },
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

		// Logo (optional) — company data lives in the footer boxes, so the
		// header only carries the logo; content flows below tall logos.
		let logoBottom = 0;
		if (logo && template.logo) {
			const widthPt = Math.min(300, Math.max(28, ((template.logo.widthMm * 72) / 25.4) * 0.6));
			// the cap must also be applied to the drawn size, otherwise a tall
			// image runs off the page and over the whole layout
			const naturalHeight = imageHeightForWidth(logo.data, widthPt);
			const drawHeight = Math.min(naturalHeight, LOGO_MAX_HEIGHT_PT);
			const drawWidth =
				naturalHeight > LOGO_MAX_HEIGHT_PT ? (widthPt * LOGO_MAX_HEIGHT_PT) / naturalHeight : widthPt;
			const lx =
				template.logo.position === 'left'
					? left
					: template.logo.position === 'center'
						? left + (pageWidth - drawWidth) / 2
						: left + pageWidth - drawWidth;
			try {
				doc.image(logo.data, lx, 36, { width: drawWidth, height: drawHeight });
				logoBottom = 36 + drawHeight;
			} catch {
				// broken logo must never break the invoice
			}
		}

		let cursor = logoBottom > 0 ? logoBottom + 10 : 50;
		if (showTagline) {
			doc.fillColor(colors.muted).fontSize(7);
			doc.text(
				`${invoice.seller.name} – ${invoice.seller.street} – ${invoice.seller.zip} ${invoice.seller.city}`,
				left,
				cursor,
				{ width: pageWidth, align: 'left' },
			);
			doc.fillColor(colors.text).fontSize(10);
			cursor += 12;
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
			doc.font('Helvetica-Bold').text(label, left + 300, my, { width: 100 });
			doc.font('Helvetica').text(value, left + 300, my, { width: pageWidth - 300, align: 'right' });
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
		// a Storno must state which invoice it reverses (GoBD/§ 14 UStG)
		if (invoice.stornoOfId) {
			const original = originalNumber;
			doc.fillColor(colors.muted).fontSize(9);
			doc.text(
				original
					? `Stornorechnung — storniert Rechnung ${original}.`
					: 'Stornorechnung — storniert die oben genannte Rechnung.',
				left,
				cursor,
				{ width: pageWidth },
			);
			doc.fillColor(colors.text).fontSize(10);
			cursor += 14;
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
		// Bottom text edge enforced by pdfkit itself: never position text
		// below maxY, otherwise pdfkit paginates on its own and scatters lines.
		const maxY = (): number => doc.page.height - BOTTOM_MARGIN;
		const ensureSpace = (points: number): void => {
			if (rowY + points > maxY()) {
				newPage();
			}
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
				const amount = lineNetAmount(line);
				const netUnit = lineNetUnitPrice(line);
				const discount = line.discountPercent ?? 0;
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

		// Long separator line under the last position
		if (template.blocks.positions && invoice.lines.length > 0) {
			if (rowY > 740) {
				newPage();
			}
			doc.save();
			doc.moveTo(left, rowY).lineTo(right, rowY).strokeColor(colors.text).lineWidth(0.75).stroke();
			doc.restore();
			rowY += 10;
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
			ensureSpace(28);
			doc.text(`Steuerbefreiung: ${exempt.exemptionReason}`, left, rowY, { width: pageWidth });
			rowY += 14;
		}

		// Cash discount (Skonto) and payment state
		if (invoice.paid) {
			ensureSpace(16);
			doc.fillColor(colors.muted).fontSize(9);
			doc.text(
				`Ausgeglichen am ${formatDeDate((invoice.paidAt ?? '').slice(0, 10)) || '—'}${skonto.percent > 0 ? ' (Skonto berücksichtigt)' : ''}.`,
				left,
				rowY,
				{ width: pageWidth },
			);
			doc.fillColor(colors.text).fontSize(10);
			rowY += 14;
		} else if (skonto.percent > 0) {
			ensureSpace(30);
			doc.fillColor(colors.muted).fontSize(9);
			doc.text(
				`Bei Zahlung bis ${formatDeDate(skonto.dueDate ?? '')} ${formatEurDe(skonto.payableNow)} je Rechnung ` +
					`(${skonto.percent} % Skonto = ${formatEurDe(skonto.amount)}).`,
				left,
				rowY,
				{ width: pageWidth },
			);
			doc.fillColor(colors.text).fontSize(10);
			rowY += 14;
		}

		// Payment + notes. One blank line separates the block from the totals.
		rowY += 14;
		if (template.blocks.payment && invoice.seller.iban) {
			ensureSpace(16);
			doc.text(
				`Zahlung an IBAN ${invoice.seller.iban}${invoice.seller.bic ? `, BIC ${invoice.seller.bic}` : ''}`,
				left,
				rowY,
				{ width: pageWidth },
			);
			rowY += 14;
		}
		if (template.showPaymentTerms && invoice.paymentTerms) {
			ensureSpace(28);
			doc.text(`Zahlungsbedingungen: ${invoice.paymentTerms}`, left, rowY, { width: pageWidth });
			rowY += 14;
		}
		if (template.blocks.notes && invoice.notes?.trim()) {
			ensureSpace(40);
			doc.text(`Hinweis: ${invoice.notes.trim()}`, left, rowY, { width: pageWidth });
			rowY += 14;
		}

		// Signature: no "Mit freundlichen Grüßen" line, the invoice ends with the
		// name. An optional closing text above is kept.
		ensureSpace(60);
		if (closing.trim()) {
			rowY += 6;
			doc.text(closing.trim(), left, rowY, { width: pageWidth });
			rowY += 26;
		} else {
			rowY += 10;
		}
		doc.font('Helvetica-Bold').text(signature, left, rowY, { width: pageWidth });
		doc.font('Helvetica');
		rowY += 20;

		// Company footer: 4 boxes pinned to the page bottom (address, contact, bank, tax).
		// Custom texts from the company profile win; otherwise auto from company data.
		// Line height is measured (never guessed): pdfkit paginates text placed
		// below maxY on its own, which scattered the boxes across pages.
		if (template.showFooterBoxes ?? true) {
			const rawBoxes: unknown = invoice.seller.footerBoxes;
			const customBoxes: string[] | null =
				Array.isArray(rawBoxes) &&
				rawBoxes.length === 4 &&
				rawBoxes.some(box => typeof box === 'string' && box.trim() !== '')
					? rawBoxes.filter((box): box is string => typeof box === 'string')
					: null;
			const boxes: string[][] = customBoxes
				? customBoxes.map(box =>
						box
							.split('\n')
							.map(line => line.trim())
							.slice(0, 4),
					)
				: [
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
			const colW = pageWidth / 4;
			doc.fontSize(8);
			const lineHeight = doc.heightOfString('Xg', { width: colW - 8 });
			const maxLines = Math.max(1, ...boxes.map(lines => lines.length));
			// room for the page-number line below (only rendered when needed)
			const numberReserve = template.showPageNumbers === true ? lineHeight + 4 : 0;
			const need = 8 + maxLines * lineHeight + 6 + numberReserve;
			let footTop = Math.max(rowY + 6, maxY() - need);
			if (footTop + need > maxY() + 2) {
				newPage();
				footTop = maxY() - need;
			}
			doc.save();
			doc.moveTo(left, footTop).lineTo(right, footTop).strokeColor(colors.muted).lineWidth(0.5).stroke();
			doc.restore();
			footTop += 8;
			const rawAlign: unknown = invoice.seller.footerAlign;
			const aligns: ('left' | 'center' | 'right')[] = [0, 1, 2, 3].map(i => {
				const value = Array.isArray(rawAlign) ? (rawAlign[i] as unknown) : undefined;
				return value === 'center' || value === 'right' ? value : 'left';
			});
			boxes.forEach((lines, index) => {
				const align = aligns[index] ?? 'left';
				// last column reaches exactly to the right edge (rule end)
				const width = index === boxes.length - 1 ? colW : colW - 8;
				lines.forEach((line, lineIndex) => {
					doc.text(line, left + index * colW, footTop + lineIndex * lineHeight, { width, align });
				});
			});
			doc.fontSize(10);
			rowY = footTop + maxLines * lineHeight + 8;
		}

		if (template.showArchiveHint) {
			ensureSpace(36);
			doc.fontSize(9).fillColor(colors.muted).text(ARCHIVE_HINT, left, rowY, { width: pageWidth });
			doc.fontSize(10).fillColor(colors.text);
			rowY += 24;
		}
		if (template.footerText.trim()) {
			ensureSpace(30);
			doc.fontSize(9).fillColor(colors.muted).text(template.footerText.trim(), left, rowY, { width: pageWidth });
			doc.fontSize(10).fillColor(colors.text);
		}

		if (template.showPageNumbers && pageCount > 1) {
			const range = doc.bufferedPageRange();
			for (let i = 0; i < range.count; i++) {
				doc.switchToPage(i);
				doc.fontSize(8).fillColor(colors.muted);
				doc.text(`Seite ${i + 1} von ${range.count}`, left, maxY() - 11, {
					width: pageWidth,
					align: 'center',
				});
			}
			doc.flushPages();
		}
		doc.end();
	});
}
