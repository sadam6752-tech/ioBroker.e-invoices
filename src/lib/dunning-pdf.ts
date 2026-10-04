/**
 * Collective dunning letters as one PDF (R6.4): one page per invoice.
 *
 * A plain letter made with pdfkit. It is **not** an e-invoice: no CII XML is created and
 * there is no PDF/A claim — a reminder is a letter about an invoice that already exists.
 */
import PDFDocument from 'pdfkit';
import type { DunningSuggestion } from './dunning';
import { FONT_BOLD, FONT_REGULAR, registerFonts } from './fonts';

/**
 * Formats an ISO date German style.
 *
 * @param iso - `YYYY-MM-DD`.
 */
function de(iso: string): string {
	const [year, month, day] = iso.slice(0, 10).split('-');
	return `${day}.${month}.${year}`;
}

/**
 * Renders the letters of all suggestions, one page each.
 *
 * @param suggestions - Suggestions to print (at least one).
 * @param today - ISO date printed as the letter date.
 */
export function renderDunningPdf(suggestions: DunningSuggestion[], today: string): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margins: { top: 60, bottom: 50, left: 60, right: 60 },
			autoFirstPage: false,
			info: { Title: 'Zahlungserinnerungen und Mahnungen', Creator: 'ioBroker.e-invoices' },
		});
		const chunks: Buffer[] = [];
		doc.on('data', (chunk: Buffer) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', (error: Error) => reject(error));
		const fonts = registerFonts(doc);
		const regular = fonts ? FONT_REGULAR : 'Helvetica';
		const bold = fonts ? FONT_BOLD : 'Helvetica-Bold';

		for (const item of suggestions) {
			doc.addPage();
			const width = doc.page.width - 120;
			doc.fillColor('#111827');
			// sender line above the address window
			doc.font(regular)
				.fontSize(7.5)
				.fillColor('#555555')
				.text(item.sender, 60, 100, { width, lineBreak: false });
			doc.fillColor('#111827').fontSize(11);
			doc.text(item.recipient.join('\n'), 60, 118, { width: 260 });
			doc.text(`Datum: ${de(today)}`, 60, 118, { width, align: 'right' });
			doc.font(bold).fontSize(13).text(item.subject, 60, 230, { width });
			doc.moveDown(1);
			doc.font(regular).fontSize(11).text(item.text, { width, lineGap: 2 });
		}
		if (suggestions.length === 0) {
			doc.addPage();
			doc.font(regular).fontSize(11).text('Keine Mahnvorschläge.', 60, 100);
		}
		doc.end();
	});
}
