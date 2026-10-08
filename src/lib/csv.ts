/**
 * CSV export for ioBroker.e-invoices: a semicolon-separated list of the booking-relevant fields (German Excel
 * default). The DATEV Buchungsstapel lives in `datev.ts`.
 *
 * The lists are convenience copies only, never tax documents: the ZUGFeRD hybrid PDF with its embedded XML stays
 * the leading artefact.
 */
import type { StoredInvoice } from './db';
import { AGE_BUCKET_LABELS, AGE_BUCKETS, type OpenItemsReport } from './open-items';
import type { DunningSuggestion } from './dunning';
import type { RevenueReport } from './revenue-report';

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
 * Renders the open items (R6.2) as a semicolon-separated CSV.
 *
 * The rows come from `evaluateOpenItems`, the same calculation as the JSON view
 * and the Excel list, followed by one line per age bucket and the total — so the
 * three formats show the same sums by construction.
 *
 * @param report - Result of `evaluateOpenItems`.
 * @returns CSV text including the BOM.
 */
export function renderOpenItemsCsv(report: OpenItemsReport): string {
	const lines: string[] = [];
	lines.push(csvField(CSV_COPY_NOTICE));
	lines.push(csvField(`Offene Posten zum ${report.asOf}${report.onlyOverdue ? ' (nur überfällige)' : ''}`));
	lines.push(
		[
			'Rechnungsnummer',
			'Kunde',
			'Kundennummer',
			'Rechnungsdatum',
			'Faellig am',
			'Tage ueberfaellig',
			'Alterung',
			'Offener Betrag EUR',
			'Skonto Prozent',
			'Mahnstufe',
		]
			.map(csvField)
			.join(';'),
	);
	for (const item of report.items) {
		lines.push(
			[
				item.number,
				item.customer,
				item.customerNumber,
				item.issueDate,
				item.dueDate,
				String(item.overdueDays),
				AGE_BUCKET_LABELS[item.bucket],
				de(item.amount),
				de(item.skontoPercent),
				String(item.reminderLevel),
			]
				.map(csvField)
				.join(';'),
		);
	}
	lines.push('');
	for (const bucket of AGE_BUCKETS) {
		const sub = report.buckets[bucket];
		lines.push(['Summe', AGE_BUCKET_LABELS[bucket], String(sub.count), de(sub.amount)].map(csvField).join(';'));
	}
	lines.push(['Summe', 'gesamt', String(report.total.count), de(report.total.amount)].map(csvField).join(';'));
	lines.push(
		['Summe', 'davon überfällig', String(report.overdue.count), de(report.overdue.amount)].map(csvField).join(';'),
	);
	return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}

/**
 * Revenue per company as a semicolon CSV (R6.3).
 *
 * @param report - Result of `evaluateRevenueByCompany`.
 * @returns CSV text including the BOM.
 */
export function renderRevenueCsv(report: RevenueReport): string {
	const lines: string[] = [];
	lines.push(csvField(CSV_COPY_NOTICE));
	lines.push(csvField(`Umsatz je Firma${report.year === null ? '' : ` ${report.year}`}`));
	lines.push(['Firma', 'Anzahl Rechnungen', 'Netto EUR', 'USt EUR', 'Brutto EUR'].map(csvField).join(';'));
	for (const row of report.rows) {
		lines.push([row.company, String(row.count), de(row.net), de(row.tax), de(row.gross)].map(csvField).join(';'));
	}
	const total = report.total;
	lines.push(['Summe', String(total.count), de(total.net), de(total.tax), de(total.gross)].map(csvField).join(';'));
	return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}

/**
 * The dunning suggestions as a semicolon CSV (R6.4).
 *
 * @param suggestions - Result of `buildDunningSuggestions`.
 * @param today - ISO reference day.
 * @returns CSV text including the BOM.
 */
export function renderDunningCsv(suggestions: DunningSuggestion[], today: string): string {
	const lines: string[] = [];
	lines.push(csvField(CSV_COPY_NOTICE));
	lines.push(csvField(`Mahnvorschläge zum ${today}`));
	lines.push(
		[
			'Rechnungsnummer',
			'Kunde',
			'E-Mail',
			'Stufe',
			'Tage ueberfaellig',
			'Faellig am',
			'Zahlungsziel',
			'Offener Betrag EUR',
		]
			.map(csvField)
			.join(';'),
	);
	let sum = 0;
	for (const item of suggestions) {
		sum += item.amount;
		lines.push(
			[
				item.number,
				item.customer,
				item.email,
				String(item.level),
				String(item.overdueDays),
				item.dueDate,
				item.deadline,
				de(item.amount),
			]
				.map(csvField)
				.join(';'),
		);
	}
	lines.push('');
	lines.push(['Summe', String(suggestions.length), de(Math.round(sum * 100) / 100)].map(csvField).join(';'));
	return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}
