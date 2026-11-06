/**
 * Excel export for ioBroker.e-invoices (P4d).
 *
 * The xlsx files are convenience copies only — they are NOT e-invoices.
 * Every sheet states that the embedded CII XML of the ZUGFeRD hybrid PDF
 * is the leading tax document. Single sheets are frozen at issue time
 * (stored next to PDF/XML); the list export is generated on demand.
 */
import ExcelJS from 'exceljs';
import { calcSkonto, calcTotals, formatDeliveryDateDe, lineNetAmount, lineNetUnitPrice } from './invoice-model';
import type { StoredInvoice } from './db';
import { AGE_BUCKET_LABELS, AGE_BUCKETS, type OpenItemsReport } from './open-items';
import type { RevenueReport } from './revenue-report';
import { COPY_NOTICE, tr, type OutputLanguage } from './output-i18n';

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
	sheet.getCell(`A${row + 1}`).value = `Liefer-/Leistungsdatum: ${formatDeliveryDateDe(invoice.deliveryDate)}`;
	if (invoice.dueDate) {
		sheet.getCell(`A${row + 2}`).value = `Fällig am: ${invoice.dueDate}`;
		row += 1;
	}
	if (invoice.paid) {
		sheet.getCell(`A${row + 2}`).value = `Ausgeglichen am: ${(invoice.paidAt ?? '').slice(0, 10)}`;
		row += 1;
	} else if (invoice.skontoPercent > 0) {
		const skonto = calcSkonto(
			totals.grossTotal,
			invoice.skontoPercent,
			invoice.skontoDueDate ?? undefined,
			invoice.dueDate ?? undefined,
		);
		sheet.getCell(`A${row + 2}`).value =
			`Skonto ${skonto.percent} % bis ${formatDeliveryDateDe(skonto.dueDate ?? '')}: ` +
			`${skonto.amount.toFixed(2)} EUR Rabatt, Zahlbetrag ${skonto.payableNow.toFixed(2)} EUR`;
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
 * @param language - Language of the sheet name, the notice and the column headers.
 */
export async function renderInvoiceListWorkbook(
	invoices: StoredInvoice[],
	title: string,
	language: OutputLanguage = 'en',
): Promise<Buffer> {
	const book = new ExcelJS.Workbook();
	book.creator = 'ioBroker.e-invoices';
	book.created = new Date();
	const sheet = book.addWorksheet(tr(language, 'Overview'));
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
	sheet.getCell('A2').value = tr(language, COPY_NOTICE);
	sheet.getCell('A2').font = { italic: true, color: { argb: 'FFB91C1C' } };

	headRow(
		sheet,
		4,
		['Number', 'Invoice date', 'Buyer', 'Net', 'VAT', 'Gross', 'State'].map(label => tr(language, label)),
	);
	invoices.forEach((invoice, index) => {
		const r = sheet.getRow(5 + index);
		r.getCell(1).value = safeCellText(invoice.number ?? tr(language, '(draft)'));
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

/**
 * Renders the open items (R6.2) as an xlsx workbook: the item list, then one
 * row per age bucket and the totals. The sums are the ones `evaluateOpenItems`
 * computed — the sheet does not add anything up on its own.
 *
 * @param report - Result of `evaluateOpenItems`.
 * @param language - Language of the sheet name, the titles and the column headers.
 */
export async function renderOpenItemsWorkbook(
	report: OpenItemsReport,
	language: OutputLanguage = 'en',
): Promise<Buffer> {
	const book = new ExcelJS.Workbook();
	book.creator = 'ioBroker.e-invoices';
	book.created = new Date();
	const sheet = book.addWorksheet(tr(language, 'Open items'));
	sheet.columns = [
		{ width: 16 },
		{ width: 30 },
		{ width: 14 },
		{ width: 14 },
		{ width: 14 },
		{ width: 12 },
		{ width: 26 },
		{ width: 18 },
		{ width: 10 },
		{ width: 10 },
	];
	sheet.getCell('A1').value = safeCellText(
		`${tr(language, 'Open items as of {date}', { date: report.asOf })}${
			report.onlyOverdue ? ` ${tr(language, '(overdue only)')}` : ''
		}`,
	);
	sheet.getCell('A1').font = { bold: true, size: 14 };
	sheet.getCell('A2').value = tr(language, COPY_NOTICE);
	sheet.getCell('A2').font = { italic: true, color: { argb: 'FFB91C1C' } };

	headRow(
		sheet,
		4,
		[
			'Invoice number',
			'Customer',
			'Customer number',
			'Invoice date',
			'Due on',
			'Days overdue',
			'Age',
			'Open amount',
			'Cash discount %',
			'Dunning level',
		].map(label => tr(language, label)),
	);
	report.items.forEach((item, index) => {
		const r = sheet.getRow(5 + index);
		r.getCell(1).value = safeCellText(item.number);
		r.getCell(2).value = safeCellText(item.customer);
		r.getCell(3).value = safeCellText(item.customerNumber);
		r.getCell(4).value = item.issueDate;
		r.getCell(5).value = item.dueDate;
		r.getCell(6).value = item.overdueDays;
		r.getCell(7).value = tr(language, AGE_BUCKET_LABELS[item.bucket]);
		r.getCell(8).value = item.amount;
		r.getCell(8).numFmt = '#,##0.00 "EUR"';
		r.getCell(9).value = item.skontoPercent;
		r.getCell(10).value = item.reminderLevel;
		r.commit();
	});

	let row = 5 + report.items.length + 1;
	const total = tr(language, 'Total');
	headRow(sheet, row, [total, tr(language, 'Age'), tr(language, 'Count'), '', '', '', '', tr(language, 'Amount')]);
	row += 1;
	const sums: [string, { count: number; amount: number }][] = [
		...AGE_BUCKETS.map((bucket): [string, { count: number; amount: number }] => [
			tr(language, AGE_BUCKET_LABELS[bucket]),
			report.buckets[bucket],
		]),
		[tr(language, 'all'), report.total],
		[tr(language, 'of which overdue'), report.overdue],
	];
	for (const [label, sub] of sums) {
		const r = sheet.getRow(row);
		r.getCell(1).value = total;
		r.getCell(2).value = label;
		r.getCell(3).value = sub.count;
		r.getCell(8).value = sub.amount;
		r.getCell(8).numFmt = '#,##0.00 "EUR"';
		r.getCell(1).font = { bold: true };
		r.commit();
		row += 1;
	}

	const buffer = await book.xlsx.writeBuffer();
	return Buffer.from(buffer);
}

/**
 * Revenue per company as an Excel workbook (R6.3).
 *
 * @param report - Result of `evaluateRevenueByCompany`.
 * @param language - Language of the sheet name, the title and the column headers.
 */
export async function renderRevenueWorkbook(report: RevenueReport, language: OutputLanguage = 'en'): Promise<Buffer> {
	const book = new ExcelJS.Workbook();
	book.creator = 'ioBroker.e-invoices';
	book.created = new Date();
	const title = tr(language, 'Revenue by company');
	const sheet = book.addWorksheet(title);
	sheet.columns = [{ width: 36 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
	sheet.getCell('A1').value = `${title}${report.year === null ? '' : ` ${report.year}`}`;
	sheet.getCell('A1').font = { bold: true, size: 14 };
	sheet.getCell('A2').value = tr(language, COPY_NOTICE);
	sheet.getCell('A2').font = { italic: true, color: { argb: 'FFB91C1C' } };
	headRow(
		sheet,
		4,
		['Company', 'Number of invoices', 'Net', 'VAT', 'Gross'].map(label => tr(language, label)),
	);
	const put = (rowNumber: number, label: string, count: number, net: number, tax: number, gross: number): void => {
		const r = sheet.getRow(rowNumber);
		r.getCell(1).value = safeCellText(label);
		r.getCell(2).value = count;
		for (const [column, value] of [
			[3, net],
			[4, tax],
			[5, gross],
		] as const) {
			r.getCell(column).value = value;
			r.getCell(column).numFmt = '#,##0.00 "EUR"';
		}
		r.commit();
	};
	report.rows.forEach((row, index) =>
		put(
			5 + index,
			row.companyId == null ? tr(language, 'without company assignment') : row.company,
			row.count,
			row.net,
			row.tax,
			row.gross,
		),
	);
	const totalRow = 5 + report.rows.length;
	put(totalRow, tr(language, 'Total'), report.total.count, report.total.net, report.total.tax, report.total.gross);
	sheet.getRow(totalRow).font = { bold: true };
	const buffer = await book.xlsx.writeBuffer();
	return Buffer.from(buffer);
}
