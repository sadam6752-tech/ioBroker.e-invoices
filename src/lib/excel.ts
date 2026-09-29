/**
 * Excel export for ioBroker.e-invoices (P4d).
 *
 * The xlsx files are convenience copies only — they are NOT e-invoices.
 * Every sheet states that the embedded CII XML of the ZUGFeRD hybrid PDF
 * is the leading tax document. Single sheets are frozen at issue time
 * (stored next to PDF/XML); the list export is generated on demand.
 */
import ExcelJS from 'exceljs';
import { calcTotals, lineNetAmount, lineNetUnitPrice } from './invoice-model';
import type { StoredInvoice } from './db';

/** Copy notice printed on every Excel sheet (German). */
export const EXCEL_COPY_NOTICE =
	'KOPIE – kein Steuerdokument. Maßgeblich ist das eingebettete XML der ZUGFeRD-Rechnung.';

/**
 * Neutralises spreadsheet formula injection: a user-supplied value starting
 * with = + - @ would otherwise be evaluated by Excel when the accountant
 * opens the workbook.
 *
 * @param value - Raw text from the invoice.
 */
function safeCellText(value: string): string {
	return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function headRow(sheet: ExcelJS.Worksheet, row: number, values: string[]): void {
	const r = sheet.getRow(row);
	values.forEach((value, index) => {
		const cell = r.getCell(index + 1);
		cell.value = value;
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A56DB' } };
	});
	r.commit();
}

function partyBlock(sheet: ExcelJS.Worksheet, startRow: number, title: string, lines: string[]): number {
	sheet.getCell(`A${startRow}`).value = title;
	sheet.getCell(`A${startRow}`).font = { bold: true };
	lines.forEach((line, index) => {
		sheet.getCell(`A${startRow + 1 + index}`).value = safeCellText(line);
	});
	return startRow + 1 + lines.length;
}

/**
 * Renders one invoice as an xlsx workbook buffer.
 *
 * @param invoice - Stored invoice (number assigned).
 */
export async function renderInvoiceWorkbook(invoice: StoredInvoice): Promise<Buffer> {
	if (!invoice.number) {
		throw new Error('Invoice has no number yet — issue it before exporting');
	}
	const totals = calcTotals(invoice.lines);
	const book = new ExcelJS.Workbook();
	book.creator = 'ioBroker.e-invoices';
	book.created = new Date();
	const sheet = book.addWorksheet('Rechnung');
	sheet.columns = [{ width: 38 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];

	sheet.getCell('A1').value = safeCellText(`${invoice.documentTitle} ${invoice.number}`);
	sheet.getCell('A1').font = { bold: true, size: 16 };
	sheet.getCell('A2').value = EXCEL_COPY_NOTICE;
	sheet.getCell('A2').font = { italic: true, color: { argb: 'FFB91C1C' } };

	let row = partyBlock(sheet, 4, 'Rechnungssteller', [
		invoice.seller.name,
		invoice.seller.street,
		`${invoice.seller.zip} ${invoice.seller.city}`,
		[
			invoice.seller.vatId ? `USt-IdNr.: ${invoice.seller.vatId}` : '',
			invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : '',
		]
			.filter(part => part !== '')
			.join(' · '),
	]);
	row = partyBlock(
		sheet,
		row + 1,
		'Rechnungsempfänger',
		[
			invoice.buyer.name,
			invoice.buyer.street,
			`${invoice.buyer.zip} ${invoice.buyer.city}`,
			invoice.buyer.customerNumber ? `Kundennr.: ${invoice.buyer.customerNumber}` : '',
		].filter(line => line !== ''),
	);
	row += 1;
	sheet.getCell(`A${row}`).value = `Ausstellungsdatum: ${invoice.issueDate}`;
	sheet.getCell(`A${row + 1}`).value = `Liefer-/Leistungsdatum: ${invoice.deliveryDate}`;
	if (invoice.dueDate) {
		sheet.getCell(`A${row + 2}`).value = `Fällig am: ${invoice.dueDate}`;
		row += 1;
	}
	row += 2;

	headRow(sheet, row, ['Beschreibung', 'Menge', 'Einzel (netto)', 'USt-Satz', 'Betrag (netto)']);
	invoice.lines.forEach((line, index) => {
		const amount = lineNetAmount(line);
		const netUnit = lineNetUnitPrice(line);
		const r = sheet.getRow(row + 1 + index);
		r.getCell(1).value = safeCellText(line.description);
		r.getCell(2).value = safeCellText(`${line.quantity} ${line.unit}`);
		r.getCell(3).value = netUnit;
		r.getCell(3).numFmt = '#,##0.00 "EUR"';
		r.getCell(4).value = line.vatRate / 100;
		r.getCell(4).numFmt = '0%';
		r.getCell(5).value = amount;
		r.getCell(5).numFmt = '#,##0.00 "EUR"';
		r.commit();
	});
	row += invoice.lines.length + 1;
	for (const entry of totals.breakdown) {
		sheet.getCell(`A${row}`).value = `Netto ${entry.vatRate} % / USt`;
		sheet.getCell(`E${row}`).value = entry.tax;
		sheet.getCell(`E${row}`).numFmt = '#,##0.00 "EUR"';
		row += 1;
	}
	sheet.getCell(`A${row}`).value = 'Gesamt netto';
	sheet.getCell(`A${row}`).font = { bold: true };
	sheet.getCell(`E${row}`).value = totals.netTotal;
	sheet.getCell(`E${row}`).numFmt = '#,##0.00 "EUR"';
	sheet.getCell(`E${row}`).font = { bold: true };
	sheet.getCell(`A${row + 1}`).value = 'Rechnungsbetrag';
	sheet.getCell(`A${row + 1}`).font = { bold: true };
	sheet.getCell(`E${row + 1}`).value = totals.grossTotal;
	sheet.getCell(`E${row + 1}`).numFmt = '#,##0.00 "EUR"';
	sheet.getCell(`E${row + 1}`).font = { bold: true };

	const buffer = await book.xlsx.writeBuffer();
	return Buffer.from(buffer);
}

/**
 * Renders an invoice list (Sammelübersicht) as xlsx buffer.
 *
 * @param invoices - Invoices to list (already filtered).
 * @param title - Sheet title.
 */
export async function renderInvoiceListWorkbook(invoices: StoredInvoice[], title: string): Promise<Buffer> {
	const book = new ExcelJS.Workbook();
	book.creator = 'ioBroker.e-invoices';
	book.created = new Date();
	const sheet = book.addWorksheet('Übersicht');
	sheet.columns = [
		{ width: 16 },
		{ width: 14 },
		{ width: 30 },
		{ width: 16 },
		{ width: 16 },
		{ width: 16 },
		{ width: 12 },
	];
	sheet.getCell('A1').value = title;
	sheet.getCell('A1').font = { bold: true, size: 14 };
	sheet.getCell('A2').value = EXCEL_COPY_NOTICE;
	sheet.getCell('A2').font = { italic: true, color: { argb: 'FFB91C1C' } };

	headRow(sheet, 4, ['Nummer', 'Datum', 'Käufer', 'Netto', 'USt', 'Brutto', 'Status']);
	invoices.forEach((invoice, index) => {
		const r = sheet.getRow(5 + index);
		r.getCell(1).value = safeCellText(invoice.number ?? '(Entwurf)');
		r.getCell(2).value = invoice.issueDate;
		r.getCell(3).value = safeCellText(invoice.buyer.name);
		r.getCell(4).value = invoice.totals.netTotal;
		r.getCell(4).numFmt = '#,##0.00 "EUR"';
		r.getCell(5).value = invoice.totals.taxTotal;
		r.getCell(5).numFmt = '#,##0.00 "EUR"';
		r.getCell(6).value = invoice.totals.grossTotal;
		r.getCell(6).numFmt = '#,##0.00 "EUR"';
		r.getCell(7).value = safeCellText(invoice.status);
		r.commit();
	});

	const buffer = await book.xlsx.writeBuffer();
	return Buffer.from(buffer);
}
