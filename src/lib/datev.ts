/**
 * DATEV export of the outgoing invoices: a "Buchungsstapel" in the DATEV format (EXTF, format 700, category 21,
 * version 13) that a tax advisor imports into DATEV Rechnungswesen.
 *
 * Every user has an advisor of their own, so the numbers that tie the file to the advisor's books — advisor and
 * client number, chart of accounts, account length, start of the fiscal year and the accounts — come from the
 * instance settings. Without advisor and client number there is no DATEV file at all (never half a one); the
 * route answers with what is missing.
 *
 * One booking line per invoice and VAT rate: the gross amount of that rate, debited to the debtor account and
 * credited to the revenue account of the rate (an "Automatikkonto", which takes the VAT out by itself, so no
 * BU key is written). A credit note is booked the other way round (Haben). A cancelled invoice and its Storno
 * are both exported: they cancel each other out in the books, as they do on paper.
 *
 * Not verified against a real DATEV import (no access to DATEV): the layout follows the published format
 * description, and the first import should be checked by the advisor.
 */
import type { StoredInvoice } from './db';
import { isCreditNoteTitle, isQuote } from './invoice-model';

/** Chart of accounts. */
export type DatevChart = 'SKR03' | 'SKR04';

/** DATEV settings of the instance. */
export interface DatevConfig {
	/** Advisor number (Beraternummer), 1001–9999999. */
	consultant?: string;
	/** Client number (Mandantennummer), 1–99999. */
	client?: string;
	/** Chart of accounts, SKR03 by default. */
	chart?: string;
	/** Length of the general ledger accounts (Sachkontenlänge), 4 by default. */
	accountLength?: number;
	/** First month of the fiscal year, 1 (January) by default. */
	fiscalYearStartMonth?: number;
	/** Debtor account all invoices are booked to (Sammeldebitor); empty = 1 followed by zeros. */
	debtor?: string;
	/** Revenue account for 19 % VAT; empty = default of the chart. */
	revenue19?: string;
	/** Revenue account for 7 % VAT; empty = default of the chart. */
	revenue7?: string;
	/** Revenue account for 0 % (tax-exempt) lines; empty = default of the chart. */
	revenue0?: string;
}

/** Revenue accounts of the two charts (four-digit form). */
const DEFAULT_REVENUE: Record<DatevChart, Record<number, string>> = {
	SKR03: { 19: '8400', 7: '8300', 0: '8100' },
	SKR04: { 19: '4400', 7: '4300', 0: '4100' },
};

/** The settings with every default applied. */
export interface ResolvedDatevConfig {
	/** Advisor number. */
	consultant: number;
	/** Client number. */
	client: number;
	/** Chart of accounts. */
	chart: DatevChart;
	/** Length of the general ledger accounts. */
	accountLength: number;
	/** First month of the fiscal year (1–12). */
	fiscalYearStartMonth: number;
	/** Debtor account (one digit longer than the general ledger accounts). */
	debtor: string;
	/** Revenue account by VAT rate. */
	revenue: Record<number, string>;
}

/**
 * Applies the defaults and checks the settings.
 *
 * @param config - DATEV part of the instance settings.
 * @returns The usable settings, or the list of what is missing or wrong.
 */
export function resolveDatevConfig(config: DatevConfig): { config: ResolvedDatevConfig } | { problems: string[] } {
	const problems: string[] = [];
	const consultantText = String(config.consultant ?? '').trim();
	const clientText = String(config.client ?? '').trim();
	const consultant = Number(consultantText);
	const client = Number(clientText);
	if (!/^\d+$/.test(consultantText) || consultant < 1001 || consultant > 9999999) {
		problems.push('advisor number (Beraternummer, 1001–9999999)');
	}
	if (!/^\d+$/.test(clientText) || client < 1 || client > 99999) {
		problems.push('client number (Mandantennummer, 1–99999)');
	}
	const chartText = String(config.chart ?? '').trim() || 'SKR03';
	const chart: DatevChart | undefined = chartText === 'SKR03' || chartText === 'SKR04' ? chartText : undefined;
	if (!chart) {
		problems.push('chart of accounts (SKR03 or SKR04)');
	}
	const accountLength = Number(config.accountLength ?? 4) || 4;
	if (!Number.isInteger(accountLength) || accountLength < 4 || accountLength > 8) {
		problems.push('account length (4–8)');
	}
	const fiscalYearStartMonth = Number(config.fiscalYearStartMonth ?? 1) || 1;
	if (!Number.isInteger(fiscalYearStartMonth) || fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12) {
		problems.push('first month of the fiscal year (1–12)');
	}
	const pad = (account: string): string => account.padEnd(accountLength, '0');
	const account = (value: string | undefined, fallback: string, length: number, label: string): string => {
		const text = String(value ?? '').trim() || fallback;
		if (!/^\d+$/.test(text) || text.length !== length) {
			problems.push(`${label} (${length} digits)`);
		}
		return text;
	};
	const defaults = DEFAULT_REVENUE[chart ?? 'SKR03'];
	const revenue: Record<number, string> = {
		19: account(config.revenue19, pad(defaults[19]), accountLength, 'revenue account 19 %'),
		7: account(config.revenue7, pad(defaults[7]), accountLength, 'revenue account 7 %'),
		0: account(config.revenue0, pad(defaults[0]), accountLength, 'revenue account 0 %'),
	};
	const debtor = account(config.debtor, '1'.padEnd(accountLength + 1, '0'), accountLength + 1, 'debtor account');
	if (problems.length > 0 || !chart) {
		return { problems };
	}
	return { config: { consultant, client, chart, accountLength, fiscalYearStartMonth, debtor, revenue } };
}

/**
 * A string field: in quotes, inner quotes doubled, no line breaks, at most `max` characters.
 *
 * @param value - Text of the field.
 * @param max - Longest length DATEV takes for the field.
 */
function text(value: string, max: number): string {
	const clean = value
		.replace(/[\r\n;]+/g, ' ')
		.trim()
		.slice(0, max);
	return `"${clean.replace(/"/g, '""')}"`;
}

/**
 * Amount with a decimal comma and two decimals, always positive.
 *
 * @param value - Amount in EUR.
 */
function amount(value: number): string {
	return Math.abs(value).toFixed(2).replace('.', ',');
}

/**
 * `YYYYMMDD` of an ISO date.
 *
 * @param iso - ISO date.
 */
function compact(iso: string): string {
	return iso.replace(/-/g, '');
}

/**
 * Belegfeld 1 takes letters, digits and `$ & % * + - /` only (at most 36): anything else in a custom number
 * format becomes a hyphen.
 *
 * @param number - Document number.
 */
export function datevDocumentField(number: string): string {
	return number
		.toUpperCase()
		.replace(/[^A-Z0-9$&%*+\-/]/g, '-')
		.slice(0, 36);
}

/**
 * First day of the fiscal year a date belongs to.
 *
 * @param iso - ISO date.
 * @param startMonth - First month of the fiscal year.
 */
function fiscalYearStart(iso: string, startMonth: number): string {
	const year = Number(iso.slice(0, 4));
	const month = Number(iso.slice(5, 7));
	const startYear = month >= startMonth ? year : year - 1;
	return `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
}

/** Column names of the booking lines (the first 14 of the format; the rest stays empty and is left out). */
export const DATEV_COLUMNS = [
	'Umsatz (ohne Soll/Haben-Kz)',
	'Soll/Haben-Kennzeichen',
	'WKZ Umsatz',
	'Kurs',
	'Basis-Umsatz',
	'WKZ Basis-Umsatz',
	'Konto',
	'Gegenkonto (ohne BU-Schlüssel)',
	'BU-Schlüssel',
	'Belegdatum',
	'Belegfeld 1',
	'Belegfeld 2',
	'Skonto',
	'Buchungstext',
];

/**
 * Renders the Buchungsstapel.
 *
 * @param invoices - Issued (and cancelled) invoices to export; drafts and offers are skipped.
 * @param config - Checked DATEV settings.
 * @param now - Moment of the export (header "erzeugt am").
 * @returns The file content (to be encoded as Windows-1252).
 * @throws {Error} When there is nothing to export or the invoices span more than one fiscal year.
 */
export function renderDatevExport(
	invoices: StoredInvoice[],
	config: ResolvedDatevConfig,
	now: Date = new Date(),
): string {
	const bookable = invoices.filter(
		invoice => !isQuote(invoice.docType) && invoice.status !== 'draft' && invoice.number,
	);
	if (bookable.length === 0) {
		throw new Error('No issued invoices in the chosen period — nothing to export to DATEV');
	}
	const dates = bookable.map(invoice => invoice.issueDate).sort();
	const fiscalYears = new Set(dates.map(date => fiscalYearStart(date, config.fiscalYearStartMonth)));
	if (fiscalYears.size > 1) {
		throw new Error(
			`The invoices span ${fiscalYears.size} fiscal years (${[...fiscalYears].map(d => d.slice(0, 4)).join(', ')}); DATEV takes one fiscal year per file — narrow the period`,
		);
	}
	const two = (value: number): string => String(value).padStart(2, '0');
	const created =
		`${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}` +
		`${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}000`;
	const header = [
		'"EXTF"',
		'700',
		'21',
		'"Buchungsstapel"',
		'13',
		created,
		'',
		'"RE"',
		'""',
		'""',
		String(config.consultant),
		String(config.client),
		compact([...fiscalYears][0]),
		String(config.accountLength),
		compact(dates[0]),
		compact(dates[dates.length - 1]),
		'"Rechnungsausgang"',
		'""',
		'1',
		'0',
		'0',
		'"EUR"',
		'',
		'""',
		'',
		'',
		`"${config.chart.slice(3)}"`,
		'',
		'',
		'""',
		'""',
	].join(';');
	const lines = [header, DATEV_COLUMNS.join(';')];
	for (const invoice of bookable) {
		const credit = isCreditNoteTitle(invoice.documentTitle);
		const day = `${invoice.issueDate.slice(8, 10)}${invoice.issueDate.slice(5, 7)}`;
		const label = `${invoice.documentTitle} ${invoice.number ?? ''} ${invoice.buyer.name}`;
		for (const entry of invoice.totals.breakdown) {
			const gross = entry.gross ?? entry.net + entry.tax;
			if (gross === 0) {
				continue;
			}
			const revenue = config.revenue[entry.vatRate] ?? config.revenue[19];
			lines.push(
				[
					amount(gross),
					// an invoice debits the debtor, a credit note credits it
					credit ? '"H"' : '"S"',
					'"EUR"',
					'',
					'',
					'""',
					config.debtor,
					revenue,
					'""',
					day,
					text(datevDocumentField(invoice.number ?? ''), 36),
					'""',
					'',
					text(label, 60),
				].join(';'),
			);
		}
	}
	return `${lines.join('\r\n')}\r\n`;
}

/** Characters of Windows-1252 that lie outside Latin-1. */
const CP1252: Record<string, number> = {
	'€': 0x80,
	'‚': 0x82,
	'„': 0x84,
	'…': 0x85,
	'‘': 0x91,
	'’': 0x92,
	'“': 0x93,
	'”': 0x94,
	'–': 0x96,
	'—': 0x97,
};

/**
 * Encodes text as Windows-1252, the character set DATEV reads; what it cannot hold becomes `?`.
 *
 * @param value - Text to encode.
 */
export function toWindows1252(value: string): Buffer {
	const bytes: number[] = [];
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0x3f;
		if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) {
			bytes.push(code);
		} else {
			bytes.push(CP1252[char] ?? 0x3f);
		}
	}
	return Buffer.from(bytes);
}
