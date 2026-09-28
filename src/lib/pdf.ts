/**
 * Visual PDF rendering for ioBroker.e-invoices (P4c).
 *
 * The PDF is only the human-readable sight component of the hybrid
 * invoice — the embedded CII XML stays the leading part. Rendering
 * follows the active layout template; the Pflichtfeld-Wächter
 * (validateTemplate) guarantees that no mandatory content (§ 14 UStG)
 * can be hidden. Exemption reasons are always rendered (Pflicht).
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
	const totals = calcTotals(invoice.lines);
	const colors = template.colors;

	return new Promise<Buffer>((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margin: 50,
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
		doc.fillColor(colors.text);

		// Logo (optional) + title
		let titleX = left;
		if (logo && template.logo) {
			const widthPt = Math.min(200, Math.max(28, ((template.logo.widthMm * 72) / 25.4) * 0.6));
			try {
				if (template.logo.position === 'left') {
					doc.image(logo.data, left, 38, { width: widthPt });
					titleX = left + widthPt + 16;
				} else if (template.logo.position === 'center') {
					doc.image(logo.data, left + (pageWidth - widthPt) / 2, 36, { width: widthPt });
				} else {
					doc.image(logo.data, left + pageWidth - widthPt, 38, { width: widthPt });
				}
			} catch {
				// broken logo must never break the invoice
			}
		}
		if (template.blocks.title) {
			doc.fillColor(colors.primary).fontSize(20).font('Helvetica-Bold');
			if (template.logo?.position === 'center' && logo) {
				doc.text(invoice.documentTitle, left, 108, { width: pageWidth, align: 'center' });
			} else {
				doc.text(invoice.documentTitle, titleX, 50);
			}
			doc.fillColor(colors.text);
		}
		doc.fontSize(9).font('Helvetica').fillColor(colors.muted);
		doc.text('E-Rechnung (ZUGFeRD) — maschinenlesbares XML eingebettet, XML ist führend.', left, 76, {
			width: pageWidth,
		});
		doc.fillColor(colors.text);

		const partyTop = logo ? 140 : 110;
		let metaTop: number;
		if (template.blocks.parties) {
			const sellerLines = [
				invoice.seller.name,
				invoice.seller.street,
				`${invoice.seller.zip} ${invoice.seller.city}`,
				invoice.seller.country,
				invoice.seller.vatId ? `USt-IdNr.: ${invoice.seller.vatId}` : '',
				invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : '',
				template.showEmail && invoice.seller.email ? invoice.seller.email : '',
			].filter(line => line !== '');
			const buyerLines = [
				'Rechnungsempfänger:',
				invoice.buyer.name,
				invoice.buyer.street,
				`${invoice.buyer.zip} ${invoice.buyer.city}`,
				invoice.buyer.country,
				template.showCustomerNumber && invoice.buyer.customerNumber
					? `Kundennr.: ${invoice.buyer.customerNumber}`
					: '',
			].filter(line => line !== '');

			doc.fontSize(10).font('Helvetica-Bold').text('Rechnungssteller:', left, partyTop);
			doc.font('Helvetica').fontSize(10);
			let y = partyTop + 14;
			for (const line of sellerLines) {
				doc.text(line, left, y);
				y += 13;
			}
			let by = partyTop;
			doc.font('Helvetica-Bold').text(buyerLines[0], left + 280, by);
			doc.font('Helvetica');
			for (const line of buyerLines.slice(1)) {
				by += 13;
				doc.text(line, left + 280, by);
			}
			metaTop = Math.max(y, by) + 18;
		} else {
			metaTop = partyTop;
		}

		if (template.blocks.meta) {
			doc.fontSize(10);
			doc.text(`Rechnungsnummer: ${invoice.number}`, left, metaTop);
			doc.text(`Ausstellungsdatum: ${invoice.issueDate}`, left, metaTop + 14);
			doc.text(`Liefer-/Leistungsdatum: ${invoice.deliveryDate}`, left, metaTop + 28);
			if (invoice.dueDate) {
				doc.text(`Fällig am: ${invoice.dueDate}`, left + 280, metaTop);
			}
		}

		// Positions
		let rowY = metaTop + 52;
		if (template.blocks.positions) {
			doc.font('Helvetica-Bold');
			doc.text('Pos', left, rowY);
			doc.text('Beschreibung', left + 35, rowY);
			doc.text('Menge', left + 280, rowY);
			doc.text('Einzel (netto)', left + 340, rowY);
			doc.text('USt', left + 430, rowY);
			doc.text('Betrag (netto)', left + 465, rowY, { width: 80, align: 'right' });
			doc.font('Helvetica');
			rowY += 16;
			invoice.lines.forEach((line, index) => {
				const discount = line.discountPercent ?? 0;
				const netUnit = Math.round(line.unitPriceNet * (1 - discount / 100) * 100) / 100;
				const amount = Math.round(line.quantity * netUnit * 100) / 100;
				doc.text(String(index + 1), left, rowY);
				doc.text(line.description + (discount > 0 ? ` (−${discount} %)` : ''), left + 35, rowY, { width: 240 });
				doc.text(`${line.quantity} ${line.unit}`, left + 280, rowY);
				doc.text(formatEur(netUnit), left + 340, rowY);
				doc.text(`${line.vatRate} %`, left + 430, rowY);
				doc.text(formatEur(amount), left + 465, rowY, { width: 80, align: 'right' });
				rowY += 16;
				if (rowY > 700) {
					doc.addPage();
					rowY = 60;
				}
			});
			rowY += 10;
		}

		// Totals per rate + grand (always on — Pflicht)
		if (template.blocks.totals) {
			doc.font('Helvetica-Bold').text('Summen', left, rowY);
			doc.font('Helvetica');
			for (const entry of totals.breakdown) {
				rowY += 14;
				doc.text(
					`Netto ${entry.vatRate} %: ${formatEur(entry.net)}   USt: ${formatEur(entry.tax)}`,
					left,
					rowY,
				);
			}
			rowY += 18;
			doc.font('Helvetica-Bold');
			doc.text(`Gesamt netto: ${formatEur(totals.netTotal)}`, left, rowY);
			doc.text(`USt gesamt: ${formatEur(totals.taxTotal)}`, left, rowY + 14);
			doc.text(`Rechnungsbetrag: ${formatEur(totals.grossTotal)}`, left, rowY + 28);
			doc.font('Helvetica');
			rowY += 28;
		}

		// Exemption reason always (Pflicht bei 0 %), then payment + notes
		let footY = rowY + 24;
		const exempt = invoice.lines.find(line => line.vatRate === 0 && line.exemptionReason?.trim());
		if (exempt?.exemptionReason) {
			doc.text(`Steuerbefreiung: ${exempt.exemptionReason}`, left, footY, { width: pageWidth });
			footY += 14;
		}
		if (template.blocks.payment && invoice.seller.iban) {
			doc.text(
				`Zahlung an IBAN ${invoice.seller.iban}${invoice.seller.bic ? `, BIC ${invoice.seller.bic}` : ''}`,
				left,
				footY,
				{
					width: pageWidth,
				},
			);
			footY += 14;
		}
		if (template.showPaymentTerms && invoice.paymentTerms) {
			doc.text(`Zahlungsbedingungen: ${invoice.paymentTerms}`, left, footY, { width: pageWidth });
			footY += 14;
		}
		if (template.blocks.notes && invoice.notes?.trim()) {
			doc.text(`Hinweis: ${invoice.notes.trim()}`, left, footY, { width: pageWidth });
			footY += 14;
		}
		if (template.showArchiveHint) {
			doc.fontSize(9).fillColor(colors.muted).text(ARCHIVE_HINT, left, footY, { width: pageWidth });
			doc.fontSize(10).fillColor(colors.text);
			footY += 24;
		}
		if (template.footerText.trim()) {
			doc.fontSize(9).fillColor(colors.muted).text(template.footerText.trim(), left, footY, { width: pageWidth });
			doc.fontSize(10).fillColor(colors.text);
		}

		doc.end();
	});
}
