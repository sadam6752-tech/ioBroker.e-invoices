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
import { COPY_NOTICE, formatOutputDate, tr, type OutputLanguage } from './output-i18n';

/** Notice printed as the first comment line of every CSV export (translated with `tr`). */
export const CSV_COPY_NOTICE = COPY_NOTICE;

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
	['number', 'Invoice number'],
	['issueDate', 'Invoice date'],
	['documentTitle', 'Document type'],
	['status', 'State'],
	['dueDate', 'Due date'],
	['sentAt', 'Sent on'],
	['paidAt', 'Paid on'],
	['createdAt', 'Created on'],
	['customerNumber', 'Customer number'],
	['customerName', 'Customer'],
	['customerCity', 'City'],
	['vatId', 'VAT ID'],
	['net', 'Net EUR'],
	['tax', 'VAT EUR'],
	['gross', 'Gross EUR'],
	['skontoPercent', 'Cash discount percent'],
	['retainUntil', 'Keep until'],
	['pdfPath', 'PDF file'],
];

/**
 * Renders the invoice list as a semicolon-separated CSV file.
 *
 * Semicolon and a UTF-8 BOM are used because that is what a German Excel
 * opens as a spreadsheet by double click.
 *
 * @param invoices - Invoices to export.
 * @param language - Language of the notice and the column headers.
 * @returns CSV text including the BOM.
 */
export function renderInvoiceListCsv(invoices: StoredInvoice[], language: OutputLanguage = 'en'): string {
	const lines: string[] = [];
	// A leading comment line keeps the "this is not a tax document" notice
	// visible in the file itself, not only in the documentation.
	lines.push(csvField(tr(language, CSV_COPY_NOTICE)));
	lines.push(HEADERS.map(([, label]) => csvField(tr(language, label))).join(';'));
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
 * @param language - Language of the titles and the column headers.
 * @returns CSV text including the BOM.
 */
export function renderOpenItemsCsv(report: OpenItemsReport, language: OutputLanguage = 'en'): string {
	const lines: string[] = [];
	lines.push(csvField(tr(language, CSV_COPY_NOTICE)));
	lines.push(
		csvField(
			`${tr(language, 'Open items as of {date}', { date: formatOutputDate(report.asOf, language) })}${
				report.onlyOverdue ? ` ${tr(language, '(overdue only)')}` : ''
			}`,
		),
	);
	lines.push(
		[
			'Invoice number',
			'Customer',
			'Customer number',
			'Invoice date',
			'Due on',
			'Days overdue',
			'Age',
			'Open amount EUR',
			'Cash discount percent',
			'Dunning level',
		]
			.map(label => csvField(tr(language, label)))
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
				tr(language, AGE_BUCKET_LABELS[item.bucket]),
				de(item.amount),
				de(item.skontoPercent),
				String(item.reminderLevel),
			]
				.map(csvField)
				.join(';'),
		);
	}
	lines.push('');
	const total = tr(language, 'Total');
	for (const bucket of AGE_BUCKETS) {
		const sub = report.buckets[bucket];
		lines.push(
			[total, tr(language, AGE_BUCKET_LABELS[bucket]), String(sub.count), de(sub.amount)].map(csvField).join(';'),
		);
	}
	lines.push(
		[total, tr(language, 'all'), String(report.total.count), de(report.total.amount)].map(csvField).join(';'),
	);
	lines.push(
		[total, tr(language, 'of which overdue'), String(report.overdue.count), de(report.overdue.amount)]
			.map(csvField)
			.join(';'),
	);
	return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}

/**
 * Renders the revenue per company (R6.3) as a semicolon-separated CSV.
 *
 * @param report - Result of `evaluateRevenueByCompany`.
 * @param language - Language of the title and the column headers.
 * @returns CSV text including the BOM.
 */
export function renderRevenueCsv(report: RevenueReport, language: OutputLanguage = 'en'): string {
	const lines: string[] = [];
	lines.push(csvField(tr(language, CSV_COPY_NOTICE)));
	lines.push(csvField(`${tr(language, 'Revenue by company')}${report.year === null ? '' : ` ${report.year}`}`));
	lines.push(
		['Company', 'Number of invoices', 'Net EUR', 'VAT EUR', 'Gross EUR']
			.map(label => csvField(tr(language, label)))
			.join(';'),
	);
	for (const row of report.rows) {
		const company = row.companyId == null ? tr(language, 'without company assignment') : row.company;
		lines.push([company, String(row.count), de(row.net), de(row.tax), de(row.gross)].map(csvField).join(';'));
	}
	const total = report.total;
	lines.push(
		[tr(language, 'Total'), String(total.count), de(total.net), de(total.tax), de(total.gross)]
			.map(csvField)
			.join(';'),
	);
	return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}

/**
 * Renders the dunning suggestions (R6.4) as a semicolon-separated CSV.
 *
 * @param suggestions - Result of `buildDunningSuggestions`.
 * @param today - ISO reference day.
 * @param language - Language of the title and the column headers.
 * @returns CSV text including the BOM.
 */
export function renderDunningCsv(
	suggestions: DunningSuggestion[],
	today: string,
	language: OutputLanguage = 'en',
): string {
	const lines: string[] = [];
	lines.push(csvField(tr(language, CSV_COPY_NOTICE)));
	lines.push(csvField(tr(language, 'Dunning suggestions as of {date}', { date: formatOutputDate(today, language) })));
	lines.push(
		[
			'Invoice number',
			'Customer',
			'E-mail',
			'Level',
			'Days overdue',
			'Due on',
			'Payment deadline',
			'Open amount EUR',
		]
			.map(label => csvField(tr(language, label)))
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
	lines.push(
		[tr(language, 'Total'), String(suggestions.length), de(Math.round(sum * 100) / 100)].map(csvField).join(';'),
	);
	return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}
