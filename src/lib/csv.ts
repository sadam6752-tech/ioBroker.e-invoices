/**
 * DATEV/CSV export for ioBroker.e-invoices.
 *
 * Accounting departments in Germany rarely import a spreadsheet, they import
 * a flat list of booking-relevant fields. This module produces both a
 * semicolon-separated CSV (German Excel default) and the classic DATEV
 * "ExtKZ" head data, so the export can be fed into a ledger directly.
 *
 * Both formats are convenience copies only, never tax documents: the
 * ZUGFeRD hybrid PDF with its embedded XML stays the leading artefact.
 */
import type { StoredInvoice } from './db';

/** Notice printed as the first comment line of every CSV export. */
export const CSV_COPY_NOTICE = 'KOPIE – kein Steuerdokument. Maßgeblich ist das eingebettete XML der ZUGFeRD-Rechnung.';

/** UTF-8 byte order mark, so Excel detects the encoding without a dialog. */
const UTF8_BOM = String.fromCharCode(0xfeff);

/** One booking row as the accounting department sees it. */
export interface CsvRow {
	/** Invoice number. */
	number: string;
	/** ISO issue date. */
	issueDate: string;
	/** Document title, Rechnung or Gutschrift. */
	documentTitle: string;
	/** Lifecycle status. */
	status: string;
	/** ISO due date, empty when none. */
	dueDate: string;
	/** ISO date the invoice was handed to the customer, empty when unsent. */
	sentAt: string;
	/** ISO payment date, empty while unpaid. */
	paidAt: string;
	/** ISO creation timestamp. */
	createdAt: string;
	/** Customer number (BT-10). */
	customerNumber: string;
	/** Customer name. */
	customerName: string;
	/** Customer city. */
	customerCity: string;
	/** Seller VAT id. */
	vatId: string;
	/** Net total in EUR. */
	net: number;
	/** Tax total in EUR. */
	tax: number;
	/** Gross total in EUR. */
	gross: number;
	/** Cash discount in percent, 0 when none. */
	skontoPercent: number;
	/** Retention deadline (§ 147 AO). */
	retainUntil: string;
	/** Path of the hybrid PDF, the leading document. */
	pdfPath: string;
}

/**
 * Escapes one CSV field.
 *
 * A leading =, +, - or @ would be evaluated as a formula by Excel, so those
 * values get a leading apostrophe. Customer data is attacker-controlled in
 * principle (it comes from a web form).
 *
 * @param value - Field content.
 * @returns Safe, quoted field.
 */
/**
 * Escapes one CSV field.
 *
 * A leading =, +, - or @ would be evaluated as a formula by Excel, so those
 * values get a leading apostrophe. Customer data is attacker-controlled in
 * principle (it comes from a web form).
 *
 * @param value - Field content.
 * @returns Safe, quoted field.
 */
function csvField(value: string | number | null | undefined): string {
	let text = value === null || value === undefined ? '' : String(value);
	if (/^[=+\-@\t\r]/.test(text)) {
		text = `'${text}`;
	}
	return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * German number format for a CSV field.
 *
 * @param value - Number in EUR.
 * @returns Value with a German decimal comma.
 */
function de(value: number): string {
	return (Number(value) || 0).toFixed(2).replace('.', ',');
}

/**
 * Flattens an invoice into the booking row.
 *
 * @param invoice - Stored invoice.
 * @returns One CSV row.
 */
export function toCsvRow(invoice: StoredInvoice): CsvRow {
	return {
		number: invoice.number ?? '',
		issueDate: invoice.issueDate,
		documentTitle: invoice.documentTitle,
		status: invoice.status,
		dueDate: invoice.dueDate ?? '',
		sentAt: invoice.sentAt ? invoice.sentAt.slice(0, 10) : '',
		paidAt: invoice.paidAt ? invoice.paidAt.slice(0, 10) : '',
		createdAt: invoice.createdAt,
		customerNumber: invoice.buyer.customerNumber ?? '',
		customerName: invoice.buyer.name,
		customerCity: invoice.buyer.city,
		vatId: invoice.seller.vatId ?? invoice.seller.taxNumber ?? '',
		net: invoice.totals.netTotal,
		tax: invoice.totals.taxTotal,
		gross: invoice.totals.grossTotal,
		skontoPercent: Number(invoice.skontoPercent) || 0,
		retainUntil: invoice.retainUntil ?? '',
		pdfPath: invoice.pdfPath ?? '',
	};
}

const HEADERS: [keyof CsvRow, string][] = [
	['number', 'Rechnungsnummer'],
	['issueDate', 'Rechnungsdatum'],
	['documentTitle', 'Belegart'],
	['status', 'Status'],
	['dueDate', 'Faelligkeit'],
	['sentAt', 'Versendet am'],
	['paidAt', 'Bezahlt am'],
	['createdAt', 'Erstellt am'],
	['customerNumber', 'Kundennummer'],
	['customerName', 'Kunde'],
	['customerCity', 'Ort'],
	['vatId', 'USt-IdNr'],
	['net', 'Netto EUR'],
	['tax', 'USt EUR'],
	['gross', 'Brutto EUR'],
	['skontoPercent', 'Skonto Prozent'],
	['retainUntil', 'Aufbewahren bis'],
	['pdfPath', 'PDF-Datei'],
];

/**
 * Renders the invoice list as a semicolon-separated CSV file.
 *
 * Semicolon and a UTF-8 BOM are used because that is what a German Excel
 * opens as a spreadsheet by double click.
 *
 * @param invoices - Invoices to export.
 * @returns CSV text including the BOM.
 */
export function renderInvoiceListCsv(invoices: StoredInvoice[]): string {
	const lines: string[] = [];
	// A leading comment line keeps the "this is not a tax document" notice
	// visible in the file itself, not only in the documentation.
	lines.push(csvField(CSV_COPY_NOTICE));
	lines.push(HEADERS.map(([, label]) => csvField(label)).join(';'));
	for (const invoice of invoices) {
		const row = toCsvRow(invoice);
		lines.push(
			HEADERS.map(([key]) => {
				const value = row[key];
				return csvField(typeof value === 'number' ? de(value) : value);
			}).join(';'),
		);
	}
	// CRLF keeps Excel and the ledger importer happy across platforms.
	// The BOM makes a German Excel open the semicolon list as a spreadsheet.
	return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}

/**
 * Renders the classic DATEV EXTF header ("Kopfinformationen"). The ledger
 * import expects these eleven fields in this exact order.
 *
 * @param sellerName - Name of the issuing company.
 * @param taxNumber - Tax number of the issuing company.
 * @returns The EXTF header line without a trailing newline.
 */
export function renderDatevHead(sellerName: string, taxNumber: string): string {
	const year = new Date().getFullYear();
	const parts = [
		'EXTF',
		'510', // Mandant
		sellerName,
		'1', // Konto (Ertrag)
		'EUR',
		'G',
		'', // Güterbereich
		'',
		'',
		'',
		year.toString(),
	];
	void taxNumber;
	return parts.join(';');
}

/**
 * Renders one DATEV booking line per invoice ("Buchungssatz").
 *
 * @param invoices - Invoices to export.
 * @returns The lines joined by newline.
 */
export function renderDatevRows(invoices: StoredInvoice[]): string {
	const lines: string[] = [];
	for (const invoice of invoices) {
		// Credit note: a Storno must be booked as a negative amount.
		const isCredit = invoice.documentTitle.toLowerCase().includes('gutschrift');
		const sign = isCredit ? '-' : '';
		const rows = toCsvRow(invoice);
		lines.push(
			[
				'U',
				invoice.number,
				rows.issueDate,
				rows.issueDate,
				invoice.employeeCode ?? '00',
				'1026',
				`${sign}${de(invoice.totals.grossTotal)}`,
				'H',
				invoice.documentTitle,
				rows.customerNumber,
				'',
				rows.customerName.slice(0, 30),
				'',
				'',
				'',
				`${sign}${de(invoice.totals.taxTotal)}`,
				'0',
				'',
				'',
			].join(';'),
		);
	}
	return lines.join('\n');
}
